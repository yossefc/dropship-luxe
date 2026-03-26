// ============================================================================
// Meta Conversions API (CAPI) Adapter - Server-Side Tracking
// ============================================================================
// Adaptateur pour envoyer les événements de conversion directement à Meta/Facebook
// depuis le backend, contournant les bloqueurs de publicité côté client.
//
// Documentation: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// Événements supportés:
// - Purchase (achat effectué)
// - AddToCart (ajout au panier)
// - InitiateCheckout (début de checkout)
// - ViewContent (vue produit)
// - Lead (inscription newsletter)
// ============================================================================

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { logger } from '@infrastructure/config/logger.js';
import { PrismaClient } from '@prisma/client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MetaCapiConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string; // Pour les tests (Events Manager)
  isDevelopment?: boolean;
}

export interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string; // Facebook Click ID (from _fbc cookie)
  fbp?: string; // Facebook Browser ID (from _fbp cookie)
  externalId?: string; // Customer ID in your system
}

export interface PurchaseEventData {
  orderId: string;
  orderNumber: string;
  value: number;
  currency: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
  user: UserData;
  eventSourceUrl?: string;
}

export interface AddToCartEventData {
  productId: string;
  productName: string;
  value: number;
  currency: string;
  quantity: number;
  category?: string;
  user: UserData;
  eventSourceUrl?: string;
}

export interface ViewContentEventData {
  productId: string;
  productName: string;
  value: number;
  currency: string;
  category?: string;
  user: UserData;
  eventSourceUrl?: string;
}

export interface InitiateCheckoutEventData {
  value: number;
  currency: string;
  numItems: number;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  user: UserData;
  eventSourceUrl?: string;
}

export interface MetaCapiResponse {
  success: boolean;
  eventsReceived?: number;
  fbTraceId?: string;
  error?: string;
}

// ============================================================================
// Meta CAPI Event Structure
// ============================================================================

interface MetaEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website';
  user_data: Record<string, string | undefined>;
  custom_data?: Record<string, unknown>;
  opt_out?: boolean;
}

interface MetaApiPayload {
  data: MetaEvent[];
  test_event_code?: string;
}

// ============================================================================
// Meta CAPI Adapter Class
// ============================================================================

export class MetaCapiAdapter {
  private readonly client: AxiosInstance;
  private readonly config: MetaCapiConfig;
  private readonly prisma: PrismaClient;
  private readonly apiVersion = 'v19.0';

  constructor(config: MetaCapiConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ============================================================================
  // Public Methods - Track Events
  // ============================================================================

  /**
   * Track Purchase event
   * Should be called after successful payment webhook
   */
  async trackPurchase(data: PurchaseEventData): Promise<MetaCapiResponse> {
    const eventId = this.generateEventId('purchase', data.orderId);

    const contents = data.items.map(item => ({
      id: item.productId,
      quantity: item.quantity,
      item_price: item.price,
      title: item.name,
    }));

    const event: MetaEvent = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: data.eventSourceUrl ?? 'https://www.hayoss.com/checkout/success',
      action_source: 'website',
      user_data: this.hashUserData(data.user),
      custom_data: {
        value: data.value,
        currency: data.currency,
        content_type: 'product',
        contents,
        content_ids: data.items.map(i => i.productId),
        num_items: data.items.reduce((sum, i) => sum + i.quantity, 0),
        order_id: data.orderNumber,
      },
    };

    return this.sendEvent(event, {
      orderId: data.orderId,
      type: 'Purchase',
      value: data.value,
    });
  }

  /**
   * Track AddToCart event
   */
  async trackAddToCart(data: AddToCartEventData): Promise<MetaCapiResponse> {
    const eventId = this.generateEventId('add_to_cart', data.productId);

    const event: MetaEvent = {
      event_name: 'AddToCart',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: data.eventSourceUrl,
      action_source: 'website',
      user_data: this.hashUserData(data.user),
      custom_data: {
        value: data.value,
        currency: data.currency,
        content_type: 'product',
        content_ids: [data.productId],
        content_name: data.productName,
        content_category: data.category,
        num_items: data.quantity,
      },
    };

    return this.sendEvent(event, {
      productId: data.productId,
      type: 'AddToCart',
      value: data.value,
    });
  }

  /**
   * Track ViewContent event (product page view)
   */
  async trackViewContent(data: ViewContentEventData): Promise<MetaCapiResponse> {
    const eventId = this.generateEventId('view_content', data.productId);

    const event: MetaEvent = {
      event_name: 'ViewContent',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: data.eventSourceUrl,
      action_source: 'website',
      user_data: this.hashUserData(data.user),
      custom_data: {
        value: data.value,
        currency: data.currency,
        content_type: 'product',
        content_ids: [data.productId],
        content_name: data.productName,
        content_category: data.category,
      },
    };

    return this.sendEvent(event, {
      productId: data.productId,
      type: 'ViewContent',
      value: data.value,
    });
  }

  /**
   * Track InitiateCheckout event
   */
  async trackInitiateCheckout(data: InitiateCheckoutEventData): Promise<MetaCapiResponse> {
    const eventId = this.generateEventId('initiate_checkout', `${Date.now()}`);

    const contents = data.items.map(item => ({
      id: item.productId,
      quantity: item.quantity,
      item_price: item.price,
      title: item.name,
    }));

    const event: MetaEvent = {
      event_name: 'InitiateCheckout',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: data.eventSourceUrl ?? 'https://www.hayoss.com/checkout',
      action_source: 'website',
      user_data: this.hashUserData(data.user),
      custom_data: {
        value: data.value,
        currency: data.currency,
        content_type: 'product',
        contents,
        content_ids: data.items.map(i => i.productId),
        num_items: data.numItems,
      },
    };

    return this.sendEvent(event, {
      type: 'InitiateCheckout',
      value: data.value,
    });
  }

  /**
   * Track Lead event (newsletter signup)
   */
  async trackLead(user: UserData, eventSourceUrl?: string): Promise<MetaCapiResponse> {
    const eventId = this.generateEventId('lead', user.email ?? `${Date.now()}`);

    const event: MetaEvent = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl ?? 'https://www.hayoss.com',
      action_source: 'website',
      user_data: this.hashUserData(user),
    };

    return this.sendEvent(event, { type: 'Lead' });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Send event to Meta Conversions API
   */
  private async sendEvent(
    event: MetaEvent,
    logData: Record<string, unknown>
  ): Promise<MetaCapiResponse> {
    const payload: MetaApiPayload = {
      data: [event],
    };

    // Add test event code if in development/testing
    if (this.config.testEventCode) {
      payload.test_event_code = this.config.testEventCode;
    }

    try {
      // Development mode - log only
      if (this.config.isDevelopment) {
        logger.info('[MetaCAPI] Development mode - would send event:', {
          eventName: event.event_name,
          eventId: event.event_id,
          ...logData,
        });
        return {
          success: true,
          eventsReceived: 1,
          fbTraceId: `dev-${Date.now()}`,
        };
      }

      // Production - send to Meta API
      const response = await this.client.post<{
        events_received: number;
        fbtrace_id: string;
        messages?: string[];
      }>(
        `/${this.config.pixelId}/events`,
        payload,
        {
          params: {
            access_token: this.config.accessToken,
          },
        }
      );

      // Log to audit
      await this.prisma.auditLog.create({
        data: {
          action: 'META_CAPI_EVENT',
          entity: 'MetaEvent',
          entityId: event.event_id,
          changes: {
            eventName: event.event_name,
            eventsReceived: response.data.events_received,
            fbTraceId: response.data.fbtrace_id,
            ...logData,
          },
        },
      });

      logger.info('[MetaCAPI] Event sent successfully', {
        eventName: event.event_name,
        eventId: event.event_id,
        eventsReceived: response.data.events_received,
        fbTraceId: response.data.fbtrace_id,
      });

      return {
        success: true,
        eventsReceived: response.data.events_received,
        fbTraceId: response.data.fbtrace_id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('[MetaCAPI] Failed to send event:', {
        eventName: event.event_name,
        error: errorMessage,
        ...logData,
      });

      // Log error to audit
      await this.prisma.auditLog.create({
        data: {
          action: 'META_CAPI_ERROR',
          entity: 'MetaEvent',
          entityId: event.event_id,
          changes: {
            eventName: event.event_name,
            error: errorMessage,
            ...logData,
          },
        },
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Hash user data according to Meta requirements
   * All PII must be hashed with SHA-256 before sending
   */
  private hashUserData(user: UserData): Record<string, string | undefined> {
    const hashed: Record<string, string | undefined> = {};

    // Hash email (lowercase, trimmed)
    if (user.email) {
      hashed.em = this.sha256(user.email.toLowerCase().trim());
    }

    // Hash phone (remove non-digits, no country code prefix)
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      hashed.ph = this.sha256(cleanPhone);
    }

    // Hash first name (lowercase, trimmed)
    if (user.firstName) {
      hashed.fn = this.sha256(user.firstName.toLowerCase().trim());
    }

    // Hash last name (lowercase, trimmed)
    if (user.lastName) {
      hashed.ln = this.sha256(user.lastName.toLowerCase().trim());
    }

    // Hash city (lowercase, no spaces)
    if (user.city) {
      hashed.ct = this.sha256(user.city.toLowerCase().replace(/\s/g, ''));
    }

    // Hash state (2-letter code, lowercase)
    if (user.state) {
      hashed.st = this.sha256(user.state.toLowerCase().trim());
    }

    // Hash postal code (no spaces)
    if (user.postalCode) {
      hashed.zp = this.sha256(user.postalCode.replace(/\s/g, ''));
    }

    // Hash country (2-letter ISO code, lowercase)
    if (user.country) {
      hashed.country = this.sha256(user.country.toLowerCase().trim());
    }

    // Non-hashed fields
    if (user.clientIpAddress) {
      hashed.client_ip_address = user.clientIpAddress;
    }

    if (user.clientUserAgent) {
      hashed.client_user_agent = user.clientUserAgent;
    }

    // Facebook click ID (from cookie)
    if (user.fbc) {
      hashed.fbc = user.fbc;
    }

    // Facebook browser ID (from cookie)
    if (user.fbp) {
      hashed.fbp = user.fbp;
    }

    // External ID (hashed)
    if (user.externalId) {
      hashed.external_id = this.sha256(user.externalId);
    }

    return hashed;
  }

  /**
   * SHA-256 hash function
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate unique event ID for deduplication
   */
  private generateEventId(eventType: string, identifier: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${eventType}_${identifier}_${timestamp}_${random}`;
  }
}

// ============================================================================
// Port Interface (Hexagonal Architecture)
// ============================================================================

export interface ConversionTrackingPort {
  trackPurchase(data: PurchaseEventData): Promise<MetaCapiResponse>;
  trackAddToCart(data: AddToCartEventData): Promise<MetaCapiResponse>;
  trackViewContent(data: ViewContentEventData): Promise<MetaCapiResponse>;
  trackInitiateCheckout(data: InitiateCheckoutEventData): Promise<MetaCapiResponse>;
  trackLead(user: UserData, eventSourceUrl?: string): Promise<MetaCapiResponse>;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMetaCapiAdapter(prisma: PrismaClient): MetaCapiAdapter {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    throw new Error('META_PIXEL_ID and META_CAPI_ACCESS_TOKEN environment variables are required');
  }

  const config: MetaCapiConfig = {
    pixelId,
    accessToken,
    testEventCode: process.env.META_TEST_EVENT_CODE,
    isDevelopment: process.env.NODE_ENV !== 'production',
  };

  return new MetaCapiAdapter(config, prisma);
}

// ============================================================================
// Helper: Extract user data from request
// ============================================================================

export function extractUserDataFromRequest(
  req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  customer?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }
): UserData {
  const userData: UserData = {
    clientIpAddress: req.ip ?? (req.headers['x-forwarded-for'] as string)?.split(',')[0],
    clientUserAgent: req.headers['user-agent'] as string,
  };

  if (customer) {
    userData.externalId = customer.id;
    if (customer.email) userData.email = customer.email;
    if (customer.firstName) userData.firstName = customer.firstName;
    if (customer.lastName) userData.lastName = customer.lastName;
    if (customer.phone) userData.phone = customer.phone;
  }

  // Extract Facebook cookies from request cookies
  const cookies = req.headers.cookie;
  if (typeof cookies === 'string') {
    const fbcMatch = cookies.match(/_fbc=([^;]+)/);
    const fbpMatch = cookies.match(/_fbp=([^;]+)/);
    if (fbcMatch) userData.fbc = fbcMatch[1];
    if (fbpMatch) userData.fbp = fbpMatch[1];
  }

  return userData;
}
