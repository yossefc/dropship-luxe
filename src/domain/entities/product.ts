import { UUID, Timestamps } from '@shared/types/index.js';
import { Money } from '@domain/value-objects/money.js';
import { ValidationError } from '@shared/errors/domain-error.js';

export interface ProductProps {
  id: UUID;
  aliexpressId: string;
  sku: string;
  name: string;
  description: string;
  descriptionHtml: string;
  originalDescription: string;
  category: string;
  images: string[];
  supplierPrice: Money;
  sellingPrice: Money;
  stock: number;
  rating: number;
  orderVolume: number;
  supplierId: string;
  supplierName: string;
  shippingTime: { min: number; max: number };
  variants: ProductVariant[];
  isActive: boolean;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: Money;
  stock: number;
  attributes: Record<string, string>;
}

export interface ProductFilterCriteria {
  minRating: number;
  minOrderVolume: number;
  minProfitMargin: number;
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(props: Omit<ProductProps, 'createdAt' | 'updatedAt'>): Product {
    Product.validate(props);
    return new Product({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  private static validate(props: Omit<ProductProps, 'createdAt' | 'updatedAt'>): void {
    if (props.name.trim().length === 0) {
      throw new ValidationError('Product name is required');
    }
    if (props.images.length === 0) {
      throw new ValidationError('At least one product image is required');
    }
    if (props.stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }
    if (props.rating < 0 || props.rating > 5) {
      throw new ValidationError('Rating must be between 0 and 5');
    }
  }

  get id(): UUID { return this.props.id; }
  get aliexpressId(): string { return this.props.aliexpressId; }
  get sku(): string { return this.props.sku; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get descriptionHtml(): string { return this.props.descriptionHtml; }
  get originalDescription(): string { return this.props.originalDescription; }
  get category(): string { return this.props.category; }
  get images(): string[] { return [...this.props.images]; }
  get supplierPrice(): Money { return this.props.supplierPrice; }
  get sellingPrice(): Money { return this.props.sellingPrice; }
  get stock(): number { return this.props.stock; }
  get rating(): number { return this.props.rating; }
  get orderVolume(): number { return this.props.orderVolume; }
  get supplierId(): string { return this.props.supplierId; }
  get supplierName(): string { return this.props.supplierName; }
  get shippingTime(): { min: number; max: number } { return { ...this.props.shippingTime }; }
  get variants(): ProductVariant[] { return [...this.props.variants]; }
  get isActive(): boolean { return this.props.isActive; }
  get lastSyncAt(): Date { return this.props.lastSyncAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  calculateProfitMargin(): number {
    const profit = this.props.sellingPrice.amount - this.props.supplierPrice.amount;
    return profit / this.props.sellingPrice.amount;
  }

  meetsFilterCriteria(criteria: ProductFilterCriteria): boolean {
    return (
      this.props.rating >= criteria.minRating &&
      this.props.orderVolume >= criteria.minOrderVolume &&
      this.calculateProfitMargin() >= criteria.minProfitMargin
    );
  }

  updateStock(newStock: number): void {
    if (newStock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }
    this.props.stock = newStock;
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string, descriptionHtml: string): void {
    this.props.description = description;
    this.props.descriptionHtml = descriptionHtml;
    this.props.updatedAt = new Date();
  }

  updatePrice(supplierPrice: Money, sellingPrice: Money): void {
    if (sellingPrice.isLessThan(supplierPrice)) {
      throw new ValidationError('Selling price cannot be less than supplier price');
    }
    this.props.supplierPrice = supplierPrice;
    this.props.sellingPrice = sellingPrice;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  markSynced(): void {
    this.props.lastSyncAt = new Date();
    this.props.updatedAt = new Date();
  }

  isInStock(): boolean {
    return this.props.stock > 0;
  }

  toJSON(): ProductProps {
    return { ...this.props };
  }
}
