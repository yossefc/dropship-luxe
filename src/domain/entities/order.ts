import { UUID, OrderStatus, PaymentStatus } from '@shared/types/index.js';
import { Money } from '@domain/value-objects/money.js';
import { Address } from '@domain/value-objects/address.js';
import { Email } from '@domain/value-objects/email.js';
import { ValidationError } from '@shared/errors/domain-error.js';

export interface OrderLineItem {
  productId: UUID;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  supplierPrice: Money;
  variantId?: string;
  variantName?: string;
}

export interface OrderProps {
  id: UUID;
  orderNumber: string;
  customerId: UUID;
  customerEmail: Email;
  shippingAddress: Address;
  billingAddress: Address;
  items: OrderLineItem[];
  subtotal: Money;
  shippingCost: Money;
  tax: Money;
  total: Money;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  aliexpressOrderIds: string[];
  trackingNumbers: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export class Order {
  private constructor(private props: OrderProps) {}

  static create(props: Omit<OrderProps, 'createdAt' | 'updatedAt' | 'status' | 'paymentStatus' | 'aliexpressOrderIds' | 'trackingNumbers'>): Order {
    if (props.items.length === 0) {
      throw new ValidationError('Order must have at least one item');
    }

    return new Order({
      ...props,
      status: 'pending',
      paymentStatus: 'pending',
      aliexpressOrderIds: [],
      trackingNumbers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: OrderProps): Order {
    return new Order(props);
  }

  get id(): UUID { return this.props.id; }
  get orderNumber(): string { return this.props.orderNumber; }
  get customerId(): UUID { return this.props.customerId; }
  get customerEmail(): Email { return this.props.customerEmail; }
  get shippingAddress(): Address { return this.props.shippingAddress; }
  get billingAddress(): Address { return this.props.billingAddress; }
  get items(): OrderLineItem[] { return [...this.props.items]; }
  get subtotal(): Money { return this.props.subtotal; }
  get shippingCost(): Money { return this.props.shippingCost; }
  get tax(): Money { return this.props.tax; }
  get total(): Money { return this.props.total; }
  get status(): OrderStatus { return this.props.status; }
  get paymentStatus(): PaymentStatus { return this.props.paymentStatus; }
  get stripePaymentIntentId(): string | undefined { return this.props.stripePaymentIntentId; }
  get aliexpressOrderIds(): string[] { return [...this.props.aliexpressOrderIds]; }
  get trackingNumbers(): string[] { return [...this.props.trackingNumbers]; }
  get notes(): string | undefined { return this.props.notes; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get paidAt(): Date | undefined { return this.props.paidAt; }
  get shippedAt(): Date | undefined { return this.props.shippedAt; }
  get deliveredAt(): Date | undefined { return this.props.deliveredAt; }

  calculateProfit(): Money {
    let totalSupplierCost = Money.zero(this.props.total.currency);
    for (const item of this.props.items) {
      totalSupplierCost = totalSupplierCost.add(item.supplierPrice.multiply(item.quantity));
    }
    return this.props.subtotal.subtract(totalSupplierCost);
  }

  setPaymentIntent(paymentIntentId: string): void {
    this.props.stripePaymentIntentId = paymentIntentId;
    this.props.paymentStatus = 'processing';
    this.props.updatedAt = new Date();
  }

  markAsPaid(): void {
    if (this.props.paymentStatus === 'succeeded') {
      return;
    }
    this.props.paymentStatus = 'succeeded';
    this.props.status = 'paid';
    this.props.paidAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsProcessing(): void {
    if (this.props.status !== 'paid') {
      throw new ValidationError('Order must be paid before processing');
    }
    this.props.status = 'processing';
    this.props.updatedAt = new Date();
  }

  addAliexpressOrderId(orderId: string): void {
    if (!this.props.aliexpressOrderIds.includes(orderId)) {
      this.props.aliexpressOrderIds.push(orderId);
      this.props.updatedAt = new Date();
    }
  }

  addTrackingNumber(trackingNumber: string): void {
    if (!this.props.trackingNumbers.includes(trackingNumber)) {
      this.props.trackingNumbers.push(trackingNumber);
      this.props.updatedAt = new Date();
    }
  }

  markAsShipped(): void {
    if (this.props.status !== 'processing') {
      throw new ValidationError('Order must be processing before shipping');
    }
    this.props.status = 'shipped';
    this.props.shippedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsDelivered(): void {
    if (this.props.status !== 'shipped') {
      throw new ValidationError('Order must be shipped before delivery');
    }
    this.props.status = 'delivered';
    this.props.deliveredAt = new Date();
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status === 'delivered') {
      throw new ValidationError('Delivered orders cannot be cancelled');
    }
    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();
  }

  refund(): void {
    if (this.props.paymentStatus !== 'succeeded') {
      throw new ValidationError('Only paid orders can be refunded');
    }
    this.props.status = 'refunded';
    this.props.paymentStatus = 'refunded';
    this.props.updatedAt = new Date();
  }

  canBeCancelled(): boolean {
    return ['pending', 'paid', 'processing'].includes(this.props.status);
  }

  canBeRefunded(): boolean {
    return this.props.paymentStatus === 'succeeded' && this.props.status !== 'refunded';
  }

  toJSON(): OrderProps {
    return { ...this.props };
  }
}
