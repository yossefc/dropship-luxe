import { Request, Response, Router } from 'express';
import { PaymentGateway, WebhookEvent } from '@domain/ports/outbound/payment-gateway.port.js';
import { OrderRepository } from '@domain/ports/outbound/order-repository.port.js';
import { MessageQueue } from '@domain/ports/outbound/message-queue.port.js';
import { Logger, AuditLogger } from '@infrastructure/config/logger.js';
import { PaymentError } from '@shared/errors/domain-error.js';

export interface StripeWebhookDependencies {
  paymentGateway: PaymentGateway;
  orderRepository: OrderRepository;
  messageQueue: MessageQueue;
  logger: Logger;
  auditLogger: AuditLogger;
}

export function createStripeWebhookRouter(deps: StripeWebhookDependencies): Router {
  const router = Router();
  const logger = deps.logger.child({ webhook: 'stripe' });

  router.post(
    '/stripe',
    async (req: Request, res: Response): Promise<void> => {
      const signature = req.headers['stripe-signature'];
      const userAgent = req.get('user-agent');

      if (typeof signature !== 'string') {
        logger.warn('Missing Stripe signature header');
        deps.auditLogger.logSecurityEvent({
          event: 'stripe_signature_missing',
          severity: 'high',
          ...(req.ip != null ? { ip: req.ip } : {}),
          details: {
            path: req.path,
            requestId: req.requestId,
            userAgent,
          },
        });
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      let event: WebhookEvent;

      try {
        event = deps.paymentGateway.constructWebhookEvent(req.body as Buffer, signature);
      } catch (error) {
        logger.error('Webhook signature verification failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        deps.auditLogger.logSecurityEvent({
          event: 'stripe_signature_verification_failed',
          severity: 'critical',
          ...(req.ip != null ? { ip: req.ip } : {}),
          details: {
            path: req.path,
            requestId: req.requestId,
            userAgent,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      logger.info('Received Stripe webhook', { eventType: event.type, eventId: event.id });

      try {
        switch (event.type) {
          case 'payment_intent.succeeded':
            await handlePaymentIntentSucceeded(event, deps);
            break;

          case 'payment_intent.payment_failed':
            await handlePaymentIntentFailed(event, deps);
            break;

          case 'charge.refunded':
            await handleChargeRefunded(event, deps);
            break;

          case 'charge.dispute.created':
            await handleDisputeCreated(event, deps);
            break;

          default:
            logger.info(`Unhandled event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
      } catch (error) {
        logger.error('Error processing webhook', {
          eventType: event.type,
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        res.status(500).json({ error: 'Webhook processing failed' });
      }
    }
  );

  return router;
}

async function handlePaymentIntentSucceeded(
  event: WebhookEvent,
  deps: StripeWebhookDependencies
): Promise<void> {
  const paymentIntent = event.data as { id: string; metadata?: { orderId?: string }; amount: number; currency: string };
  const orderId = paymentIntent.metadata?.orderId;

  if (orderId == null) {
    deps.logger.warn('Payment intent without orderId', { paymentIntentId: paymentIntent.id });
    return;
  }

  const order = await deps.orderRepository.findById(orderId);
  if (order == null) {
    throw new PaymentError(`Order ${orderId} not found`);
  }

  order.markAsPaid();
  await deps.orderRepository.save(order);

  deps.auditLogger.logPayment({
    orderId: order.id,
    customerId: order.customerId,
    action: 'payment_succeeded',
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    paymentIntentId: paymentIntent.id,
    success: true,
  });

  await deps.messageQueue.addJob('orders', 'process_order', {
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
  });

  deps.logger.info('Payment succeeded, order queued for processing', {
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
  });
}

async function handlePaymentIntentFailed(
  event: WebhookEvent,
  deps: StripeWebhookDependencies
): Promise<void> {
  const paymentIntent = event.data as {
    id: string;
    metadata?: { orderId?: string };
    last_payment_error?: { message?: string };
    amount: number;
    currency: string;
  };
  const orderId = paymentIntent.metadata?.orderId;

  if (orderId == null) {
    return;
  }

  const order = await deps.orderRepository.findByStripePaymentIntentId(paymentIntent.id);
  if (order == null) {
    return;
  }

  deps.auditLogger.logPayment({
    orderId: order.id,
    customerId: order.customerId,
    action: 'payment_failed',
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    paymentIntentId: paymentIntent.id,
    success: false,
    ...(paymentIntent.last_payment_error?.message != null
      ? { error: paymentIntent.last_payment_error.message }
      : {}),
  });

  deps.logger.warn('Payment failed', {
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });
}

async function handleChargeRefunded(
  event: WebhookEvent,
  deps: StripeWebhookDependencies
): Promise<void> {
  const charge = event.data as {
    payment_intent: string;
    amount_refunded: number;
    currency: string;
  };

  const order = await deps.orderRepository.findByStripePaymentIntentId(charge.payment_intent);
  if (order == null) {
    return;
  }

  order.refund();
  await deps.orderRepository.save(order);

  deps.auditLogger.logPayment({
    orderId: order.id,
    customerId: order.customerId,
    action: 'refund_processed',
    amount: charge.amount_refunded / 100,
    currency: charge.currency,
    paymentIntentId: charge.payment_intent,
    success: true,
  });

  deps.logger.info('Refund processed', {
    orderId: order.id,
    amount: charge.amount_refunded / 100,
  });
}

async function handleDisputeCreated(
  event: WebhookEvent,
  deps: StripeWebhookDependencies
): Promise<void> {
  const dispute = event.data as {
    id: string;
    payment_intent: string;
    amount: number;
    reason: string;
  };

  deps.auditLogger.logSecurityEvent({
    event: 'payment_dispute_created',
    severity: 'high',
    details: {
      disputeId: dispute.id,
      paymentIntentId: dispute.payment_intent,
      amount: dispute.amount / 100,
      reason: dispute.reason,
    },
  });

  deps.logger.warn('Payment dispute created', {
    disputeId: dispute.id,
    paymentIntentId: dispute.payment_intent,
    reason: dispute.reason,
  });
}
