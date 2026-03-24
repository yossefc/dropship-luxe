// ============================================================================
// AliExpress Port - Interface for supplier integration
// ============================================================================

export interface AliExpressProductData {
  productId: string;
  title: string;
  description: string;
  descriptionHtml: string;
  images: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  stock: number;
  rating: number;
  reviewCount: number;
  orderCount: number;
  supplierId: string;
  supplierName: string;
  supplierRating: number;
  shippingInfo: ShippingInfo;
  weight: number; // in kg
  dimensions: ProductDimensions;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductVariant {
  skuId: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image?: string;
}

export interface ShippingInfo {
  methods: ShippingMethod[];
  minDays: number;
  maxDays: number;
  defaultCost: number;
  freeShippingAvailable: boolean;
}

export interface ShippingMethod {
  name: string;
  cost: number;
  minDays: number;
  maxDays: number;
  trackable: boolean;
}

export interface ProductDimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface ShippingCostParams {
  productId: string;
  quantity: number;
  countryCode: string; // ISO 3166-1 alpha-2 (e.g., 'FR', 'ES', 'IT')
}

export interface ShippingCostResult {
  shippingCost: number;
  currency: string;
  estimatedDays: {
    min: number;
    max: number;
  };
  carrier: string;
  trackable: boolean;
}

export interface AliExpressService {
  /**
   * Fetch detailed product information
   */
  getProductDetails(productId: string): Promise<AliExpressProductData>;

  /**
   * Calculate shipping costs for a specific country
   */
  calculateShippingCost(params: ShippingCostParams): Promise<ShippingCostResult>;

  /**
   * Search products by keyword and filters
   */
  searchProducts(params: {
    keywords: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{
    products: AliExpressProductData[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }>;

  /**
   * Refresh access token when expired
   */
  refreshAccessToken(): Promise<string>;

  /**
   * Check product availability and current stock
   */
  checkProductAvailability(productId: string): Promise<{
    available: boolean;
    stock: number;
    price: number;
  }>;
}
