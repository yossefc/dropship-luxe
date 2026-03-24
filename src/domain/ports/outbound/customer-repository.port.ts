import { UUID, PaginationParams, PaginatedResult } from '@shared/types/index.js';
import { Customer } from '@domain/entities/customer.js';
import { Email } from '@domain/value-objects/email.js';

export interface CustomerRepository {
  findById(id: UUID): Promise<Customer | null>;
  findByEmail(email: Email): Promise<Customer | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<Customer | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<Customer>>;
  save(customer: Customer): Promise<void>;
  delete(id: UUID): Promise<void>;
  existsByEmail(email: Email): Promise<boolean>;
  count(): Promise<number>;
}
