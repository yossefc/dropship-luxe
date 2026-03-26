// ============================================================================
// Hyp (YaadPay) Payment Adapter - Israeli Payment Gateway Integration
// ============================================================================
// Implements PaymentGateway port for Hyp/YaadPay payment processing.
//
// Features:
// - Secure signature generation (HMAC-SHA256)
// - Payment link generation (Redirect/iFrame mode)
// - Webhook signature verification
// - Refund processing
// - Multi-currency support (ILS, USD, EUR)
//
// Documentation: https://yaadpay.docs.apiary.io/
// ============================================================================

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import {
  PaymentGateway,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  RefundParams,
  RefundResult,
  CreateCustomerParams,
  WebhookEvent,
} from '@domain/ports/outbound/payment-gateway.port.js';
import { ExternalServiceError, ValidationError } from '@shared/errors/domain-error.js';
import { Logger } from '@infrastructure/config/logger.js';

// ============================================================================
// Configuration Types
// ============================================================================

export interface HypConfig {
  /** Masof (Merchant ID) - Identifiant du terminal de paiement */
  masof: string;
  /** PassP - Mot de passe du terminal */
  passP: string;
  /** API Signature Key - Clé secrète pour générer les signatures */
  apiSignatureKey: string;
  /** Mode de paiement: 'redirect' ou 'iframe' */
  paymentMode?: 'redirect' | 'iframe';
  /** URL de base de l'API Hyp */
  baseUrl?: string;
  /** URL de retour après paiement réussi */
  successUrl: string;
  /** URL de retour après erreur/annulation */
  errorUrl: string;
  /** URL du webhook pour notifications asynchrones */
  notifyUrl: string;
  /** Devise par défaut */
  defaultCurrency?: 'ILS' | 'USD' | 'EUR';
  /** Mode sandbox/test */
  sandbox?: boolean;
}

// ============================================================================
// Hyp API Types
// ============================================================================

/** Paramètres pour créer un lien de paiement */
interface HypPaymentParams {
  Masof: string;
  PassP: string;
  Amount: string;
  Currency: string;
  Order: string;
  Info: string;
  ClientName?: string;
  ClientLName?: string;
  email?: string;
  phone?: string;
  cell?: string;
  Tash?: string;      // Nombre de paiements (1 = paiement unique)
  FixTash?: string;   // Forcer le nombre de paiements
  ShowEng498498?: string;  // Afficher en anglais
  Postpone?: string;  // Paiement différé
  J5?: string;        // Type de transaction (J5=paiement standard)
  MoreData?: string;  // Données additionnelles pour le webhook
  Sign: string;
  action: string;
  UTF8?: string;
  UTF8out?: string;
  sendemail?: string;
  tmp?: string;
  PageLang?: string;
  Coin?: string;
}

/** Réponse de création de paiement */
interface HypPaymentResponse {
  Id?: string;
  CCode?: string;
  Amount?: string;
  ACode?: string;
  Fild1?: string;
  Fild2?: string;
  Fild3?: string;
  Bank?: string;
  Payments?: string;
  UserId?: string;
  Brand?: string;
  L4digit?: string;
  Hesh?: string;
  UID?: string;
  errMsg?: string;
  Err?: string;
}

/** Données du webhook Hyp */
export interface HypWebhookPayload {
  Id: string;           // ID de transaction Hyp
  CCode: string;        // Code de réponse ('0' = succès)
  Amount: string;       // Montant en agorot/centimes
  ACode: string;        // Code d'autorisation
  Order: string;        // Référence de commande (notre orderId)
  Fild1?: string;       // Champ personnalisé 1
  Fild2?: string;       // Champ personnalisé 2
  Fild3?: string;       // Champ personnalisé 3
  Bank?: string;        // Code banque
  Payments?: string;    // Nombre de paiements
  UserId?: string;      // ID utilisateur Hyp
  Brand?: string;       // Marque de carte (1=Visa, 2=MC, etc.)
  L4digit?: string;     // 4 derniers chiffres de la carte
  Hesh?: string;        // Numéro de facture
  UID?: string;         // ID unique de transaction
  Sign?: string;        // Signature de vérification
  errMsg?: string;      // Message d'erreur si CCode != '0'
  Coin?: string;        // Code devise
  J?: string;           // Type de transaction
}

// Mapping des codes de carte
const CARD_BRANDS: Record<string, string> = {
  '1': 'Visa',
  '2': 'MasterCard',
  '3': 'Diners',
  '4': 'American Express',
  '5': 'JCB',
  '6': 'Maestro',
};

// Mapping des codes devise
const CURRENCY_CODES: Record<string, string> = {
  '1': 'ILS',
  '2': 'USD',
  '3': 'EUR',
  '4': 'GBP',
};

// ============================================================================
// Hyp Payment Adapter
// ============================================================================

export class HypAdapter implements PaymentGateway {
  private readonly config: Required<HypConfig>;
  private readonly client: AxiosInstance;
  private readonly logger: Logger;

  // Cache local pour simuler la récupération des PaymentIntents
  private readonly paymentIntentCache: Map<string, {
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    metadata: Record<string, string>;
    createdAt: Date;
  }> = new Map();

  constructor(config: HypConfig, logger: Logger) {
    // Valider la configuration
    if (!config.masof || !config.passP || !config.apiSignatureKey) {
      throw new Error('HypAdapter: Missing required configuration (masof, passP, apiSignatureKey)');
    }

    this.config = {
      masof: config.masof,
      passP: config.passP,
      apiSignatureKey: config.apiSignatureKey,
      paymentMode: config.paymentMode ?? 'redirect',
      baseUrl: config.baseUrl ?? 'https://icom.yaad.net',
      successUrl: config.successUrl,
      errorUrl: config.errorUrl,
      notifyUrl: config.notifyUrl,
      defaultCurrency: config.defaultCurrency ?? 'ILS',
      sandbox: config.sandbox ?? false,
    };

    this.logger = logger.child({ adapter: 'HypAdapter' });

    // Client HTTP pour les requêtes à l'API Hyp
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.logger.info('HypAdapter initialized', {
      masof: this.config.masof,
      sandbox: this.config.sandbox,
      paymentMode: this.config.paymentMode,
    });
  }

  // ============================================================================
  // PaymentGateway Interface Implementation
  // ============================================================================

  /**
   * Crée une intention de paiement (génère un lien de paiement Hyp)
   * Retourne le lien de paiement dans clientSecret pour redirection
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    this.logger.info('Creating Hyp payment intent', {
      orderId: params.orderId,
      amount: params.amount.amount,
      currency: params.amount.currency,
    });

    try {
      // Convertir le montant en agorot/centimes (Hyp attend le montant x100)
      const amountInCents = Math.round(params.amount.amount * 100);
      const currency = this.mapCurrency(params.amount.currency);

      // Générer un ID unique pour cette intention de paiement
      const paymentIntentId = `hyp_pi_${Date.now()}_${this.generateRandomString(8)}`;

      // Préparer les données additionnelles pour le webhook
      const moreData = JSON.stringify({
        paymentIntentId,
        orderId: params.orderId,
        customerId: params.customerId,
        ...params.metadata,
      });

      // Construire les paramètres de paiement
      const paymentParams: Partial<HypPaymentParams> = {
        Masof: this.config.masof,
        PassP: this.config.passP,
        Amount: amountInCents.toString(),
        Currency: currency,
        Order: params.orderId,
        Info: `Commande ${params.orderId}`,
        email: params.customerEmail.value,
        Tash: '1',           // Paiement unique
        FixTash: 'True',     // Ne pas permettre de changer le nombre de paiements
        J5: 'True',          // Transaction standard
        UTF8: 'True',
        UTF8out: 'True',
        MoreData: moreData,
        action: 'pay',
        PageLang: 'HEB',     // Langue de la page (HEB/ENG)
        Coin: currency,
      };

      // Générer la signature
      paymentParams.Sign = this.generateSignature(paymentParams);

      // Construire l'URL de paiement
      const paymentUrl = this.buildPaymentUrl(paymentParams as HypPaymentParams);

      // Stocker en cache pour récupération ultérieure
      this.paymentIntentCache.set(paymentIntentId, {
        orderId: params.orderId,
        amount: params.amount.amount,
        currency: params.amount.currency,
        status: 'requires_payment_method',
        metadata: params.metadata ?? {},
        createdAt: new Date(),
      });

      this.logger.info('Hyp payment URL generated', {
        paymentIntentId,
        orderId: params.orderId,
        urlPreview: paymentUrl.substring(0, 100) + '...',
      });

      return {
        id: paymentIntentId,
        clientSecret: paymentUrl,  // L'URL de paiement pour redirection
        status: 'requires_payment_method',
        amount: params.amount.amount,
        currency: params.amount.currency,
      };
    } catch (error) {
      this.logger.error('Failed to create Hyp payment intent', {
        orderId: params.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError(
        'Hyp',
        `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Récupère une intention de paiement
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    const cached = this.paymentIntentCache.get(paymentIntentId);

    if (!cached) {
      throw new ExternalServiceError('Hyp', `PaymentIntent ${paymentIntentId} not found`);
    }

    return {
      id: paymentIntentId,
      clientSecret: '',
      status: cached.status,
      amount: cached.amount,
      currency: cached.currency,
    };
  }

  /**
   * Annule une intention de paiement
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    const cached = this.paymentIntentCache.get(paymentIntentId);

    if (cached) {
      cached.status = 'canceled';
      this.logger.info('Payment intent canceled', { paymentIntentId });
    }
  }

  /**
   * Crée un remboursement
   */
  async createRefund(params: RefundParams): Promise<RefundResult> {
    this.logger.info('Creating Hyp refund', {
      paymentIntentId: params.paymentIntentId,
      amount: params.amount?.amount,
    });

    try {
      // Récupérer les infos de la transaction originale
      const cached = this.paymentIntentCache.get(params.paymentIntentId);
      const refundAmount = params.amount?.amount ?? cached?.amount ?? 0;
      const amountInCents = Math.round(refundAmount * 100);

      // Paramètres pour le remboursement via API Hyp
      const refundParams = {
        Masof: this.config.masof,
        PassP: this.config.passP,
        TransId: params.paymentIntentId,  // ID de transaction Hyp
        Amount: amountInCents.toString(),
        action: 'soft',  // soft = remboursement, hard = annulation
      };

      // Générer la signature pour le remboursement
      const sign = this.generateSignature(refundParams);

      // Appeler l'API de remboursement Hyp
      const response = await this.client.post<HypPaymentResponse>(
        '/p/',
        new URLSearchParams({
          ...refundParams,
          Sign: sign,
        }).toString()
      );

      if (response.data.CCode !== '0') {
        throw new Error(response.data.errMsg ?? `Refund failed with code ${response.data.CCode}`);
      }

      const refundId = `hyp_ref_${Date.now()}_${this.generateRandomString(8)}`;

      this.logger.info('Hyp refund created', {
        refundId,
        paymentIntentId: params.paymentIntentId,
        amount: refundAmount,
      });

      return {
        id: refundId,
        status: 'succeeded',
        amount: refundAmount,
      };
    } catch (error) {
      this.logger.error('Failed to create Hyp refund', {
        paymentIntentId: params.paymentIntentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError(
        'Hyp',
        `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Crée un client (Hyp ne gère pas les clients comme Stripe)
   * Retourne un ID généré localement
   */
  async createCustomer(params: CreateCustomerParams): Promise<string> {
    // Hyp n'a pas de système de gestion des clients comme Stripe
    // On génère un ID local pour compatibilité
    const customerId = `hyp_cus_${Date.now()}_${this.generateRandomString(8)}`;

    this.logger.info('Created local customer reference for Hyp', {
      customerId,
      email: params.email.value,
    });

    return customerId;
  }

  /**
   * Récupère un client
   */
  async retrieveCustomer(customerId: string): Promise<{ id: string; email: string; name: string }> {
    // Hyp ne stocke pas les clients - retourner des valeurs par défaut
    return {
      id: customerId,
      email: '',
      name: '',
    };
  }

  /**
   * Construit un événement webhook à partir du payload et de la signature
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent {
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');

    // Parser les données du webhook (format URL-encoded ou JSON)
    let data: HypWebhookPayload;

    try {
      if (payloadString.startsWith('{')) {
        data = JSON.parse(payloadString);
      } else {
        // Parser les données URL-encoded
        const params = new URLSearchParams(payloadString);
        // Build data object with only defined properties
        const parsedData: HypWebhookPayload = {
          Id: params.get('Id') ?? '',
          CCode: params.get('CCode') ?? '',
          Amount: params.get('Amount') ?? '',
          ACode: params.get('ACode') ?? '',
          Order: params.get('Order') ?? '',
        };

        // Add optional fields only if they have values
        const optionalFields = ['Fild1', 'Fild2', 'Fild3', 'Bank', 'Payments', 'UserId', 'Brand', 'L4digit', 'Hesh', 'UID', 'Sign', 'errMsg', 'Coin', 'J'] as const;
        for (const field of optionalFields) {
          const value = params.get(field);
          if (value !== null) {
            (parsedData as unknown as Record<string, string>)[field] = value;
          }
        }
        data = parsedData;
      }
    } catch (error) {
      throw new ValidationError('Invalid webhook payload format');
    }

    // Vérifier la signature
    if (!this.validateWebhookSignature(payloadString, signature)) {
      throw new ValidationError('Invalid webhook signature');
    }

    // Déterminer le type d'événement basé sur CCode
    const eventType = this.determineEventType(data);

    return {
      id: data.Id || `hyp_evt_${Date.now()}`,
      type: eventType,
      data: data as unknown as Record<string, unknown>,
      created: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Valide la signature du webhook
   */
  validateWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');

      // Parser les paramètres pour extraire les valeurs de signature
      let params: Record<string, string>;

      if (payloadString.startsWith('{')) {
        params = JSON.parse(payloadString);
      } else {
        const urlParams = new URLSearchParams(payloadString);
        params = Object.fromEntries(urlParams.entries());
      }

      // Utiliser la signature fournie ou celle dans le payload
      const receivedSign = signature || params['Sign'] || '';

      // Recalculer la signature attendue
      // Hyp utilise: HMAC-SHA256(Masof + PassP + Amount + Order, apiSignatureKey)
      const signData = `${this.config.masof}${params['Amount'] ?? ''}${params['Order'] ?? ''}`;
      const expectedSign = this.computeHmacSha256(signData);

      // Comparaison timing-safe
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSign.toLowerCase()),
        Buffer.from(receivedSign.toLowerCase())
      );

      if (!isValid) {
        this.logger.warn('Webhook signature mismatch', {
          expected: expectedSign.substring(0, 10) + '...',
          received: receivedSign.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // ============================================================================
  // Signature Generation (Critical Security)
  // ============================================================================

  /**
   * Génère la signature cryptographique pour les requêtes Hyp
   * Format: HMAC-SHA256(Masof + PassP + Amount + Order, apiSignatureKey)
   */
  private generateSignature(params: Partial<HypPaymentParams>): string {
    // Construire la chaîne à signer selon la documentation Hyp
    // L'ordre est important: Masof + PassP + Amount + Order
    const signString = [
      params.Masof ?? this.config.masof,
      this.config.passP,
      params.Amount ?? '',
      params.Order ?? '',
    ].join('');

    return this.computeHmacSha256(signString);
  }

  /**
   * Calcule le HMAC-SHA256 d'une chaîne
   */
  private computeHmacSha256(data: string): string {
    return crypto
      .createHmac('sha256', this.config.apiSignatureKey)
      .update(data, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  // ============================================================================
  // URL Building
  // ============================================================================

  /**
   * Construit l'URL de paiement complète
   */
  private buildPaymentUrl(params: HypPaymentParams): string {
    const searchParams = new URLSearchParams();

    // Ajouter tous les paramètres non-vides
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    // Ajouter les URLs de callback
    searchParams.append('SuccessUrl', this.config.successUrl);
    searchParams.append('ErrorUrl', this.config.errorUrl);
    searchParams.append('NotifyUrl', this.config.notifyUrl);

    // Construire l'URL finale
    const endpoint = this.config.paymentMode === 'iframe' ? '/p3/' : '/p/';
    return `${this.config.baseUrl}${endpoint}?${searchParams.toString()}`;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Mappe le code devise vers le format Hyp
   */
  private mapCurrency(currency: string): string {
    const mapping: Record<string, string> = {
      'ILS': '1',
      'USD': '2',
      'EUR': '3',
      'GBP': '4',
    };
    return mapping[currency.toUpperCase()] ?? '1';
  }

  /**
   * Détermine le type d'événement basé sur la réponse Hyp
   */
  private determineEventType(data: HypWebhookPayload): string {
    // CCode = '0' signifie succès
    if (data.CCode === '0') {
      return 'payment.succeeded';
    }

    // Codes d'erreur courants
    const errorCodes: Record<string, string> = {
      '1': 'payment.failed',           // Transaction refusée
      '2': 'payment.failed',           // Carte expirée
      '3': 'payment.failed',           // Carte volée
      '4': 'payment.requires_action',  // Problème de communication
      '5': 'payment.failed',           // Fonds insuffisants
      '6': 'payment.canceled',         // Annulé par l'utilisateur
      '33': 'payment.failed',          // 3D Secure échoué
    };

    return errorCodes[data.CCode] ?? 'payment.failed';
  }

  /**
   * Génère une chaîne aléatoire
   */
  private generateRandomString(length: number): string {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  // ============================================================================
  // Public Helpers for Webhook Controller
  // ============================================================================

  /**
   * Extrait les données de paiement d'un payload webhook
   */
  extractPaymentData(payload: HypWebhookPayload): {
    transactionId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'pending';
    cardBrand?: string;
    cardLast4?: string;
    authorizationCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  } {
    // Convertir le montant des agorot/centimes vers l'unité principale
    const amount = parseInt(payload.Amount, 10) / 100;

    // Parser les données additionnelles si présentes
    let metadata: Record<string, unknown> = {};
    try {
      if (payload.Fild1) {
        metadata = JSON.parse(payload.Fild1);
      }
    } catch {
      // Ignorer les erreurs de parsing
    }

    const result: {
      transactionId: string;
      orderId: string;
      amount: number;
      currency: string;
      status: 'pending' | 'succeeded' | 'failed';
      cardBrand?: string;
      cardLast4?: string;
      authorizationCode?: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    } = {
      transactionId: payload.Id,
      orderId: payload.Order,
      amount,
      currency: CURRENCY_CODES[payload.Coin ?? '1'] ?? 'ILS',
      status: payload.CCode === '0' ? 'succeeded' : 'failed',
      metadata,
    };

    // Add optional fields only if they have values
    const cardBrand = CARD_BRANDS[payload.Brand ?? ''];
    if (cardBrand) result.cardBrand = cardBrand;
    if (payload.L4digit) result.cardLast4 = payload.L4digit;
    if (payload.ACode) result.authorizationCode = payload.ACode;
    if (payload.errMsg) result.errorMessage = payload.errMsg;

    return result;
  }

  /**
   * Met à jour le statut d'une intention de paiement
   */
  updatePaymentIntentStatus(paymentIntentId: string, status: string): void {
    const cached = this.paymentIntentCache.get(paymentIntentId);
    if (cached) {
      cached.status = status;
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createHypAdapter(logger: Logger): HypAdapter {
  const masof = process.env['HYP_MASOF'];
  const passP = process.env['HYP_PASSP'];
  const apiSignatureKey = process.env['HYP_API_SIGNATURE_KEY'];
  const successUrl = process.env['HYP_SUCCESS_URL'];
  const errorUrl = process.env['HYP_ERROR_URL'];
  const notifyUrl = process.env['HYP_NOTIFY_URL'];

  if (!masof || !passP || !apiSignatureKey) {
    throw new Error('Missing Hyp configuration: HYP_MASOF, HYP_PASSP, HYP_API_SIGNATURE_KEY required');
  }

  if (!successUrl || !errorUrl || !notifyUrl) {
    throw new Error('Missing Hyp URLs: HYP_SUCCESS_URL, HYP_ERROR_URL, HYP_NOTIFY_URL required');
  }

  return new HypAdapter(
    {
      masof,
      passP,
      apiSignatureKey,
      successUrl,
      errorUrl,
      notifyUrl,
      sandbox: process.env['NODE_ENV'] !== 'production',
    },
    logger
  );
}
