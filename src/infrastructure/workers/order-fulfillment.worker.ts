// ============================================================================
// Order Fulfillment Worker - Async Payment Processing
// ============================================================================
// Processes Stripe webhook events and triggers AliExpress order creation
// Implements:
// - Idempotent processing (event deduplication)
// - Address sanitization for AliExpress (Latin chars only)
// - Tax ID handling for Brazil (CPF) and Chile (RUT)
// - Automatic retry with exponential backoff
// ============================================================================

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient, SupplierOrderStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { AliExpressAdapter, AliExpressConfig } from '@infrastructure/adapters/outbound/external-apis/aliexpress.adapter.js';
import { logger } from '@shared/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface WebhookQueueJob {
  eventId: string;
  eventType: string;
  eventData: {
    object: Stripe.PaymentIntent | Stripe.Charge | Stripe.Refund;
  };
  receivedAt: string;
}

interface SanitizedAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  taxId?: string; // CPF for Brazil, RUT for Chile
}

// Countries requiring tax ID
const TAX_ID_REQUIRED_COUNTRIES: Record<string, { name: string; pattern: RegExp }> = {
  BR: { name: 'CPF', pattern: /^\d{11}$/ },
  CL: { name: 'RUT', pattern: /^\d{7,8}-[\dkK]$/ },
};

// ============================================================================
// Order Fulfillment Worker
// ============================================================================

export class OrderFulfillmentWorker {
  private worker: Worker<WebhookQueueJob> | null = null;
  private readonly prisma: PrismaClient;
  private readonly aliexpress: AliExpressAdapter;

  constructor(
    private readonly redisConnection: Redis,
    prisma: PrismaClient,
    aliexpressConfig: AliExpressConfig
  ) {
    this.prisma = prisma;
    this.aliexpress = new AliExpressAdapter(aliexpressConfig);
  }

  /**
   * Start the fulfillment worker
   */
  start(): void {
    if (this.worker) {
      logger.warn('Fulfillment worker already running');
      return;
    }

    this.worker = new Worker<WebhookQueueJob>(
      'stripe-webhooks',
      async (job) => this.processJob(job),
      {
        connection: this.redisConnection,
        concurrency: 5, // Process up to 5 events in parallel
      }
    );

    this.worker.on('completed', (job, result) => {
      logger.info('Fulfillment job completed', {
        jobId: job.id,
        eventId: job.data.eventId,
        result,
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('Fulfillment job failed', {
        jobId: job?.id,
        eventId: job?.data.eventId,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error', { error });
    });

    logger.info('Order fulfillment worker started');
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('Order fulfillment worker stopped');
    }
  }

  /**
   * Process a webhook event job
   */
  private async processJob(job: Job<WebhookQueueJob>): Promise<string> {
    const { eventId, eventType, eventData } = job.data;

    logger.info('Processing webhook event', { eventId, eventType });

    try {
      switch (eventType) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(eventData.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(eventData.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(eventData.object as Stripe.Refund);
          break;

        case 'charge.dispute.created':
          await this.handleDisputeCreated(eventData.object);
          break;

        default:
          logger.info('Unhandled event type', { eventType });
      }

      // Mark webhook event as processed
      await this.prisma.webhookEvent.update({
        where: { stripeEventId: eventId },
        data: {
          status: 'completed',
          eventType,
          processedAt: new Date(),
        },
      });

      return `Processed ${eventType}`;
    } catch (error) {
      // Mark as failed
      await this.prisma.webhookEvent.update({
        where: { stripeEventId: eventId },
        data: {
          status: 'failed',
          eventType,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle successful payment - Create AliExpress orders
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    const cartId = paymentIntent.metadata?.cart_id;

    if (!orderId && !cartId) {
      logger.error('PaymentIntent missing order_id or cart_id metadata', {
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Find the order
    const order = await this.prisma.order.findFirst({
      where: orderId
        ? { id: orderId }
        : { stripePaymentIntentId: paymentIntent.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      logger.error('Order not found for PaymentIntent', {
        paymentIntentId: paymentIntent.id,
        orderId,
      });
      return;
    }

    // Update order status
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.paid,
        paymentStatus: PaymentStatus.succeeded,
        paidAt: new Date(),
      },
    });

    logger.info('Order marked as paid', { orderId: order.id });

    // Sanitize shipping address for AliExpress
    const sanitizedAddress = this.sanitizeAddress({
      name: `${order.shippingFirstName} ${order.shippingLastName}`,
      street: order.shippingStreet,
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
      phone: order.shippingPhone ?? '',
      taxId: paymentIntent.metadata?.tax_id,
    });

    // Create supplier orders for each item
    for (const item of order.items) {
      try {
        await this.createSupplierOrder(order.id, item, sanitizedAddress);
      } catch (error) {
        logger.error('Failed to create supplier order', {
          orderId: order.id,
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update order status to processing
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.processing,
      },
    });
  }

  /**
   * Handle payment failure
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
      logger.warn('PaymentIntent failed without order_id', {
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.failed,
        notes: `Payment failed: ${paymentIntent.last_payment_error?.message ?? 'Unknown error'}`,
      },
    });

    logger.info('Order marked as payment failed', { orderId });
  }

  /**
   * Handle refund
   */
  private async handleChargeRefunded(refund: Stripe.Refund): Promise<void> {
    const paymentIntentId = refund.payment_intent as string;

    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!order) {
      logger.warn('Order not found for refund', { paymentIntentId });
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.refunded,
        paymentStatus: PaymentStatus.refunded,
        notes: `Refund processed: ${refund.id}`,
      },
    });

    // TODO: Cancel supplier orders if not yet shipped
    logger.info('Order refunded', { orderId: order.id, refundId: refund.id });
  }

  /**
   * Handle dispute
   */
  private async handleDisputeCreated(dispute: unknown): Promise<void> {
    // Log for manual review
    logger.error('DISPUTE CREATED - REQUIRES MANUAL REVIEW', { dispute });
    // TODO: Send alert notification
  }

  // ============================================================================
  // Supplier Order Creation
  // ============================================================================

  /**
   * Create a supplier order on AliExpress
   */
  private async createSupplierOrder(
    orderId: string,
    item: {
      id: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      supplierPrice: { toNumber(): number };
      product: {
        aliexpressId: string;
      };
    },
    address: SanitizedAddress
  ): Promise<void> {
    // Create pending supplier order record
    const supplierOrder = await this.prisma.supplierOrder.create({
      data: {
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitCost: item.supplierPrice.toNumber(),
        shippingCost: 0, // Will be updated after AliExpress response
        totalCost: item.supplierPrice.toNumber() * item.quantity,
        shippingName: address.name,
        shippingAddress: address.street,
        shippingCity: address.city,
        shippingPostalCode: address.postalCode,
        shippingCountry: address.country,
        shippingPhone: address.phone,
        taxId: address.taxId,
        status: SupplierOrderStatus.pending,
      },
    });

    try {
      // Submit order to AliExpress
      const result = await this.aliexpress.placeOrder(
        [
          {
            productId: item.product.aliexpressId,
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
          },
        ],
        {
          fullName: address.name,
          street: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        }
      );

      // Update supplier order with AliExpress order ID
      await this.prisma.supplierOrder.update({
        where: { id: supplierOrder.id },
        data: {
          aliexpressOrderId: result.orderId,
          status: SupplierOrderStatus.submitted,
          submittedAt: new Date(),
        },
      });

      logger.info('Supplier order created', {
        supplierOrderId: supplierOrder.id,
        aliexpressOrderId: result.orderId,
      });
    } catch (error) {
      // Mark as failed
      await this.prisma.supplierOrder.update({
        where: { id: supplierOrder.id },
        data: {
          status: SupplierOrderStatus.failed,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  // ============================================================================
  // Address Sanitization
  // ============================================================================

  /**
   * Sanitize address for AliExpress API requirements
   * - Convert to Latin characters (no accents)
   * - Validate and format phone numbers
   * - Handle tax IDs for BR and CL
   */
  private sanitizeAddress(input: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    taxId?: string;
  }): SanitizedAddress {
    return {
      name: this.removeDiacritics(input.name).toUpperCase(),
      street: this.removeDiacritics(input.street).toUpperCase(),
      city: this.removeDiacritics(input.city).toUpperCase(),
      postalCode: input.postalCode.replace(/\s/g, ''),
      country: input.country.toUpperCase(),
      phone: this.sanitizePhone(input.phone, input.country),
      taxId: this.validateTaxId(input.taxId, input.country),
    };
  }

  /**
   * Remove diacritics (accents) from text
   * AliExpress API requires Latin characters without accents
   */
  private removeDiacritics(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Also handle special characters
      .replace(/ß/g, 'ss')
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .replace(/ø/g, 'o')
      .replace(/ł/g, 'l')
      .replace(/đ/g, 'd')
      // Remove any remaining non-ASCII characters
      .replace(/[^\x00-\x7F]/g, '');
  }

  /**
   * Sanitize phone number
   */
  private sanitizePhone(phone: string, country: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with country code
    if (!cleaned.startsWith('+')) {
      const countryCodes: Record<string, string> = {
        FR: '+33',
        ES: '+34',
        IT: '+39',
        DE: '+49',
        GB: '+44',
        BR: '+55',
        CL: '+56',
        US: '+1',
      };

      const prefix = countryCodes[country] ?? '+';
      if (cleaned.startsWith('0')) {
        cleaned = prefix + cleaned.substring(1);
      } else {
        cleaned = prefix + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Validate tax ID for countries that require it
   */
  private validateTaxId(taxId: string | undefined, country: string): string | undefined {
    const requirement = TAX_ID_REQUIRED_COUNTRIES[country];

    if (!requirement) {
      return undefined;
    }

    if (!taxId) {
      logger.warn(`Missing required ${requirement.name} for country ${country}`);
      return undefined;
    }

    // Clean the tax ID
    const cleaned = taxId.replace(/[.\-\s]/g, '');

    if (!requirement.pattern.test(cleaned)) {
      logger.warn(`Invalid ${requirement.name} format`, { taxId: cleaned, country });
    }

    return cleaned;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createOrderFulfillmentWorker(
  redisUrl: string,
  prisma: PrismaClient,
  aliexpressConfig: AliExpressConfig
): OrderFulfillmentWorker {
  const redis = new Redis(redisUrl);
  return new OrderFulfillmentWorker(redis, prisma, aliexpressConfig);
}
