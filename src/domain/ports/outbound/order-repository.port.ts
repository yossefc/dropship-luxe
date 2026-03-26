import { UUID, PaginationParams, PaginatedResult, OrderStatus } from '@shared/types/index.js';
import { Order } from '@domain/entities/order.js';

export interface OrderRepository {
  findById(id: UUID): Promise<Order | null>;
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
  findByCustomerId(customerId: UUID, pagination: PaginationParams): Promise<PaginatedResult<Order>>;
  findByStatus(status: OrderStatus, pagination: PaginationParams): Promise<PaginatedResult<Order>>;
  findByHypTransactionId(transactionId: string): Promise<Order | null>;
  findPendingOrders(): Promise<Order[]>;
  findOrdersToProcess(): Promise<Order[]>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<Order>>;
  save(order: Order): Promise<void>;
  delete(id: UUID): Promise<void>;
  generateOrderNumber(): Promise<string>;
  countByStatus(): Promise<Map<OrderStatus, number>>;
  getTotalRevenue(startDate: Date, endDate: Date): Promise<number>;
}
