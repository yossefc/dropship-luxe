import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  SupplierApi,
  SupplierProduct,
  SupplierProductVariant,
  SupplierOrderItem,
  SupplierOrderResult,
  SupplierOrderTracking,
  SearchProductsParams,
} from '@domain/ports/outbound/supplier-api.port.js';
import {
  AliExpressService,
  AliExpressProductData,
  ShippingCostParams,
  ShippingCostResult,
  ProductAttribute,
  ProductVariant,
  ShippingMethod,
} from '@domain/ports/outbound/aliexpress.port.js';
import { Money } from '@domain/value-objects/money.js';
import { Address } from '@domain/value-objects/address.js';
import { CircuitBreaker } from '@shared/utils/circuit-breaker.js';
import { withExponentialBackoff } from '@shared/utils/retry.js';
import { CryptoService } from '@shared/utils/crypto.js';
import { ExternalServiceError } from '@shared/errors/domain-error.js';
import {
  ProductScoreCalculator,
  ProductScoreInput,
  ProductScoreResult,
} from '@domain/services/product-score-calculator.js';

// ============================================================================
// Beauty & Cosmetics Category Filtering (STRICT)
// ============================================================================

/**
 * AliExpress Beauty & Health main category ID
 * Sub-categories: 3001 (Makeup), 3002 (Skin Care), 3003 (Hair Care), 3004 (Nail Art)
 */
const BEAUTY_HEALTH_CATEGORY_ID = '66';

const ALLOWED_COSMETIC_CATEGORY_IDS = [
  '66',    // Beauty & Health (main)
  '3001',  // Makeup
  '3002',  // Skin Care
  '3003',  // Hair Care
  '3004',  // Nail Art
  '3005',  // Beauty Tools
  '3006',  // Fragrances
  '100003109', // Health & Beauty (alternative ID)
];

/**
 * Keywords that MUST be present in product title or category for validation
 * Products without any of these keywords will be REJECTED
 */
const COSMETIC_VALIDATION_KEYWORDS = [
  // Skincare
  'serum', 'cream', 'moisturizer', 'cleanser', 'toner', 'mask', 'lotion',
  'sunscreen', 'spf', 'skincare', 'face', 'facial', 'eye cream', 'lip',
  'hyaluronic', 'vitamin c', 'retinol', 'collagen', 'anti-aging',
  // Makeup
  'lipstick', 'lip gloss', 'mascara', 'eyeliner', 'eyeshadow', 'foundation',
  'blush', 'concealer', 'primer', 'powder', 'highlighter', 'contour',
  'brow', 'makeup', 'cosmetic', 'beauty',
  // Hair
  'hair', 'shampoo', 'conditioner', 'hair mask', 'hair oil', 'hair serum',
  // Nails
  'nail', 'polish', 'gel nail', 'manicure', 'pedicure',
  // Tools
  'brush', 'sponge', 'blender', 'roller', 'gua sha', 'mirror',
  'organizer', 'curler', 'tweezers',
  // Body
  'body lotion', 'body cream', 'body scrub', 'shower', 'bath',
  'hand cream', 'foot cream',
  // Fragrance
  'perfume', 'fragrance', 'cologne', 'body mist', 'eau de',
];

/**
 * Keywords that indicate NON-cosmetic products - REJECT these
 */
const FORBIDDEN_PRODUCT_KEYWORDS = [
  'phone', 'case', 'cable', 'charger', 'electronic', 'gadget',
  'toy', 'game', 'tool', 'hardware', 'car', 'auto', 'motor',
  'sport', 'fitness', 'gym', 'outdoor', 'camping',
  'kitchen', 'cooking', 'food', 'drink',
  'clothing', 'shirt', 'pants', 'dress', 'shoe', 'bag',
  'jewelry', 'watch', 'ring', 'necklace', 'bracelet', 'earring',
  'home', 'furniture', 'decor', 'garden',
  'pet', 'dog', 'cat', 'animal',
  'baby', 'kid', 'child', 'infant',
  'office', 'stationery', 'book',
];

/**
 * Validates if a product belongs to the beauty/cosmetics niche
 * @returns { valid: boolean, reason: string }
 */
export function validateCosmeticProduct(
  title: string,
  categoryId: string,
  categoryName: string
): { valid: boolean; reason: string } {
  const titleLower = title.toLowerCase();
  const categoryLower = categoryName.toLowerCase();

  // Check for forbidden keywords first (strict rejection)
  for (const forbidden of FORBIDDEN_PRODUCT_KEYWORDS) {
    if (titleLower.includes(forbidden)) {
      return {
        valid: false,
        reason: `Produit rejeté: contient le mot-clé interdit "${forbidden}"`,
      };
    }
  }

  // Check if category is in allowed list
  const categoryValid = ALLOWED_COSMETIC_CATEGORY_IDS.includes(categoryId);

  // Check if title or category contains cosmetic keywords
  const hasValidKeyword = COSMETIC_VALIDATION_KEYWORDS.some(
    keyword => titleLower.includes(keyword) || categoryLower.includes(keyword)
  );

  if (!categoryValid && !hasValidKeyword) {
    return {
      valid: false,
      reason: `Produit rejeté: catégorie "${categoryName}" (${categoryId}) non autorisée et aucun mot-clé cosmétique trouvé`,
    };
  }

  if (!hasValidKeyword) {
    return {
      valid: false,
      reason: `Produit rejeté: aucun mot-clé cosmétique/beauté trouvé dans le titre`,
    };
  }

  return { valid: true, reason: 'Produit validé pour la niche cosmétique' };
}

export interface AliExpressConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  trackingId: string;
  baseUrl?: string;
  getAccessToken?: () => Promise<string>;
}

interface AliExpressApiResponse<T> {
  aliexpress_affiliate_product_query_response?: {
    resp_result?: {
      resp_code: number;
      resp_msg: string;
      result?: T;
    };
  };
  error_response?: {
    code: string;
    msg: string;
    sub_code?: string;
    sub_msg?: string;
  };
  [key: string]: unknown;
}

interface AliExpressMerchantProfile {
  country_code?: string;
  product_posting_forbidden?: boolean;
  merchant_login_id?: string;
  shop_id?: number;
  shop_name?: string;
  shop_type?: string;
  shop_url?: string;
}

// Note: This class implements SupplierApi. For AliExpressService functionality,
// use the searchProductsDetailed, getProductDetails, and other explicit methods.
export class AliExpressAdapter implements SupplierApi {
  private readonly client: AxiosInstance;
  private readonly config: AliExpressConfig;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly scoreCalculator: ProductScoreCalculator;

  constructor(config: AliExpressConfig) {
    this.config = config;
    this.scoreCalculator = new ProductScoreCalculator();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000,
    });

    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://eco.taobao.com/router/rest',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  private generateSignature(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map((key) => `${key}${params[key]}`)
      .join('');

    return crypto
      .createHmac('md5', this.config.appSecret)
      .update(signString, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  private requiresSellerAccessToken(method: string): boolean {
    return [
      'aliexpress.trade.buy.placeorder',
      'aliexpress.trade.order.get',
      'aliexpress.logistics.tracking.query',
      'aliexpress.trade.order.cancel',
    ].includes(method);
  }

  private async resolveAccessToken(): Promise<string> {
    if (this.config.getAccessToken) {
      return this.config.getAccessToken();
    }

    if (this.config.accessToken.trim().length > 0) {
      return this.config.accessToken;
    }

    throw new ExternalServiceError(
      'AliExpress',
      'Missing seller access token. Complete OAuth authorization first.'
    );
  }

  private async buildRequestParams(method: string, bizParams: Record<string, unknown>): Promise<Record<string, string>> {
    const timestamp = this.formatTopTimestamp(new Date());
    const params: Record<string, string> = {
      app_key: this.config.appKey,
      method,
      timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'hmac',
    };

    for (const [key, value] of Object.entries(bizParams)) {
      if (value !== undefined && value !== null) {
        params[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    if (this.requiresSellerAccessToken(method)) {
      params['session'] = await this.resolveAccessToken();
    }

    params['sign'] = this.generateSignature(params);
    return params;
  }

  private formatTopTimestamp(date: Date): string {
    const gmtPlus8 = new Date(date.getTime() + (8 * 60 + date.getTimezoneOffset()) * 60 * 1000);
    const year = gmtPlus8.getUTCFullYear();
    const month = `${gmtPlus8.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${gmtPlus8.getUTCDate()}`.padStart(2, '0');
    const hours = `${gmtPlus8.getUTCHours()}`.padStart(2, '0');
    const minutes = `${gmtPlus8.getUTCMinutes()}`.padStart(2, '0');
    const seconds = `${gmtPlus8.getUTCSeconds()}`.padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private async executeRequest<T>(
    method: string,
    bizParams: Record<string, unknown>
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return withExponentialBackoff(async () => {
        const params = await this.buildRequestParams(method, bizParams);
        const response = await this.client.post<AliExpressApiResponse<T>>(
          '',
          new URLSearchParams(params).toString()
        );

        if (response.data.error_response != null) {
          throw new ExternalServiceError(
            'AliExpress',
            `${response.data.error_response.code}: ${response.data.error_response.sub_msg ?? response.data.error_response.msg}`
          );
        }

        const respResult = response.data.aliexpress_affiliate_product_query_response?.resp_result;
        if (respResult != null) {
          if (respResult.resp_code !== 200) {
            throw new ExternalServiceError(
              'AliExpress',
              respResult.resp_msg ?? 'Unknown error'
            );
          }

          return respResult.result as T;
        }

        const responseKey = `${method.replace(/\./g, '_')}_response`;
        const topResponse = response.data[responseKey];
        if (topResponse != null) {
          return topResponse as T;
        }

        throw new ExternalServiceError('AliExpress', `Unexpected response shape for method ${method}`);
      });
    });
  }

  async getMerchantProfile(): Promise<AliExpressMerchantProfile> {
    return this.executeRequest<AliExpressMerchantProfile>(
      'aliexpress.solution.merchant.profile.get',
      {}
    );
  }

  async searchProducts(params: SearchProductsParams): Promise<SupplierProduct[]> {
    interface ProductListResult {
      products?: {
        product?: AliExpressProduct[];
      };
      total_record_count?: number;
    }

    const result = await this.executeRequest<ProductListResult>(
      'aliexpress.affiliate.product.query',
      {
        keywords: params.query,
        category_ids: params.category,
        min_sale_price: params.minPrice ? params.minPrice * 100 : undefined,
        max_sale_price: params.maxPrice ? params.maxPrice * 100 : undefined,
        page_no: params.page ?? 1,
        page_size: params.limit ?? 50,
        target_currency: 'EUR',
        target_language: 'FR',
        tracking_id: this.config.trackingId,
        sort: 'SALE_PRICE_ASC',
      }
    );

    const products = result.products?.product ?? [];
    return products.map((p) => this.mapToSupplierProduct(p));
  }

  async getProduct(productId: string): Promise<SupplierProduct | null> {
    try {
      interface ProductDetailResult {
        products?: {
          product?: AliExpressProduct[];
        };
      }

      const result = await this.executeRequest<ProductDetailResult>(
        'aliexpress.affiliate.product.query',
        {
          product_ids: productId,
          target_currency: 'EUR',
          target_language: 'FR',
          tracking_id: this.config.trackingId,
        }
      );

      const product = result.products?.product?.[0];
      if (product == null) return null;

      return this.mapToSupplierProduct(product);
    } catch {
      return null;
    }
  }

  async getProductStock(productId: string): Promise<number> {
    const product = await this.getProduct(productId);
    return product?.stock ?? 0;
  }

  async getProductPrice(productId: string): Promise<Money> {
    const product = await this.getProduct(productId);
    if (product == null) {
      throw new ExternalServiceError('AliExpress', `Product ${productId} not found`);
    }
    return product.price;
  }

  async placeOrder(
    items: SupplierOrderItem[],
    shippingAddress: Address
  ): Promise<SupplierOrderResult> {
    interface OrderResult {
      order_id: string;
      order_status: string;
    }

    const result = await this.executeRequest<OrderResult>(
      'aliexpress.trade.buy.placeorder',
      {
        product_items: items.map((item) => ({
          product_id: item.productId,
          sku_id: item.variantId,
          quantity: item.quantity,
        })),
        logistics_address: {
          contact_person: shippingAddress.fullName,
          address: shippingAddress.street,
          city: shippingAddress.city,
          zip: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone_number: shippingAddress.phone ?? '',
        },
      }
    );

    return {
      orderId: result.order_id,
      status: result.order_status,
    };
  }

  async getOrderStatus(orderId: string): Promise<SupplierOrderResult> {
    interface OrderStatusResult {
      order_id: string;
      order_status: string;
      tracking_id?: string;
    }

    const result = await this.executeRequest<OrderStatusResult>(
      'aliexpress.trade.order.get',
      { order_id: orderId }
    );

    return {
      orderId: result.order_id,
      status: result.order_status,
      ...(result.tracking_id != null ? { trackingNumber: result.tracking_id } : {}),
    };
  }

  async getOrderTracking(orderId: string): Promise<SupplierOrderTracking> {
    interface TrackingResult {
      order_id: string;
      tracking_id: string;
      logistics_info_list?: Array<{
        event_date: string;
        event_desc: string;
        address?: string;
      }>;
    }

    const result = await this.executeRequest<TrackingResult>(
      'aliexpress.logistics.tracking.query',
      { order_id: orderId }
    );

    return {
      orderId: result.order_id,
      status: 'in_transit',
      trackingNumber: result.tracking_id,
      events: (result.logistics_info_list ?? []).map((e) => ({
        date: new Date(e.event_date),
        status: 'update',
        ...(e.address != null ? { location: e.address } : {}),
        description: e.event_desc,
      })),
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.executeRequest('aliexpress.trade.order.cancel', {
        order_id: orderId,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // AliExpressService Implementation
  // ============================================================================

  /**
   * Fetch detailed product information with all attributes
   */
  async getProductDetails(productId: string): Promise<AliExpressProductData> {
    interface DetailedProductResult {
      product?: AliExpressDetailedProduct;
    }

    const result = await this.executeRequest<DetailedProductResult>(
      'aliexpress.affiliate.product.detail.get',
      {
        product_id: productId,
        target_currency: 'EUR',
        target_language: 'EN',
        tracking_id: this.config.trackingId,
        fields: 'productId,productTitle,productUrl,imageUrl,originalPrice,salePrice,discount,shippingInfo,itemWeight,itemUnit,categoryName,categoryId,sellerId,sellerName,sellerRating,reviewCount,orderCount,productMainImageUrl,productSmallImageUrls,productVideoUrl,skuAvailableStock,productProperties,htmlDescription',
      }
    );

    if (!result.product) {
      throw new ExternalServiceError('AliExpress', `Product ${productId} not found`);
    }

    return this.mapToAliExpressProductData(result.product);
  }

  /**
   * Calculate shipping costs for a specific country
   */
  async calculateShippingCost(params: ShippingCostParams): Promise<ShippingCostResult> {
    interface ShippingResult {
      freight_calculate_result_list?: {
        freight_calculate_result?: Array<{
          freight?: {
            amount?: string;
            cent?: number;
            currency_code?: string;
          };
          delivery_date_range?: {
            delivery_date_max?: number;
            delivery_date_min?: number;
          };
          service_name?: string;
          tracking_available?: string;
          error_code?: string;
        }>;
      };
    }

    try {
      const result = await this.executeRequest<ShippingResult>(
        'aliexpress.logistics.buyer.freight.calculate',
        {
          product_id: params.productId,
          product_num: params.quantity,
          country_code: params.countryCode,
        }
      );

      const freightList = result.freight_calculate_result_list?.freight_calculate_result ?? [];
      const cheapestOption = freightList
        .filter(f => !f.error_code)
        .sort((a, b) => (a.freight?.cent ?? Infinity) - (b.freight?.cent ?? Infinity))[0];

      if (!cheapestOption) {
        // Fallback to estimated shipping
        return {
          shippingCost: this.estimateShippingCost(params.countryCode),
          currency: 'EUR',
          estimatedDays: { min: 15, max: 45 },
          carrier: 'AliExpress Standard',
          trackable: true,
        };
      }

      return {
        shippingCost: cheapestOption.freight?.cent ? cheapestOption.freight.cent / 100 : 0,
        currency: cheapestOption.freight?.currency_code ?? 'EUR',
        estimatedDays: {
          min: cheapestOption.delivery_date_range?.delivery_date_min ?? 15,
          max: cheapestOption.delivery_date_range?.delivery_date_max ?? 45,
        },
        carrier: cheapestOption.service_name ?? 'AliExpress Standard',
        trackable: cheapestOption.tracking_available === 'true',
      };
    } catch {
      // Fallback for countries/products without API shipping data
      return {
        shippingCost: this.estimateShippingCost(params.countryCode),
        currency: 'EUR',
        estimatedDays: { min: 15, max: 45 },
        carrier: 'AliExpress Standard',
        trackable: true,
      };
    }
  }

  /**
   * Search products with full details
   * IMPORTANT: Enforces Beauty & Health category filtering (niche cosmétique)
   */
  async searchProductsDetailed(params: {
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
  }> {
    interface SearchResult {
      products?: {
        product?: AliExpressDetailedProduct[];
      };
      total_record_count?: number;
      current_page?: number;
      total_page_count?: number;
    }

    // STRICT: Force Beauty & Health category if not already specified or if outside allowed list
    const enforcedCategoryId = params.categoryId && ALLOWED_COSMETIC_CATEGORY_IDS.includes(params.categoryId)
      ? params.categoryId
      : BEAUTY_HEALTH_CATEGORY_ID;

    const result = await this.executeRequest<SearchResult>(
      'aliexpress.affiliate.product.query',
      {
        keywords: params.keywords,
        category_ids: enforcedCategoryId, // Always filter by Beauty & Health
        min_sale_price: params.minPrice ? params.minPrice * 100 : undefined,
        max_sale_price: params.maxPrice ? params.maxPrice * 100 : undefined,
        page_no: params.page ?? 1,
        page_size: params.pageSize ?? 50,
        target_currency: 'EUR',
        target_language: 'EN',
        tracking_id: this.config.trackingId,
        sort: 'SALE_PRICE_ASC',
      }
    );

    const products = result.products?.product ?? [];

    // SECOND FILTER: Validate each product against cosmetic keywords
    const validatedProducts = products
      .map(p => this.mapToAliExpressProductData(p))
      .filter(product => {
        const validation = validateCosmeticProduct(
          product.title,
          product.categoryId,
          product.categoryName
        );
        return validation.valid;
      });

    return {
      products: validatedProducts,
      totalCount: result.total_record_count ?? 0,
      currentPage: result.current_page ?? 1,
      totalPages: result.total_page_count ?? 1,
    };
  }

  /**
   * Refresh access token when expired
   */
  async refreshAccessToken(): Promise<string> {
    interface TokenResult {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }

    const result = await this.executeRequest<TokenResult>(
      'aliexpress.auth.token.refresh',
      {
        refresh_token: this.config.accessToken,
      }
    );

    return result.access_token;
  }

  /**
   * Check product availability and current stock
   */
  async checkProductAvailability(productId: string): Promise<{
    available: boolean;
    stock: number;
    price: number;
  }> {
    try {
      const product = await this.getProductDetails(productId);
      return {
        available: product.stock > 0,
        stock: product.stock,
        price: product.price,
      };
    } catch {
      return {
        available: false,
        stock: 0,
        price: 0,
      };
    }
  }

  // ============================================================================
  // Product Scoring Integration
  // ============================================================================

  /**
   * Calculate product score for import decision
   */
  calculateProductScore(
    product: AliExpressProductData,
    shippingCost: number,
    targetSellingPrice: number,
    targetCountry: string
  ): ProductScoreResult {
    const input: ProductScoreInput = {
      product,
      shippingCost,
      targetSellingPrice,
      targetCountry,
    };

    return this.scoreCalculator.calculate(input);
  }

  /**
   * Evaluate a product for import eligibility
   * Returns score result and whether product should be imported
   * IMPORTANT: Includes STRICT cosmetic niche validation
   */
  async evaluateProductForImport(
    productId: string,
    targetCountry: string,
    pricingStrategy: {
      markupMultiplier: number;
      minimumMargin: number;
    }
  ): Promise<{
    product: AliExpressProductData;
    shippingCost: number;
    suggestedPrice: number;
    scoreResult: ProductScoreResult;
    eligible: boolean;
    reason: string;
  }> {
    // Fetch product details
    const product = await this.getProductDetails(productId);

    // ========================================================================
    // GARDE-FOU COSMÉTIQUE: Validation STRICTE avant tout traitement
    // ========================================================================
    const cosmeticValidation = validateCosmeticProduct(
      product.title,
      product.categoryId,
      product.categoryName
    );

    if (!cosmeticValidation.valid) {
      // Return immediately with zero score - product is NOT in cosmetic niche
      return {
        product,
        shippingCost: 0,
        suggestedPrice: 0,
        scoreResult: {
          totalScore: 0,
          breakdown: {
            profitMarginScore: 0,
            marketDemandScore: 0,
            logisticsScore: 0,
            complianceScore: 0,
            supplierQualityScore: 0,
            competitivenessScore: 0,
          },
          profitability: {
            costPrice: product.price,
            shippingCost: 0,
            totalCost: product.price,
            sellingPrice: 0,
            grossProfit: 0,
            profitMargin: 0,
            breakEvenUnits: Infinity,
          },
          riskFactors: ['HORS_NICHE_COSMETIQUE: Produit rejeté - ne correspond pas à la niche beauté/cosmétique'],
          shouldImport: false,
          recommendation: 'NOT_RECOMMENDED',
        },
        eligible: false,
        reason: cosmeticValidation.reason,
      };
    }
    // ========================================================================

    // Calculate shipping cost
    const shippingResult = await this.calculateShippingCost({
      productId,
      quantity: 1,
      countryCode: targetCountry,
    });

    const shippingCost = shippingResult.shippingCost;

    // Calculate suggested selling price
    const totalCost = product.price + shippingCost;
    const suggestedPrice = Math.max(
      totalCost * pricingStrategy.markupMultiplier,
      totalCost / (1 - pricingStrategy.minimumMargin)
    );

    // Calculate score
    const scoreResult = this.calculateProductScore(
      product,
      shippingCost,
      suggestedPrice,
      targetCountry
    );

    // Determine eligibility
    let eligible = scoreResult.shouldImport;
    let reason = '';

    if (scoreResult.totalScore < 35) {
      reason = `Score trop bas (${scoreResult.totalScore}/100) - Produit non recommandé`;
      eligible = false;
    } else if (scoreResult.totalScore < 50) {
      reason = `Score risqué (${scoreResult.totalScore}/100) - Produit en quarantaine`;
      eligible = false;
    } else if (scoreResult.riskFactors.length >= 5) {
      reason = `Trop de facteurs de risque (${scoreResult.riskFactors.length}) détectés`;
      eligible = false;
    } else if (scoreResult.totalScore < 65) {
      reason = `Score acceptable (${scoreResult.totalScore}/100) - Import autorisé`;
    } else if (scoreResult.recommendation === 'GOOD') {
      reason = `Bon score (${scoreResult.totalScore}/100) - Import autorisé`;
    } else {
      reason = `Excellent score (${scoreResult.totalScore}/100) - Import prioritaire`;
    }

    return {
      product,
      shippingCost,
      suggestedPrice: Math.ceil(suggestedPrice * 100) / 100,
      scoreResult,
      eligible,
      reason,
    };
  }

  /**
   * Batch evaluate products and filter eligible ones
   */
  async batchEvaluateProducts(
    productIds: string[],
    targetCountry: string,
    pricingStrategy: {
      markupMultiplier: number;
      minimumMargin: number;
    }
  ): Promise<{
    eligible: Array<{
      product: AliExpressProductData;
      suggestedPrice: number;
      score: number;
    }>;
    quarantine: Array<{
      productId: string;
      score: number;
      reason: string;
    }>;
    rejected: Array<{
      productId: string;
      score: number;
      reason: string;
    }>;
    stats: {
      total: number;
      eligibleCount: number;
      quarantineCount: number;
      rejectedCount: number;
      averageScore: number;
    };
  }> {
    const eligible: Array<{ product: AliExpressProductData; suggestedPrice: number; score: number }> = [];
    const quarantine: Array<{ productId: string; score: number; reason: string }> = [];
    const rejected: Array<{ productId: string; score: number; reason: string }> = [];
    let totalScore = 0;

    for (const productId of productIds) {
      try {
        const evaluation = await this.evaluateProductForImport(
          productId,
          targetCountry,
          pricingStrategy
        );

        totalScore += evaluation.scoreResult.totalScore;

        if (evaluation.eligible) {
          eligible.push({
            product: evaluation.product,
            suggestedPrice: evaluation.suggestedPrice,
            score: evaluation.scoreResult.totalScore,
          });
        } else if (evaluation.scoreResult.totalScore >= 35) {
          quarantine.push({
            productId,
            score: evaluation.scoreResult.totalScore,
            reason: evaluation.reason,
          });
        } else {
          rejected.push({
            productId,
            score: evaluation.scoreResult.totalScore,
            reason: evaluation.reason,
          });
        }
      } catch (error) {
        rejected.push({
          productId,
          score: 0,
          reason: `Erreur lors de l'évaluation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return {
      eligible,
      quarantine,
      rejected,
      stats: {
        total: productIds.length,
        eligibleCount: eligible.length,
        quarantineCount: quarantine.length,
        rejectedCount: rejected.length,
        averageScore: productIds.length > 0 ? Math.round(totalScore / productIds.length) : 0,
      },
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Estimate shipping cost based on destination country
   */
  private estimateShippingCost(countryCode: string): number {
    const shippingEstimates: Record<string, number> = {
      FR: 2.50,
      ES: 2.80,
      IT: 2.80,
      DE: 2.50,
      GB: 3.50,
      BE: 2.50,
      NL: 2.50,
      PT: 3.00,
      AT: 2.80,
      CH: 4.50,
      US: 5.00,
      CA: 5.00,
    };

    return shippingEstimates[countryCode] ?? 4.00;
  }

  /**
   * Map API response to AliExpressProductData
   */
  private mapToAliExpressProductData(raw: AliExpressDetailedProduct): AliExpressProductData {
    const price = parseFloat(raw.target_sale_price ?? raw.sale_price ?? '0');
    const originalPrice = parseFloat(raw.target_original_price ?? raw.original_price ?? price.toString());

    // Parse product properties/attributes
    const attributes: ProductAttribute[] = [];
    if (raw.product_properties) {
      try {
        const props = typeof raw.product_properties === 'string'
          ? JSON.parse(raw.product_properties)
          : raw.product_properties;

        if (Array.isArray(props)) {
          props.forEach((prop: { attr_name?: string; attr_value?: string }) => {
            if (prop.attr_name && prop.attr_value) {
              attributes.push({
                name: prop.attr_name,
                value: prop.attr_value,
              });
            }
          });
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Parse variants/SKUs
    const variants: ProductVariant[] = [];
    if (raw.sku_info_list) {
      try {
        const skus = typeof raw.sku_info_list === 'string'
          ? JSON.parse(raw.sku_info_list)
          : raw.sku_info_list;

        if (Array.isArray(skus)) {
          skus.forEach((sku: {
            sku_id?: string;
            sku_display_name?: string;
            sku_price?: string;
            sku_stock?: boolean;
            sku_attr?: string;
            sku_image?: string;
          }) => {
            const variant: ProductVariant = {
              skuId: sku.sku_id ?? '',
              name: sku.sku_display_name ?? '',
              price: parseFloat(sku.sku_price ?? price.toString()),
              stock: sku.sku_stock ? 100 : 0,
              attributes: this.parseSkuAttributes(sku.sku_attr),
            };
            // Only add image if it exists
            if (sku.sku_image !== undefined) variant.image = sku.sku_image;
            variants.push(variant);
          });
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Parse shipping info
    const shippingMethods: ShippingMethod[] = [];
    let freeShippingAvailable = false;
    let minDays = 15;
    let maxDays = 45;
    let defaultCost = 0;

    if (raw.shipping_info) {
      try {
        const shipping = typeof raw.shipping_info === 'string'
          ? JSON.parse(raw.shipping_info)
          : raw.shipping_info;

        if (shipping.free_shipping) {
          freeShippingAvailable = true;
        }
        if (shipping.delivery_time_min) {
          minDays = parseInt(shipping.delivery_time_min, 10);
        }
        if (shipping.delivery_time_max) {
          maxDays = parseInt(shipping.delivery_time_max, 10);
        }
        if (shipping.freight) {
          defaultCost = parseFloat(shipping.freight);
        }
      } catch {
        // Use defaults
      }
    }

    // Parse images
    const images: string[] = [];
    if (raw.product_main_image_url) {
      images.push(raw.product_main_image_url);
    }
    if (raw.product_small_image_urls) {
      try {
        const smallImages = typeof raw.product_small_image_urls === 'string'
          ? JSON.parse(raw.product_small_image_urls)
          : raw.product_small_image_urls;

        if (Array.isArray(smallImages)) {
          images.push(...smallImages.filter((img: string) => img !== raw.product_main_image_url));
        } else if (smallImages?.string) {
          images.push(...(Array.isArray(smallImages.string) ? smallImages.string : [smallImages.string]));
        }
      } catch {
        // Ignore
      }
    }

    // Parse weight and dimensions
    const weight = parseFloat(raw.item_weight ?? '0.1');
    const dimensions = {
      length: parseFloat(raw.package_length ?? '10'),
      width: parseFloat(raw.package_width ?? '10'),
      height: parseFloat(raw.package_height ?? '5'),
    };

    const result: AliExpressProductData = {
      productId: raw.product_id,
      title: raw.product_title ?? '',
      description: raw.product_description ?? raw.product_detail_url ?? '',
      descriptionHtml: raw.html_description ?? '',
      images,
      price,
      currency: 'EUR',
      categoryId: raw.category_id ?? raw.first_level_category_id ?? '',
      categoryName: raw.category_name ?? raw.first_level_category_name ?? 'Other',
      attributes,
      variants,
      stock: parseInt(raw.sku_available_stock ?? '100', 10),
      rating: this.parseRating(raw.evaluate_rate),
      reviewCount: parseInt(raw.evaluate_num ?? raw.review_count ?? '0', 10),
      orderCount: parseInt(raw.latest_volume ?? raw.order_count ?? '0', 10),
      supplierId: raw.seller_id ?? '',
      supplierName: raw.seller_name ?? raw.shop_url ?? 'AliExpress Seller',
      supplierRating: parseFloat(raw.seller_rating ?? '4.5'),
      shippingInfo: {
        methods: shippingMethods,
        minDays,
        maxDays,
        defaultCost,
        freeShippingAvailable,
      },
      weight,
      dimensions,
    };

    // Only add originalPrice if it's greater than current price
    if (originalPrice > price) {
      result.originalPrice = originalPrice;
    }

    return result;
  }

  /**
   * Parse SKU attributes string to record
   */
  private parseSkuAttributes(attrString?: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!attrString) return result;

    try {
      // Format: "Color:Red;Size:M" or similar
      const pairs = attrString.split(';');
      pairs.forEach(pair => {
        const [key, value] = pair.split(':');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      });
    } catch {
      // Ignore parsing errors
    }

    return result;
  }

  /**
   * Parse rating from percentage string
   */
  private parseRating(evaluateRate?: string): number {
    if (!evaluateRate) return 4.0;
    const percentage = parseFloat(evaluateRate.replace('%', ''));
    // Convert percentage to 5-star rating
    return Math.round((percentage / 20) * 10) / 10;
  }

  private mapToSupplierProduct(raw: AliExpressProduct): SupplierProduct {
    const price = parseFloat(raw.target_sale_price ?? raw.sale_price ?? '0');
    const originalPrice = parseFloat(raw.target_original_price ?? raw.original_price ?? '0');

    return {
      id: raw.product_id,
      name: raw.product_title,
      description: raw.product_detail_url ?? '',
      category: raw.first_level_category_name ?? 'Other',
      images: raw.product_main_image_url != null ? [raw.product_main_image_url] : [],
      price: Money.create(price, 'EUR'),
      stock: 999,
      rating: parseFloat(raw.evaluate_rate?.replace('%', '') ?? '0') / 20,
      orderVolume: parseInt(raw.latest_volume ?? '0', 10),
      supplierId: raw.seller_id ?? '',
      supplierName: raw.shop_url ?? 'AliExpress Seller',
      shippingTime: { min: 15, max: 45 },
      variants: [],
    };
  }
}

interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_main_image_url?: string;
  product_detail_url?: string;
  target_sale_price?: string;
  sale_price?: string;
  target_original_price?: string;
  original_price?: string;
  evaluate_rate?: string;
  latest_volume?: string;
  seller_id?: string;
  shop_url?: string;
  first_level_category_name?: string;
}

interface AliExpressDetailedProduct extends AliExpressProduct {
  product_description?: string;
  html_description?: string;
  product_small_image_urls?: string | { string?: string | string[] };
  product_video_url?: string;
  sku_info_list?: string | Array<{
    sku_id?: string;
    sku_display_name?: string;
    sku_price?: string;
    sku_stock?: boolean;
    sku_attr?: string;
    sku_image?: string;
  }>;
  product_properties?: string | Array<{
    attr_name?: string;
    attr_value?: string;
  }>;
  sku_available_stock?: string;
  category_id?: string;
  category_name?: string;
  first_level_category_id?: string;
  seller_name?: string;
  seller_rating?: string;
  evaluate_num?: string;
  review_count?: string;
  order_count?: string;
  shipping_info?: string | {
    free_shipping?: boolean;
    delivery_time_min?: string;
    delivery_time_max?: string;
    freight?: string;
  };
  item_weight?: string;
  package_length?: string;
  package_width?: string;
  package_height?: string;
}
