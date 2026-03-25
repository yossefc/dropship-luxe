// ============================================================================
// Hyp (YaadPay) Webhook Controller - Payment Event Handler
// ============================================================================
// Ce contrôleur est le point d'entrée critique pour les notifications de paiement.
//
// Flux Dropshipping:
// 1. Client paie via Hyp -> Hyp notifie notre webhook
// 2. Vérification rigoureuse de la signature (anti-fraude)
// 3. Si CCode = '0' (succès) -> Déclencher commande AliExpress
// 4. Répondre HTTP 200 immédiatement à Hyp
//
// Événements traités:
// - payment.succeeded: Paiement validé -> Créer commande fournisseur
// - payment.failed: Paiement échoué -> Logger et notifier
// - payment.canceled: Paiement annulé -> Mettre à jour le statut
// ============================================================================

import { Request, Response, Router } from 'express';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { HypAdapter, HypWebhookPayload } from '@infrastructure/adapters/outbound/payment/hyp.adapter.js';
import { Logger, AuditLogger } from '@infrastructure/config/logger.js';

// ============================================================================
// Types
// ============================================================================

/** Job de traitement de paiement pour la queue BullMQ */
interface PaymentProcessingJob {
  eventId: string;
  eventType: string;
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  cardLast4?: string;
  authorizationCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  receivedAt: string;
}

/** Événements webhook que nous traitons */
const HANDLED_EVENT_TYPES = [
  'payment.succeeded',
  'payment.failed',
  'payment.canceled',
  'payment.requires_action',
] as const;

// ============================================================================
// Hyp Webhook Controller
// ============================================================================

export class HypWebhookController {
  private readonly hypAdapter: HypAdapter;
  private readonly prisma: PrismaClient;
  private readonly paymentQueue: Queue<PaymentProcessingJob>;
  private readonly logger: Logger;
  private readonly auditLogger?: AuditLogger;

  // Cache mémoire pour la déduplication des événements (éviter double traitement)
  private readonly processedEventsCache: Set<string> = new Set();
  private readonly CACHE_MAX_SIZE = 10000;

  constructor(
    hypAdapter: HypAdapter,
    prisma: PrismaClient,
    redisConnection: Redis,
    logger: Logger,
    auditLogger?: AuditLogger
  ) {
    this.hypAdapter = hypAdapter;
    this.prisma = prisma;
    this.logger = logger.child({ controller: 'HypWebhook' });
    this.auditLogger = auditLogger;

    // Initialiser la queue BullMQ pour traitement asynchrone
    this.paymentQueue = new Queue<PaymentProcessingJob>('hyp-payments', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000,  // 10 secondes entre les tentatives
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,  // Garder 24h
        },
        removeOnFail: {
          count: 500,
        },
      },
    });
  }

  // ============================================================================
  // Main Webhook Handler
  // ============================================================================

  /**
   * POST /webhooks/hyp
   * Point d'entrée principal pour les notifications Hyp
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    this.logger.info('Received Hyp webhook', {
      contentType: req.get('content-type'),
      bodyLength: typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length,
    });

    // =========================================================================
    // ÉTAPE 1: Répondre immédiatement avec HTTP 200
    // =========================================================================
    // Hyp attend une réponse rapide pour éviter les timeouts et les retry
    // Le traitement réel se fait en asynchrone via la queue
    res.status(200).json({ received: true, timestamp: new Date().toISOString() });

    // =========================================================================
    // ÉTAPE 2: Parser et valider le payload
    // =========================================================================
    let payload: HypWebhookPayload;

    try {
      payload = this.parseWebhookPayload(req);
    } catch (error) {
      this.logger.error('Failed to parse webhook payload', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }

    // =========================================================================
    // ÉTAPE 3: Vérifier la signature (CRITICAL - Anti-Fraude)
    // =========================================================================
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = payload.Sign ?? req.get('X-Hyp-Signature') ?? '';

    if (!this.hypAdapter.validateWebhookSignature(rawBody, signature)) {
      this.logger.error('INVALID WEBHOOK SIGNATURE - POTENTIAL FRAUD ATTEMPT', {
        orderId: payload.Order,
        transactionId: payload.Id,
        ip: req.ip,
      });

      // Alerter sur la tentative de fraude
      this.auditLogger?.logSecurityEvent({
        event: 'webhook_signature_invalid',
        severity: 'high',
        ip: req.ip,
        details: {
          orderId: payload.Order,
          transactionId: payload.Id,
          userAgent: req.get('user-agent'),
        },
      });

      return;
    }

    // =========================================================================
    // ÉTAPE 4: Déduplication (éviter double traitement)
    // =========================================================================
    const eventId = `${payload.Id}_${payload.Order}_${payload.CCode}`;

    if (this.processedEventsCache.has(eventId)) {
      this.logger.info('Duplicate webhook ignored', { eventId });
      return;
    }

    // Vérifier en base de données également
    const existingEvent = await this.prisma.webhookEvent.findFirst({
      where: {
        stripeEventId: eventId,  // Réutiliser le champ existant
      },
    });

    if (existingEvent) {
      this.logger.info('Webhook already processed (DB check)', { eventId });
      this.addToCache(eventId);
      return;
    }

    // =========================================================================
    // ÉTAPE 5: Enregistrer l'événement et mettre en queue
    // =========================================================================
    try {
      // Enregistrer l'événement pour déduplication
      await this.prisma.webhookEvent.create({
        data: {
          stripeEventId: eventId,  // Réutiliser pour compatibilité
          eventType: this.determineEventType(payload.CCode),
          status: 'processing',
          payload: payload as unknown as Record<string, unknown>,
          receivedAt: new Date(),
        },
      });

      this.addToCache(eventId);

      // Extraire les données de paiement
      const paymentData = this.hypAdapter.extractPaymentData(payload);

      // Créer le job pour traitement asynchrone
      const job: PaymentProcessingJob = {
        eventId,
        eventType: this.determineEventType(payload.CCode),
        ...paymentData,
        receivedAt: new Date().toISOString(),
      };

      await this.paymentQueue.add(job.eventType, job, {
        jobId: eventId,
      });

      const duration = Date.now() - startTime;
      this.logger.info('Webhook queued for processing', {
        eventId,
        eventType: job.eventType,
        orderId: payload.Order,
        processingTimeMs: duration,
      });

    } catch (error) {
      this.logger.error('Failed to queue webhook', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /webhooks/hyp/success
   * Page de retour après paiement réussi (redirection utilisateur)
   */
  async handleSuccessReturn(req: Request, res: Response): Promise<void> {
    const { Order, Id, CCode, ACode } = req.query;

    this.logger.info('Payment success return', {
      orderId: Order,
      transactionId: Id,
      ccode: CCode,
    });

    if (CCode === '0') {
      // Rediriger vers la page de confirmation
      res.redirect(`/checkout/confirmation?order=${Order}&status=success`);
    } else {
      // Quelque chose s'est mal passé
      res.redirect(`/checkout/confirmation?order=${Order}&status=pending`);
    }
  }

  /**
   * GET /webhooks/hyp/error
   * Page de retour après erreur de paiement
   */
  async handleErrorReturn(req: Request, res: Response): Promise<void> {
    const { Order, errMsg, CCode } = req.query;

    this.logger.info('Payment error return', {
      orderId: Order,
      errorMessage: errMsg,
      ccode: CCode,
    });

    // Rediriger vers la page d'erreur avec le message
    const errorParam = encodeURIComponent(String(errMsg ?? 'Payment failed'));
    res.redirect(`/checkout/error?order=${Order}&error=${errorParam}`);
  }

  // ============================================================================
  // Payment Processing Logic
  // ============================================================================

  /**
   * Traite un paiement réussi - DÉCLENCHE LA COMMANDE ALIEXPRESS
   * Cette méthode est appelée par le Worker BullMQ
   */
  async processSuccessfulPayment(job: PaymentProcessingJob): Promise<void> {
    const { orderId, transactionId, amount, currency, authorizationCode, cardLast4 } = job;

    this.logger.info('Processing successful payment', {
      orderId,
      transactionId,
      amount,
      currency,
    });

    try {
      // 1. Trouver la commande en base de données
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            { orderNumber: orderId },
          ],
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // 2. Vérifier que le paiement n'a pas déjà été traité
      if (order.paymentStatus === PaymentStatus.succeeded) {
        this.logger.warn('Payment already processed, skipping', { orderId });
        return;
      }

      // 3. Mettre à jour le statut de la commande
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
          paymentStatus: PaymentStatus.succeeded,
          stripePaymentIntentId: transactionId,  // Stocker l'ID transaction Hyp
          paidAt: new Date(),
          notes: `Paiement Hyp validé. Auth: ${authorizationCode}, Carte: ****${cardLast4 ?? '****'}`,
        },
      });

      // 4. Logger le paiement pour audit
      this.auditLogger?.logPayment({
        orderId: order.id,
        customerId: order.customerId,
        action: 'payment_succeeded',
        amount,
        currency,
        paymentIntentId: transactionId,
        success: true,
      });

      this.logger.info('Order marked as paid, ready for fulfillment', {
        orderId: order.id,
        itemCount: order.items.length,
      });

      // 5. DÉCLENCHER LA COMMANDE CHEZ ALIEXPRESS
      // Ajouter un job dans la queue de fulfillment
      await this.queueAliExpressOrder(order.id);

      // 6. Marquer l'événement webhook comme traité
      await this.prisma.webhookEvent.updateMany({
        where: { stripeEventId: job.eventId },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

    } catch (error) {
      this.logger.error('Failed to process successful payment', {
        orderId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Marquer l'événement comme échoué
      await this.prisma.webhookEvent.updateMany({
        where: { stripeEventId: job.eventId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Traite un paiement échoué
   */
  async processFailedPayment(job: PaymentProcessingJob): Promise<void> {
    const { orderId, transactionId, errorMessage } = job;

    this.logger.info('Processing failed payment', {
      orderId,
      transactionId,
      errorMessage,
    });

    try {
      // Mettre à jour le statut de la commande
      await this.prisma.order.updateMany({
        where: {
          OR: [
            { id: orderId },
            { orderNumber: orderId },
          ],
        },
        data: {
          paymentStatus: PaymentStatus.failed,
          notes: `Paiement échoué: ${errorMessage ?? 'Erreur inconnue'}`,
        },
      });

      // Logger pour audit
      this.auditLogger?.logPayment({
        orderId,
        customerId: 'unknown',
        action: 'payment_failed',
        amount: job.amount,
        currency: job.currency,
        paymentIntentId: transactionId,
        success: false,
        error: errorMessage,
      });

      // Marquer l'événement comme traité
      await this.prisma.webhookEvent.updateMany({
        where: { stripeEventId: job.eventId },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

    } catch (error) {
      this.logger.error('Failed to process failed payment', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // AliExpress Order Integration
  // ============================================================================

  /**
   * Ajoute un job pour créer la commande AliExpress
   * Le Worker de fulfillment traitera ce job
   */
  private async queueAliExpressOrder(orderId: string): Promise<void> {
    // Créer une queue dédiée pour le fulfillment si elle n'existe pas
    const fulfillmentQueue = new Queue('order-fulfillment', {
      connection: this.paymentQueue.opts.connection as Redis,
    });

    await fulfillmentQueue.add('create_aliexpress_order', {
      orderId,
      triggeredBy: 'hyp_webhook',
      triggeredAt: new Date().toISOString(),
    });

    this.logger.info('AliExpress order creation queued', { orderId });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Parse le payload webhook selon le format reçu
   */
  private parseWebhookPayload(req: Request): HypWebhookPayload {
    // Hyp peut envoyer en URL-encoded ou JSON
    if (typeof req.body === 'string') {
      // URL-encoded
      const params = new URLSearchParams(req.body);
      return {
        Id: params.get('Id') ?? '',
        CCode: params.get('CCode') ?? '',
        Amount: params.get('Amount') ?? '',
        ACode: params.get('ACode') ?? '',
        Order: params.get('Order') ?? '',
        Fild1: params.get('Fild1') ?? undefined,
        Fild2: params.get('Fild2') ?? undefined,
        Fild3: params.get('Fild3') ?? undefined,
        Bank: params.get('Bank') ?? undefined,
        Payments: params.get('Payments') ?? undefined,
        UserId: params.get('UserId') ?? undefined,
        Brand: params.get('Brand') ?? undefined,
        L4digit: params.get('L4digit') ?? undefined,
        Hesh: params.get('Hesh') ?? undefined,
        UID: params.get('UID') ?? undefined,
        Sign: params.get('Sign') ?? undefined,
        errMsg: params.get('errMsg') ?? undefined,
        Coin: params.get('Coin') ?? undefined,
        J: params.get('J') ?? undefined,
      };
    }

    // JSON ou objet déjà parsé
    return req.body as HypWebhookPayload;
  }

  /**
   * Détermine le type d'événement basé sur CCode
   */
  private determineEventType(ccode: string): string {
    if (ccode === '0') {
      return 'payment.succeeded';
    }

    const errorTypes: Record<string, string> = {
      '6': 'payment.canceled',
      '4': 'payment.requires_action',
    };

    return errorTypes[ccode] ?? 'payment.failed';
  }

  /**
   * Ajoute un événement au cache avec gestion LRU
   */
  private addToCache(eventId: string): void {
    if (this.processedEventsCache.size >= this.CACHE_MAX_SIZE) {
      // Supprimer le plus ancien
      const firstKey = this.processedEventsCache.values().next().value;
      if (firstKey) {
        this.processedEventsCache.delete(firstKey);
      }
    }
    this.processedEventsCache.add(eventId);
  }

  /**
   * Retourne la queue pour le Worker
   */
  getQueue(): Queue<PaymentProcessingJob> {
    return this.paymentQueue;
  }
}

// ============================================================================
// Express Router Factory
// ============================================================================

export function createHypWebhookRouter(
  hypAdapter: HypAdapter,
  prisma: PrismaClient,
  redisConnection: Redis,
  logger: Logger,
  auditLogger?: AuditLogger
): { router: Router; controller: HypWebhookController } {
  const router = Router();
  const controller = new HypWebhookController(
    hypAdapter,
    prisma,
    redisConnection,
    logger,
    auditLogger
  );

  // Webhook principal - reçoit les notifications de paiement
  // Content-Type peut être application/x-www-form-urlencoded ou application/json
  router.post('/', (req, res) => controller.handleWebhook(req, res));
  router.post('/notify', (req, res) => controller.handleWebhook(req, res));

  // URLs de retour pour l'utilisateur
  router.get('/success', (req, res) => controller.handleSuccessReturn(req, res));
  router.get('/error', (req, res) => controller.handleErrorReturn(req, res));

  return { router, controller };
}

// ============================================================================
// Exports
// ============================================================================

export { PaymentProcessingJob };
