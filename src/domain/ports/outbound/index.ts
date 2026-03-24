export { type ProductRepository } from './product-repository.port.js';
export { type OrderRepository } from './order-repository.port.js';
export { type CustomerRepository } from './customer-repository.port.js';
export {
  type PaymentGateway,
  type CreatePaymentIntentParams,
  type PaymentIntentResult,
  type RefundParams,
  type RefundResult,
  type CreateCustomerParams,
  type WebhookEvent,
} from './payment-gateway.port.js';
export {
  type SupplierApi,
  type SupplierProduct,
  type SupplierProductVariant,
  type SupplierOrderItem,
  type SupplierOrderResult,
  type SupplierOrderTracking,
  type SearchProductsParams,
} from './supplier-api.port.js';
export {
  type AiContentService,
  type RewriteDescriptionParams,
  type RewriteDescriptionResult,
  type GenerateProductTitleParams,
} from './ai-content.port.js';
export {
  type MessageQueue,
  type QueueJob,
  type JobResult,
  type QueueOptions,
  type JobHandler,
} from './message-queue.port.js';
