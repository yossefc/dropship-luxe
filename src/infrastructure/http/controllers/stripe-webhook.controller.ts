// ============================================================================
// Stripe Webhook Controller - Secure Event Processing
// ============================================================================
// Implements:
// - HMAC signature verification
// - Replay attack protection
// - Immediate 200 response (avoid Stripe timeouts)
// - Async event processing via BullMQ
// - Idempotent event handling (deduplication)
// ============================================================================

import { Request, Response, Router } from 'express';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { StripeAdapter, createStripeAdapter, WebhookEvent } from '@infrastructure/adapters/outbound/payment/stripe.adapter.js';
import { PrismaClient } from '@prisma/client';
import { logger } from '@shared/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface WebhookQueueJob {
  eventId: string;
  eventType: string;
  eventData: WebhookEvent['data'];
  receivedAt: string;
}

// Events we process
const HANDLED_EVENT_TYPES = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'charge.refunded',
  'charge.dispute.created',
] as const;

// ============================================================================
// Webhook Controller
// ============================================================================

export class StripeWebhookController {
  private readonly stripeAdapter: StripeAdapter;
  private readonly webhookQueue: Queue<WebhookQueueJob>;
  private readonly prisma: PrismaClient;
  private readonly processedEventsCache: Set<string>;
  private readonly CACHE_MAX_SIZE = 10000;

  constructor(
    redisConnection: Redis,
    prisma: PrismaClient,
    stripeAdapter?: StripeAdapter
  ) {
    this.stripeAdapter = stripeAdapter ?? createStripeAdapter();
    this.prisma = prisma;
    this.processedEventsCache = new Set();

    // Initialize BullMQ queue for async processing
    this.webhookQueue = new Queue<WebhookQueueJob>('stripe-webhooks', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10 seconds initial delay
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 500,
        },
      },
    });
  }

  /**
   * Main webhook handler
   * Verifies signature, deduplicates, and queues for async processing
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'];

    // Validate signature header exists
    if (!signature || typeof signature !== 'string') {
      logger.warn('Webhook received without signature');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: WebhookEvent;

    try {
      // Step 1: Verify HMAC signature and timestamp (replay protection)
      event = this.stripeAdapter.verifyWebhookSignature(req.body, signature);
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Step 2: Check if event type is one we handle
    if (!HANDLED_EVENT_TYPES.includes(event.type as typeof HANDLED_EVENT_TYPES[number])) {
      logger.debug('Ignoring unhandled event type', { eventType: event.type });
      res.status(200).json({ received: true, handled: false });
      return;
    }

    // Step 3: Idempotency check - prevent duplicate processing
    const isDuplicate = await this.checkDuplicateEvent(event.id);
    if (isDuplicate) {
      logger.info('Duplicate event ignored', { eventId: event.id });
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    // Step 4: Immediately acknowledge receipt (avoid Stripe timeout)
    res.status(202).json({ received: true, eventId: event.id });

    // Step 5: Queue event for async processing
    try {
      await this.queueEventForProcessing(event);
      logger.info('Event queued for processing', {
        eventId: event.id,
        eventType: event.type,
      });
    } catch (error) {
      // Log but don't fail - we already sent 202
      logger.error('Failed to queue event', { eventId: event.id, error });
    }
  }

  /**
   * Check if event was already processed (deduplication)
   */
  private async checkDuplicateEvent(eventId: string): Promise<boolean> {
    // First check in-memory cache (fast path)
    if (this.processedEventsCache.has(eventId)) {
      return true;
    }

    // Then check database
    try {
      const existingEvent = await this.prisma.webhookEvent.findUnique({
        where: { stripeEventId: eventId },
      });

      if (existingEvent) {
        // Add to cache for future lookups
        this.addToCache(eventId);
        return true;
      }

      // Record event as being processed
      await this.prisma.webhookEvent.create({
        data: {
          stripeEventId: eventId,
          status: 'processing',
          receivedAt: new Date(),
        },
      });

      this.addToCache(eventId);
      return false;
    } catch (error) {
      // If duplicate key error, event exists
      if ((error as { code?: string }).code === 'P2002') {
        return true;
      }
      throw error;
    }
  }

  /**
   * Add event ID to in-memory cache with LRU eviction
   */
  private addToCache(eventId: string): void {
    if (this.processedEventsCache.size >= this.CACHE_MAX_SIZE) {
      // Simple eviction: remove first item (oldest)
      const firstKey = this.processedEventsCache.values().next().value;
      if (firstKey) {
        this.processedEventsCache.delete(firstKey);
      }
    }
    this.processedEventsCache.add(eventId);
  }

  /**
   * Queue event for async processing via BullMQ
   */
  private async queueEventForProcessing(event: WebhookEvent): Promise<void> {
    const job: WebhookQueueJob = {
      eventId: event.id,
      eventType: event.type,
      eventData: event.data,
      receivedAt: new Date().toISOString(),
    };

    // Use event ID as job ID for deduplication at queue level
    await this.webhookQueue.add(event.type, job, {
      jobId: event.id,
    });
  }

  /**
   * Get queue for worker setup
   */
  getQueue(): Queue<WebhookQueueJob> {
    return this.webhookQueue;
  }
}

// ============================================================================
// Express Router Setup
// ============================================================================

export function createStripeWebhookRouter(
  redisConnection: Redis,
  prisma: PrismaClient
): { router: Router; controller: StripeWebhookController } {
  const router = Router();
  const controller = new StripeWebhookController(redisConnection, prisma);

  // IMPORTANT: Use raw body for signature verification
  // This route must be registered BEFORE express.json() middleware
  router.post(
    '/webhooks/stripe',
    // Raw body is required for Stripe signature verification
    (req, res) => controller.handleWebhook(req, res)
  );

  return { router, controller };
}

// ============================================================================
// Webhook Event Types Export
// ============================================================================

export { WebhookQueueJob, HANDLED_EVENT_TYPES };
