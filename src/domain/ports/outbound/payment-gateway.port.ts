import { Money } from '@domain/value-objects/money.js';
import { Email } from '@domain/value-objects/email.js';

export interface CreatePaymentIntentParams {
  amount: Money;
  customerId?: string;
  customerEmail: Email;
  orderId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: Money;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export interface RefundResult {
  id: string;
  status: string;
  amount: number;
}

export interface CreateCustomerParams {
  email: Email;
  name: string;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created: number;
}

export interface PaymentGateway {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult>;
  cancelPaymentIntent(paymentIntentId: string): Promise<void>;
  createRefund(params: RefundParams): Promise<RefundResult>;
  createCustomer(params: CreateCustomerParams): Promise<string>;
  retrieveCustomer(customerId: string): Promise<{ id: string; email: string; name: string }>;
  constructWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent;
  validateWebhookSignature(payload: string | Buffer, signature: string): boolean;
}
