import { UUID, PaginationParams, PaginatedResult } from '@shared/types/index.js';
import { Product, ProductFilterCriteria } from '@domain/entities/product.js';

export interface ProductRepository {
  findById(id: UUID): Promise<Product | null>;
  findByAliexpressId(aliexpressId: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<Product>>;
  findActive(pagination: PaginationParams): Promise<PaginatedResult<Product>>;
  findByCategory(category: string, pagination: PaginationParams): Promise<PaginatedResult<Product>>;
  search(query: string, pagination: PaginationParams): Promise<PaginatedResult<Product>>;
  findOutOfStock(): Promise<Product[]>;
  findNeedingSync(olderThan: Date): Promise<Product[]>;
  save(product: Product): Promise<void>;
  saveMany(products: Product[]): Promise<void>;
  delete(id: UUID): Promise<void>;
  countByCategory(): Promise<Map<string, number>>;
  existsByAliexpressId(aliexpressId: string): Promise<boolean>;
}
