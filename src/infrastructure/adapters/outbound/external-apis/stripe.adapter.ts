import Stripe from 'stripe';
import {
  PaymentGateway,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  RefundParams,
  RefundResult,
  CreateCustomerParams,
  WebhookEvent,
} from '@domain/ports/outbound/payment-gateway.port.js';
import { PaymentError } from '@shared/errors/domain-error.js';
import { CircuitBreaker } from '@shared/utils/circuit-breaker.js';
import { withExponentialBackoff } from '@shared/utils/retry.js';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: Stripe.LatestApiVersion;
}

export class StripeAdapter implements PaymentGateway {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion ?? '2023-10-16',
      typescript: true,
    });
    this.webhookSecret = config.webhookSecret;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000,
    });
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    return this.circuitBreaker.execute(async () => {
      return withExponentialBackoff(async () => {
        try {
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: params.amount.toCents(),
            currency: params.amount.currency.toLowerCase(),
            receipt_email: params.customerEmail.value,
            metadata: {
              orderId: params.orderId,
              ...params.metadata,
            },
            automatic_payment_methods: {
              enabled: true,
            },
            ...(params.customerId != null ? { customer: params.customerId } : {}),
          });

          return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret ?? '',
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          };
        } catch (error) {
          if (error instanceof Stripe.errors.StripeError) {
            throw new PaymentError(`Stripe error: ${error.message}`);
          }
          throw error;
        }
      });
    });
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    return this.circuitBreaker.execute(async () => {
      try {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        return {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret ?? '',
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          throw new PaymentError(`Stripe error: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      try {
        await this.stripe.paymentIntents.cancel(paymentIntentId);
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          throw new PaymentError(`Stripe error: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async createRefund(params: RefundParams): Promise<RefundResult> {
    return this.circuitBreaker.execute(async () => {
      return withExponentialBackoff(async () => {
        try {
          const refund = await this.stripe.refunds.create({
            payment_intent: params.paymentIntentId,
            ...(params.amount != null ? { amount: params.amount.toCents() } : {}),
            ...(params.reason != null ? { reason: params.reason } : {}),
          });

          return {
            id: refund.id,
            status: refund.status ?? 'unknown',
            amount: refund.amount,
          };
        } catch (error) {
          if (error instanceof Stripe.errors.StripeError) {
            throw new PaymentError(`Stripe refund error: ${error.message}`);
          }
          throw error;
        }
      });
    });
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      try {
        const customer = await this.stripe.customers.create({
          email: params.email.value,
          name: params.name,
          ...(params.metadata != null ? { metadata: params.metadata } : {}),
        });
        return customer.id;
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          throw new PaymentError(`Stripe error: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async retrieveCustomer(customerId: string): Promise<{ id: string; email: string; name: string }> {
    return this.circuitBreaker.execute(async () => {
      try {
        const customer = await this.stripe.customers.retrieve(customerId);
        if (customer.deleted === true) {
          throw new PaymentError(`Customer ${customerId} has been deleted`);
        }
        return {
          id: customer.id,
          email: customer.email ?? '',
          name: customer.name ?? '',
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          throw new PaymentError(`Stripe error: ${error.message}`);
        }
        throw error;
      }
    });
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data.object as Record<string, unknown>,
        created: event.created,
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        throw new PaymentError(`Webhook signature verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  validateWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }
}
