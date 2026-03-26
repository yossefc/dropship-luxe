// ============================================================================
// Payment Processing Worker - BullMQ Job Processor
// ============================================================================
// Ce worker traite les jobs de paiement en file d'attente et orchestre:
// 1. La mise à jour du statut de commande
// 2. L'envoi d'email de confirmation (via Resend)
// 3. Le tracking server-side (via Meta CAPI)
// 4. Le déclenchement de la commande AliExpress
// ============================================================================

import { Worker, Job, Queue, ConnectionOptions } from 'bullmq';
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { logger } from '@infrastructure/config/logger.js';

// Adapters
import { ResendEmailAdapter, createResendEmailAdapter, OrderEmailData } from '@infrastructure/adapters/outbound/notifications/resend-email.adapter.js';
import { MetaCapiAdapter, createMetaCapiAdapter, PurchaseEventData } from '@infrastructure/adapters/outbound/tracking/meta-capi.adapter.js';

// ============================================================================
// Types
// ============================================================================

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

interface FulfillmentJob {
  orderId: string;
  triggeredBy: string;
  triggeredAt: string;
}

// ============================================================================
// Payment Processing Worker Class
// ============================================================================

export class PaymentProcessingWorker {
  private readonly worker: Worker<PaymentProcessingJob>;
  private readonly prisma: PrismaClient;
  private readonly emailAdapter: ResendEmailAdapter;
  private readonly metaCapiAdapter: MetaCapiAdapter;
  private readonly fulfillmentQueue: Queue<FulfillmentJob>;

  constructor(
    connectionOptions: ConnectionOptions,
    prisma: PrismaClient
  ) {
    this.prisma = prisma;
    this.emailAdapter = createResendEmailAdapter(prisma);
    this.metaCapiAdapter = createMetaCapiAdapter(prisma);

    // Queue pour le fulfillment AliExpress
    this.fulfillmentQueue = new Queue<FulfillmentJob>('order-fulfillment', {
      connection: connectionOptions,
    });

    // Worker pour traiter les paiements
    this.worker = new Worker<PaymentProcessingJob>(
      'hyp-payments',
      async (job) => this.processJob(job),
      {
        connection: connectionOptions,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );

    this.setupEventHandlers();
  }

  // ============================================================================
  // Job Processing
  // ============================================================================

  private async processJob(job: Job<PaymentProcessingJob>): Promise<void> {
    const { data } = job;

    logger.info('Processing payment job', {
      jobId: job.id,
      eventType: data.eventType,
      orderId: data.orderId,
    });

    switch (data.eventType) {
      case 'payment.succeeded':
        await this.handleSuccessfulPayment(data);
        break;
      case 'payment.failed':
        await this.handleFailedPayment(data);
        break;
      case 'payment.canceled':
        await this.handleCanceledPayment(data);
        break;
      default:
        logger.warn('Unknown payment event type', { eventType: data.eventType });
    }
  }

  // ============================================================================
  // Successful Payment Handler
  // ============================================================================

  private async handleSuccessfulPayment(job: PaymentProcessingJob): Promise<void> {
    const { orderId, transactionId, amount, currency, authorizationCode, cardLast4 } = job;

    logger.info('Processing successful payment', {
      orderId,
      transactionId,
      amount,
      currency,
    });

    try {
      // 1. Récupérer la commande complète avec customer et items
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            { orderNumber: orderId },
          ],
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  translations: {
                    where: { locale: 'fr' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // 2. Vérifier que le paiement n'a pas déjà été traité
      if (order.paymentStatus === PaymentStatus.succeeded) {
        logger.warn('Payment already processed, skipping', { orderId });
        return;
      }

      // 3. Mettre à jour le statut de la commande
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
          paymentStatus: PaymentStatus.succeeded,
          hypTransactionId: transactionId,
          paidAt: new Date(),
          notes: `Paiement Hyp validé. Auth: ${authorizationCode}, Carte: ****${cardLast4 ?? '****'}`,
        },
      });

      logger.info('Order marked as paid', { orderId: order.id });

      // 4. ENVOYER L'EMAIL DE CONFIRMATION
      await this.sendOrderConfirmationEmail(order);

      // 5. TRACKING SERVER-SIDE META CAPI
      await this.trackPurchaseEvent(order, amount, currency);

      // 6. DÉCLENCHER LA COMMANDE ALIEXPRESS
      await this.queueAliExpressOrder(order.id);

      // 7. Marquer l'événement webhook comme traité
      await this.prisma.webhookEvent.updateMany({
        where: { eventId: job.eventId },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

      logger.info('Payment processing completed successfully', {
        orderId: order.id,
        emailSent: true,
        trackingSent: true,
        fulfillmentQueued: true,
      });

    } catch (error) {
      logger.error('Failed to process successful payment', {
        orderId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Marquer l'événement comme échoué
      await this.prisma.webhookEvent.updateMany({
        where: { eventId: job.eventId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  // ============================================================================
  // Email Sending
  // ============================================================================

  private async sendOrderConfirmationEmail(order: {
    id: string;
    orderNumber: string;
    customerEmail: string;
    subtotal: { toNumber: () => number };
    shippingCost: { toNumber: () => number };
    tax: { toNumber: () => number };
    total: { toNumber: () => number };
    currency: string;
    // Shipping address fields from Prisma schema
    shippingFirstName: string;
    shippingLastName: string;
    shippingStreet: string;
    shippingCity: string;
    shippingPostalCode: string;
    shippingCountry: string;
    customer: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    };
    items: Array<{
      quantity: number;
      unitPrice: { toNumber: () => number };
      product: {
        id: string;
        images: string[];
        translations: Array<{
          name: string;
        }>;
      };
    }>;
  }): Promise<void> {
    try {
      const emailData: OrderEmailData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        locale: 'fr', // Default to French, can be extended
        items: order.items.map(item => ({
          name: item.product.translations[0]?.name ?? 'Product',
          quantity: item.quantity,
          price: `${item.unitPrice.toNumber().toFixed(2)} ${order.currency}`,
          image: item.product.images[0],
        })),
        subtotal: `${order.subtotal.toNumber().toFixed(2)} ${order.currency}`,
        shippingCost: `${order.shippingCost.toNumber().toFixed(2)} ${order.currency}`,
        tax: `${order.tax.toNumber().toFixed(2)} ${order.currency}`,
        totalAmount: `${order.total.toNumber().toFixed(2)}`,
        currency: order.currency,
        shippingAddress: {
          firstName: order.shippingFirstName,
          lastName: order.shippingLastName,
          street: order.shippingStreet,
          city: order.shippingCity,
          postalCode: order.shippingPostalCode,
          country: order.shippingCountry,
        },
      };

      const result = await this.emailAdapter.sendOrderConfirmation(emailData);

      if (result.success) {
        logger.info('Order confirmation email sent', {
          orderId: order.id,
          messageId: result.messageId,
          customerEmail: order.customerEmail,
        });
      } else {
        logger.error('Failed to send order confirmation email', {
          orderId: order.id,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Exception sending order confirmation email', {
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Ne pas throw - l'email n'est pas critique pour le flux
    }
  }

  // ============================================================================
  // Meta CAPI Tracking
  // ============================================================================

  private async trackPurchaseEvent(
    order: {
      id: string;
      orderNumber: string;
      shippingCity: string;
      shippingPostalCode: string;
      shippingCountry: string;
      customer: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
      };
      items: Array<{
        quantity: number;
        unitPrice: { toNumber: () => number };
        product: {
          id: string;
          translations: Array<{
            name: string;
          }>;
        };
      }>;
    },
    amount: number,
    currency: string
  ): Promise<void> {
    try {
      const purchaseData: PurchaseEventData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        value: amount,
        currency: currency,
        items: order.items.map(item => ({
          productId: item.product.id,
          name: item.product.translations[0]?.name ?? 'Product',
          quantity: item.quantity,
          price: item.unitPrice.toNumber(),
          category: 'Beauty & Cosmetics',
        })),
        user: {
          email: order.customer.email,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          phone: order.customer.phone ?? undefined,
          city: order.shippingCity,
          postalCode: order.shippingPostalCode,
          country: order.shippingCountry,
          externalId: order.customer.id,
        },
        eventSourceUrl: `https://www.hayoss.com/checkout/success?order=${order.orderNumber}`,
      };

      const result = await this.metaCapiAdapter.trackPurchase(purchaseData);

      if (result.success) {
        logger.info('Meta CAPI Purchase event sent', {
          orderId: order.id,
          fbTraceId: result.fbTraceId,
          eventsReceived: result.eventsReceived,
        });
      } else {
        logger.error('Failed to send Meta CAPI Purchase event', {
          orderId: order.id,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Exception sending Meta CAPI event', {
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Ne pas throw - le tracking n'est pas critique pour le flux
    }
  }

  // ============================================================================
  // AliExpress Order Queue
  // ============================================================================

  private async queueAliExpressOrder(orderId: string): Promise<void> {
    await this.fulfillmentQueue.add('create_aliexpress_order', {
      orderId,
      triggeredBy: 'payment_worker',
      triggeredAt: new Date().toISOString(),
    });

    logger.info('AliExpress order creation queued', { orderId });
  }

  // ============================================================================
  // Failed & Canceled Payment Handlers
  // ============================================================================

  private async handleFailedPayment(job: PaymentProcessingJob): Promise<void> {
    const { orderId, transactionId, errorMessage } = job;

    logger.info('Processing failed payment', {
      orderId,
      transactionId,
      errorMessage,
    });

    try {
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

      await this.prisma.webhookEvent.updateMany({
        where: { eventId: job.eventId },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

      logger.info('Failed payment processed', { orderId });

    } catch (error) {
      logger.error('Failed to process failed payment', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleCanceledPayment(job: PaymentProcessingJob): Promise<void> {
    const { orderId, transactionId } = job;

    logger.info('Processing canceled payment', {
      orderId,
      transactionId,
    });

    try {
      await this.prisma.order.updateMany({
        where: {
          OR: [
            { id: orderId },
            { orderNumber: orderId },
          ],
        },
        data: {
          status: OrderStatus.cancelled,
          paymentStatus: PaymentStatus.cancelled,
          notes: 'Paiement annulé par le client',
        },
      });

      await this.prisma.webhookEvent.updateMany({
        where: { eventId: job.eventId },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

      logger.info('Canceled payment processed', { orderId });

    } catch (error) {
      logger.error('Failed to process canceled payment', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info('Payment job completed', {
        jobId: job.id,
        eventType: job.data.eventType,
        orderId: job.data.orderId,
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('Payment job failed', {
        jobId: job?.id,
        eventType: job?.data.eventType,
        orderId: job?.data.orderId,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error', { error: error.message });
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async start(): Promise<void> {
    logger.info('Payment processing worker started');
  }

  async stop(): Promise<void> {
    await this.worker.close();
    await this.fulfillmentQueue.close();
    logger.info('Payment processing worker stopped');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPaymentProcessingWorker(
  connectionOptions: ConnectionOptions,
  prisma: PrismaClient
): PaymentProcessingWorker {
  return new PaymentProcessingWorker(connectionOptions, prisma);
}
