// ============================================================================
// Order Controller - API Endpoints for Order Management
// ============================================================================
// Handles order creation, retrieval, and management.
// Integrates with Hyp payment gateway for checkout flow.
// ============================================================================

import { Request, Response, Router } from 'express';
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { HypAdapter } from '@infrastructure/adapters/outbound/payment/hyp.adapter.js';
import { Logger } from '@infrastructure/config/logger.js';
import { Email } from '@domain/value-objects/email.js';
import { Money } from '@domain/value-objects/money.js';
import { Currency } from '@shared/types/index.js';

// ============================================================================
// Types
// ============================================================================

interface CreateOrderRequest {
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    apartment?: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    color?: string;
    size?: string;
  }>;
  shippingMethod: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  currency: string;
}

// ============================================================================
// Order Controller Class
// ============================================================================

export class OrderController {
  private readonly prisma: PrismaClient;
  private readonly hypAdapter: HypAdapter;
  private readonly logger: Logger;

  constructor(
    prisma: PrismaClient,
    hypAdapter: HypAdapter,
    logger: Logger
  ) {
    this.prisma = prisma;
    this.hypAdapter = hypAdapter;
    this.logger = logger.child({ controller: 'OrderController' });
  }

  // ============================================================================
  // POST /api/v1/orders - Create Order and Get Payment URL
  // ============================================================================

  async createOrder(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateOrderRequest;

    this.logger.info('Creating order', {
      customerEmail: data.customer.email,
      itemCount: data.items.length,
      total: data.total,
      currency: data.currency,
    });

    try {
      // 1. Validate request data
      this.validateOrderRequest(data);

      // 2. Find or create customer
      const customer = await this.findOrCreateCustomer(data.customer);

      // 3. Generate unique order number
      const orderNumber = this.generateOrderNumber();

      // 4. Create order with items
      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerEmail: data.customer.email,

          // Shipping Address
          shippingFirstName: data.shippingAddress.firstName,
          shippingLastName: data.shippingAddress.lastName,
          shippingStreet: data.shippingAddress.apartment
            ? `${data.shippingAddress.street}, ${data.shippingAddress.apartment}`
            : data.shippingAddress.street,
          shippingCity: data.shippingAddress.city,
          shippingPostalCode: data.shippingAddress.postalCode,
          shippingCountry: data.shippingAddress.country,
          shippingPhone: data.shippingAddress.phone,

          // Billing Address (same as shipping for now)
          billingFirstName: data.shippingAddress.firstName,
          billingLastName: data.shippingAddress.lastName,
          billingStreet: data.shippingAddress.apartment
            ? `${data.shippingAddress.street}, ${data.shippingAddress.apartment}`
            : data.shippingAddress.street,
          billingCity: data.shippingAddress.city,
          billingPostalCode: data.shippingAddress.postalCode,
          billingCountry: data.shippingAddress.country,
          billingPhone: data.shippingAddress.phone,

          // Amounts
          subtotal: data.subtotal,
          shippingCost: data.shippingCost,
          tax: 0, // Tax calculated separately if needed
          total: data.total,
          currency: data.currency || 'EUR',

          // Status
          status: OrderStatus.pending,
          paymentStatus: PaymentStatus.pending,

          // Notes
          notes: `Shipping method: ${data.shippingMethod}`,

          // Create order items
          items: {
            create: await Promise.all(data.items.map(async (item) => {
              // Get product details
              const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: { sku: true, costPrice: true },
              });

              return {
                productId: item.productId,
                productName: item.name,
                sku: product?.sku || `SKU-${item.productId.substring(0, 8)}`,
                quantity: item.quantity,
                unitPrice: item.price,
                supplierPrice: product?.costPrice || item.price * 0.4, // Fallback to 40% margin
                currency: data.currency || 'EUR',
                variantName: [item.color, item.size].filter(Boolean).join(' / ') || null,
              };
            })),
          },
        },
        include: {
          items: true,
        },
      });

      this.logger.info('Order created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemCount: order.items.length,
      });

      // 5. Create payment intent via Hyp
      const currency = (data.currency || 'EUR') as Currency;
      const paymentIntent = await this.hypAdapter.createPaymentIntent({
        orderId: order.orderNumber,
        amount: Money.create(data.total, currency),
        customerId: customer.paymentCustomerId || customer.id,
        customerEmail: Email.create(data.customer.email),
        metadata: {
          orderNumber: order.orderNumber,
          customerId: customer.id,
          shippingMethod: data.shippingMethod,
        },
      });

      this.logger.info('Payment intent created', {
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
      });

      // 6. Return payment URL to frontend
      res.status(201).json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentUrl: paymentIntent.clientSecret, // This is the Hyp payment page URL
        paymentIntentId: paymentIntent.id,
      });

    } catch (error) {
      this.logger.error('Failed to create order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      const statusCode = error instanceof ValidationError ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  }

  // ============================================================================
  // GET /api/v1/orders/:orderNumber - Get Order by Number
  // ============================================================================

  async getOrder(req: Request, res: Response): Promise<void> {
    const { orderNumber } = req.params;

    try {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: {
            include: {
              product: {
                select: {
                  images: true,
                  translations: {
                    where: { locale: 'fr' },
                    take: 1,
                  },
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal.toNumber(),
          shippingCost: order.shippingCost.toNumber(),
          tax: order.tax.toNumber(),
          total: order.total.toNumber(),
          currency: order.currency,
          items: order.items.map(item => ({
            id: item.id,
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice.toNumber(),
            image: item.product.images[0],
            variant: item.variantName,
          })),
          shippingAddress: {
            firstName: order.shippingFirstName,
            lastName: order.shippingLastName,
            street: order.shippingStreet,
            city: order.shippingCity,
            postalCode: order.shippingPostalCode,
            country: order.shippingCountry,
          },
          trackingNumbers: order.trackingNumbers,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          shippedAt: order.shippedAt,
        },
      });

    } catch (error) {
      this.logger.error('Failed to get order', {
        orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve order',
      });
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateOrderRequest(data: CreateOrderRequest): void {
    if (!data.customer?.email) {
      throw new ValidationError('Customer email is required');
    }

    if (!data.customer.email.includes('@')) {
      throw new ValidationError('Invalid customer email');
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    if (!data.shippingAddress?.street || !data.shippingAddress?.city) {
      throw new ValidationError('Shipping address is required');
    }

    if (data.total <= 0) {
      throw new ValidationError('Order total must be positive');
    }
  }

  private async findOrCreateCustomer(customerData: CreateOrderRequest['customer']) {
    // Try to find existing customer by email
    let customer = await this.prisma.customer.findUnique({
      where: { email: customerData.email.toLowerCase() },
    });

    if (!customer) {
      // Create new customer
      customer = await this.prisma.customer.create({
        data: {
          email: customerData.email.toLowerCase(),
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
        },
      });

      this.logger.info('Customer created', {
        customerId: customer.id,
        email: customer.email,
      });
    }

    return customer;
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HY-${timestamp}-${random}`;
  }
}

// ============================================================================
// Validation Error
// ============================================================================

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Express Router Factory
// ============================================================================

export function createOrderRouter(
  prisma: PrismaClient,
  hypAdapter: HypAdapter,
  logger: Logger
): Router {
  const router = Router();
  const controller = new OrderController(prisma, hypAdapter, logger);

  // Create order and get payment URL
  router.post('/', (req, res) => controller.createOrder(req, res));

  // Get order by order number
  router.get('/:orderNumber', (req, res) => controller.getOrder(req, res));

  return router;
}
