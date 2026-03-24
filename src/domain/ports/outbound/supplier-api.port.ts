import { Money } from '@domain/value-objects/money.js';
import { Address } from '@domain/value-objects/address.js';

export interface SupplierProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  price: Money;
  stock: number;
  rating: number;
  orderVolume: number;
  supplierId: string;
  supplierName: string;
  shippingTime: { min: number; max: number };
  variants: SupplierProductVariant[];
}

export interface SupplierProductVariant {
  id: string;
  name: string;
  sku: string;
  price: Money;
  stock: number;
  attributes: Record<string, string>;
}

export interface SupplierOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface SupplierOrderResult {
  orderId: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

export interface SupplierOrderTracking {
  orderId: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  events: Array<{
    date: Date;
    status: string;
    location?: string;
    description: string;
  }>;
}

export interface SearchProductsParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface SupplierApi {
  searchProducts(params: SearchProductsParams): Promise<SupplierProduct[]>;
  getProduct(productId: string): Promise<SupplierProduct | null>;
  getProductStock(productId: string): Promise<number>;
  getProductPrice(productId: string): Promise<Money>;
  placeOrder(items: SupplierOrderItem[], shippingAddress: Address): Promise<SupplierOrderResult>;
  getOrderStatus(orderId: string): Promise<SupplierOrderResult>;
  getOrderTracking(orderId: string): Promise<SupplierOrderTracking>;
  cancelOrder(orderId: string): Promise<boolean>;
}
