// ============================================================================
// AliExpress DS (Dropshipping Solution) Adapter - Open Platform Compatible
// ============================================================================
// This adapter uses the correct AliExpress Open Platform gateway and APIs.
//
// Key differences from legacy adapter:
// - Gateway: https://api-sg.aliexpress.com/sync (not eco.taobao.com)
// - Signature: HMAC-SHA256 (not HMAC-MD5)
// - APIs: DS Solution APIs (not Affiliate APIs)
// - Token: OAuth session token passed as 'session' parameter
//
// Documentation: https://openservice.aliexpress.com/doc/api.htm
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { ExternalServiceError } from '@shared/errors/domain-error.js';
import { Money } from '@domain/value-objects/money.js';
import { Address } from '@domain/value-objects/address.js';
import {
  SupplierApi,
  SupplierProduct,
  SupplierOrderItem,
  SupplierOrderResult,
  SupplierOrderTracking,
  SearchProductsParams,
} from '@domain/ports/outbound/supplier-api.port.js';
import {
  AliExpressProductData,
  ShippingCostParams,
  ShippingCostResult,
  ProductAttribute,
  ProductVariant,
  ShippingMethod,
} from '@domain/ports/outbound/aliexpress.port.js';
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

// ============================================================================
// Configuration
// ============================================================================

export interface AliExpressDSConfig {
  appKey: string;
  appSecret: string;
  /** Function to get valid OAuth access token from database */
  getAccessToken: () => Promise<string>;
  /** Gateway URL - defaults to Singapore gateway */
  gatewayUrl?: string;
  /** Tracking ID for affiliate programs (optional) */
  trackingId?: string;
}

/**
 * Legacy config alias for backward compatibility
 */
export type AliExpressConfig = AliExpressDSConfig;

// ============================================================================
// API Response Types
// ============================================================================

interface AliExpressApiResponse<T = unknown> {
  /** New Open Platform format */
  [methodResponseKey: string]: {
    result?: T;
    rsp_code?: string;
    rsp_msg?: string;
  } | unknown;
  /** Error format */
  error_response?: {
    code: string;
    msg: string;
    sub_code?: string;
    sub_msg?: string;
    request_id?: string;
  };
  /** Request tracking */
  request_id?: string;
}

// ============================================================================
// DS Product Types
// ============================================================================

export interface DSProductDetails {
  ae_item_base_info_dto?: {
    product_id?: number;
    category_id?: number;
    subject?: string;
    currency_code?: string;
    product_status_type?: string;
    ws_display?: string;
    ws_offline_date?: string;
    gmt_create?: string;
    gmt_modified?: string;
    owner_member_id?: string;
    owner_member_seq_id?: number;
    detail?: string;
    mobile_detail?: string;
  };
  ae_item_sku_info_dtos?: {
    ae_item_sku_info_d_t_o?: Array<{
      sku_id?: string;
      sku_price?: string;
      sku_stock?: boolean;
      currency_code?: string;
      sku_code?: string;
      ipm_sku_stock?: number;
      id?: string;
      ae_sku_property_dtos?: {
        ae_sku_property_d_t_o?: Array<{
          sku_property_id?: number;
          sku_property_name?: string;
          sku_property_value?: string;
          property_value_definition_name?: string;
          sku_image?: string;
        }>;
      };
      barcode?: string;
      offer_sale_price?: string;
      offer_bulk_sale_price?: string;
      sku_bulk_order?: number;
      sku_available_stock?: number;
      s_k_u_available_stock?: number;
    }>;
  };
  ae_multimedia_info_dto?: {
    ae_video_dtos?: {
      ae_video_d_t_o?: Array<{
        ali_member_id?: string;
        media_id?: number;
        media_status?: string;
        media_type?: string;
        poster_url?: string;
      }>;
    };
    image_urls?: string;
  };
  package_info_dto?: {
    package_height?: number;
    package_length?: number;
    package_width?: number;
    gross_weight?: string;
    base_unit?: number;
    package_type?: boolean;
    product_unit?: number;
  };
  logistics_info_dto?: {
    delivery_time?: number;
    ship_to_country?: string;
  };
  ae_store_info?: {
    store_id?: number;
    store_name?: string;
    item_as_described_rating?: string;
    communication_rating?: string;
    shipping_speed_rating?: string;
  };
}

export interface DSCategory {
  category_id: number;
  category_name: string;
  parent_category_id?: number;
  is_leaf_category?: boolean;
  level?: number;
}

export interface DSShippingInfo {
  sku_id?: string;
  freight?: string;
  currency?: string;
  service_name?: string;
  estimated_delivery_time?: string;
  tracking_available?: string;
  error_code?: string;
  error_message?: string;
}

// ============================================================================
// AliExpress DS Adapter - Implements SupplierApi
// ============================================================================

export class AliExpressDSAdapter implements SupplierApi {
  private readonly client: AxiosInstance;
  private readonly config: AliExpressDSConfig;
  private readonly gatewayUrl: string;
  private readonly scoreCalculator: ProductScoreCalculator;

  constructor(config: AliExpressDSConfig) {
    this.config = config;
    this.gatewayUrl = config.gatewayUrl ?? 'https://api-sg.aliexpress.com/sync';
    this.scoreCalculator = new ProductScoreCalculator();

    this.client = axios.create({
      baseURL: this.gatewayUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });
  }

  // ============================================================================
  // Signature Generation
  // ============================================================================

  /**
   * Generate signature for API request using HMAC
   *
   * AliExpress TOP Platform signature format:
   * 1. Sort ALL parameters alphabetically (including 'method', excluding 'sign')
   * 2. Concatenate: key1value1key2value2...
   * 3. HMAC with app_secret as key
   *
   * sign_method='hmac' -> HMAC-MD5 (32 hex chars)
   * sign_method='sha256' -> HMAC-SHA256 (64 hex chars)
   */
  private generateSignature(
    params: Record<string, string>,
    algorithm: 'md5' | 'sha256' = 'md5'
  ): string {
    // Sort all parameters except 'sign'
    const signParams = Object.entries(params)
      .filter(([key, value]) =>
        key !== 'sign' &&
        value !== undefined &&
        value !== null &&
        value !== ''
      )
      .sort(([a], [b]) => a.localeCompare(b));

    // Build base string: key1value1key2value2...
    let baseString = '';
    for (const [key, value] of signParams) {
      baseString += key + value;
    }

    console.log(`[AliExpress DS] Algorithm: ${algorithm}, Params count: ${signParams.length}`);

    // Generate HMAC signature
    return crypto
      .createHmac(algorithm, this.config.appSecret)
      .update(baseString, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Build complete request parameters with signature
   */
  private async buildRequestParams(
    method: string,
    bizParams: Record<string, unknown> = {}
  ): Promise<Record<string, string>> {
    // Get OAuth access token
    const accessToken = await this.config.getAccessToken();

    // Use HMAC-MD5 which is more widely supported
    const signMethod = 'hmac';
    const algorithm = 'md5';

    // Base parameters required for all requests
    const params: Record<string, string> = {
      method,
      app_key: this.config.appKey,
      session: accessToken,
      timestamp: Date.now().toString(),
      sign_method: signMethod,
      v: '2.0',
      simplify: 'true',
    };

    // Add business parameters (stringify objects)
    for (const [key, value] of Object.entries(bizParams)) {
      if (value !== undefined && value !== null) {
        params[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    // Generate and add signature
    params.sign = this.generateSignature(params, algorithm);

    return params;
  }

  // ============================================================================
  // Request Execution
  // ============================================================================

  /**
   * Execute an API request to AliExpress Open Platform
   */
  private async executeRequest<T>(
    method: string,
    bizParams: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      const params = await this.buildRequestParams(method, bizParams);

      // Log request for debugging (remove sensitive data in production)
      console.log(`[AliExpress DS] Calling ${method}`, {
        gateway: this.gatewayUrl,
        app_key: params.app_key,
        timestamp: params.timestamp,
      });

      const response = await this.client.post<AliExpressApiResponse<T>>(
        '',
        new URLSearchParams(params).toString()
      );

      // Check for API error
      if (response.data.error_response) {
        const err = response.data.error_response;
        console.error(`[AliExpress DS] API Error`, {
          code: err.code,
          msg: err.msg,
          sub_code: err.sub_code,
          sub_msg: err.sub_msg,
          request_id: err.request_id,
        });
        throw new ExternalServiceError(
          'AliExpress DS',
          `${err.code}: ${err.sub_msg ?? err.msg} (request_id: ${err.request_id ?? 'unknown'})`
        );
      }

      // Find the response key (method name with dots replaced by underscores + _response)
      const responseKey = `${method.replace(/\./g, '_')}_response`;
      const methodResponse = response.data[responseKey] as {
        result?: T;
        rsp_code?: string;
        rsp_msg?: string;
      } | undefined;

      if (methodResponse) {
        // Check for method-level error
        // Note: rsp_code can be number (200) or string ("200") depending on the API method
        const rspCode = methodResponse.rsp_code;
        const isSuccess = rspCode === '200' || String(rspCode) === '200';

        if (rspCode && !isSuccess) {
          throw new ExternalServiceError(
            'AliExpress DS',
            `${rspCode}: ${methodResponse.rsp_msg ?? 'Unknown error'}`
          );
        }

        if (methodResponse.result !== undefined) {
          return methodResponse.result;
        }

        // Some methods return data directly without 'result' wrapper
        return methodResponse as unknown as T;
      }

      // Try alternative response format
      const altKey = Object.keys(response.data).find(
        k => k.endsWith('_response') && k !== 'error_response'
      );
      if (altKey) {
        const altResponse = response.data[altKey];
        if (typeof altResponse === 'object' && altResponse !== null) {
          const typed = altResponse as { result?: T };
          return typed.result ?? (altResponse as T);
        }
      }

      throw new ExternalServiceError('AliExpress DS', `Unexpected response format for ${method}`);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        console.error('[AliExpress DS] Network Error', {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new ExternalServiceError(
          'AliExpress DS',
          `Network error: ${error.message}`
        );
      }

      throw new ExternalServiceError(
        'AliExpress DS',
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  // ============================================================================
  // DS API Methods - Product
  // ============================================================================

  /**
   * Get product details from DS API (raw format)
   * This is a non-destructive test method
   *
   * @param productId - AliExpress product ID
   * @param options - Additional options
   */
  async getDSProduct(
    productId: string,
    options: {
      shipToCountry?: string;
      targetCurrency?: string;
      targetLanguage?: string;
    } = {}
  ): Promise<DSProductDetails> {
    return this.executeRequest<DSProductDetails>('aliexpress.ds.product.get', {
      product_id: productId,
      ship_to_country: options.shipToCountry ?? 'FR',
      target_currency: options.targetCurrency ?? 'EUR',
      target_language: options.targetLanguage ?? 'EN',
    });
  }

  /**
   * Get product (SupplierApi interface)
   * Returns product in SupplierProduct format or null if not found
   */
  async getProduct(productId: string): Promise<SupplierProduct | null> {
    try {
      const dsProduct = await this.getDSProduct(productId);
      const productData = this.mapDSProductToAliExpressProductData(dsProduct);
      return this.mapToSupplierProduct(productData);
    } catch {
      return null;
    }
  }

  /**
   * Get DS categories
   */
  async getCategories(): Promise<DSCategory[]> {
    interface CategoriesResponse {
      categories?: {
        category?: DSCategory[];
      };
    }

    const result = await this.executeRequest<CategoriesResponse>(
      'aliexpress.ds.category.get',
      {}
    );

    return result.categories?.category ?? [];
  }

  /**
   * Get recommended products feed names
   */
  async getFeedNames(): Promise<Array<{ feed_name: string }>> {
    interface FeedNamesResponse {
      feed_names?: {
        feed_name?: string[];
      };
    }

    const result = await this.executeRequest<FeedNamesResponse>(
      'aliexpress.ds.feedname.get',
      {}
    );

    const feedNames = result.feed_names?.feed_name ?? [];
    return feedNames.map(name => ({ feed_name: name }));
  }

  // ============================================================================
  // DS API Methods - Shipping
  // ============================================================================

  /**
   * Calculate shipping cost for a product
   */
  async calculateShipping(params: {
    productId: string;
    quantity: number;
    countryCode: string;
    provinceCode?: string;
    cityCode?: string;
    sendGoodsCountryCode?: string;
    price?: string;
  }): Promise<DSShippingInfo[]> {
    interface ShippingResponse {
      ae_ds_buyer_freight_calculate_result_list?: {
        ae_ds_buyer_freight_calculate_result_d_t_o?: DSShippingInfo[];
      };
    }

    const result = await this.executeRequest<ShippingResponse>(
      'aliexpress.logistics.buyer.freight.calculate',
      {
        product_id: params.productId,
        product_num: params.quantity,
        country_code: params.countryCode,
        ...(params.provinceCode && { province_code: params.provinceCode }),
        ...(params.cityCode && { city_code: params.cityCode }),
        ...(params.sendGoodsCountryCode && { send_goods_country_code: params.sendGoodsCountryCode }),
        ...(params.price && { price: params.price }),
      }
    );

    return (
      result.ae_ds_buyer_freight_calculate_result_list
        ?.ae_ds_buyer_freight_calculate_result_d_t_o ?? []
    );
  }

  // ============================================================================
  // DS API Methods - Orders
  // ============================================================================

  /**
   * Create a dropshipping order
   */
  async createOrder(params: {
    productItems: Array<{
      productId: string;
      skuId?: string;
      quantity: number;
    }>;
    logisticsAddress: {
      contactPerson: string;
      address: string;
      city: string;
      province?: string;
      country: string;
      postalCode: string;
      mobileNo?: string;
      phoneCountry?: string;
      cpf?: string; // Brazilian tax ID
    };
  }): Promise<{
    order_id?: string;
    order_list?: Array<{ order_id: string }>;
  }> {
    // Transform product items to API format
    const productItems = params.productItems.map(item => ({
      product_id: item.productId,
      ...(item.skuId && { sku_id: item.skuId }),
      product_count: item.quantity,
    }));

    // Transform address to API format
    const logisticsAddress = {
      contact_person: params.logisticsAddress.contactPerson,
      address: params.logisticsAddress.address,
      city: params.logisticsAddress.city,
      ...(params.logisticsAddress.province && { province: params.logisticsAddress.province }),
      country: params.logisticsAddress.country,
      zip: params.logisticsAddress.postalCode,
      ...(params.logisticsAddress.mobileNo && { mobile_no: params.logisticsAddress.mobileNo }),
      ...(params.logisticsAddress.phoneCountry && { phone_country: params.logisticsAddress.phoneCountry }),
      ...(params.logisticsAddress.cpf && { cpf: params.logisticsAddress.cpf }),
    };

    return this.executeRequest('aliexpress.ds.order.create', {
      param_place_order_request4_open_api_d_t_o: {
        product_items: productItems,
        logistics_address: logisticsAddress,
      },
    });
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<{
    order_id?: string;
    gmt_create?: string;
    order_status?: string;
    logistics_status?: string;
    order_amount?: {
      amount?: string;
      currency_code?: string;
    };
  }> {
    return this.executeRequest('aliexpress.trade.ds.order.get', {
      single_order_query: {
        order_id: orderId,
      },
    });
  }

  // ============================================================================
  // DS API Methods - Tracking
  // ============================================================================

  /**
   * Get tracking information for an order
   */
  async getTrackingInfo(orderId: string): Promise<{
    tracking_available?: boolean;
    details?: Array<{
      event_desc?: string;
      event_date?: string;
      address?: string;
    }>;
  }> {
    return this.executeRequest('aliexpress.logistics.ds.trackinginfo.query', {
      order_id: orderId,
    });
  }

  // ============================================================================
  // SupplierApi Implementation
  // ============================================================================

  /**
   * Search products (SupplierApi interface)
   */
  async searchProducts(params: SearchProductsParams): Promise<SupplierProduct[]> {
    const result = await this.searchProductsDetailed({
      keywords: params.query ?? '',
      categoryId: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      page: params.page,
      pageSize: params.limit,
    });

    return result.products.map(p => this.mapToSupplierProduct(p));
  }

  /**
   * Get product stock
   */
  async getProductStock(productId: string): Promise<number> {
    try {
      const product = await this.getDSProduct(productId);
      const skuInfo = product.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o;
      if (skuInfo && skuInfo.length > 0) {
        const totalStock = skuInfo.reduce((sum, sku) => {
          return sum + (sku.ipm_sku_stock ?? sku.sku_available_stock ?? sku.s_k_u_available_stock ?? 0);
        }, 0);
        return totalStock;
      }
      return 100; // Default assumption
    } catch {
      return 0;
    }
  }

  /**
   * Get product price
   */
  async getProductPrice(productId: string): Promise<Money> {
    const product = await this.getDSProduct(productId);
    const skuInfo = product.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];
    const price = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
    return Money.create(price, 'EUR');
  }

  /**
   * Place order (SupplierApi interface)
   */
  async placeOrder(
    items: SupplierOrderItem[],
    shippingAddress: Address
  ): Promise<SupplierOrderResult> {
    const result = await this.createOrder({
      productItems: items.map(item => ({
        productId: item.productId,
        skuId: item.variantId,
        quantity: item.quantity,
      })),
      logisticsAddress: {
        contactPerson: shippingAddress.fullName,
        address: shippingAddress.street,
        city: shippingAddress.city,
        country: shippingAddress.country,
        postalCode: shippingAddress.postalCode,
        mobileNo: shippingAddress.phone,
      },
    });

    return {
      orderId: result.order_id ?? result.order_list?.[0]?.order_id ?? '',
      status: 'submitted',
    };
  }

  /**
   * Get order status (SupplierApi interface)
   */
  async getOrderStatus(orderId: string): Promise<SupplierOrderResult> {
    const result = await this.getOrder(orderId);
    return {
      orderId: result.order_id ?? orderId,
      status: result.order_status ?? 'unknown',
    };
  }

  /**
   * Get order tracking (SupplierApi interface)
   */
  async getOrderTracking(orderId: string): Promise<SupplierOrderTracking> {
    const result = await this.getTrackingInfo(orderId);
    return {
      orderId,
      status: result.tracking_available ? 'in_transit' : 'pending',
      trackingNumber: orderId, // AliExpress uses orderId for tracking
      events: (result.details ?? []).map(e => ({
        date: new Date(e.event_date ?? Date.now()),
        status: 'update',
        description: e.event_desc ?? '',
        ...(e.address ? { location: e.address } : {}),
      })),
    };
  }

  /**
   * Cancel order (SupplierApi interface)
   */
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
  // Product Scoring & Evaluation Methods
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
    // STRICT: Force Beauty & Health category if not already specified or if outside allowed list
    const enforcedCategoryId = params.categoryId && ALLOWED_COSMETIC_CATEGORY_IDS.includes(params.categoryId)
      ? params.categoryId
      : BEAUTY_HEALTH_CATEGORY_ID;

    // Get available feed names dynamically
    let feedName = 'DS_France_topsellers'; // Default
    try {
      const availableFeeds = await this.getFeedNames();
      if (availableFeeds.length > 0) {
        // Prefer France/EU feeds, fallback to any available
        const preferredFeed = availableFeeds.find(f =>
          f.feed_name.toLowerCase().includes('france') ||
          f.feed_name.toLowerCase().includes('eu') ||
          f.feed_name.toLowerCase().includes('europe')
        );
        feedName = preferredFeed?.feed_name ?? availableFeeds[0].feed_name;
        console.log(`[AliExpress DS] Using feed: ${feedName} (from ${availableFeeds.length} available)`);
      }
    } catch (feedError) {
      console.warn('[AliExpress DS] Could not get feed names, using default:', feedError);
    }

    // Use the DS recommended products API with feed_name (required parameter)
    const result = await this.executeRequest<{
      products?: {
        traffic_product_d_t_o?: Array<{
          product_id?: number;
          product_title?: string;
          sale_price?: string;
          original_price?: string;
          product_main_image_url?: string;
          evaluate_rate?: string;
          orders?: number;
          ship_to_days?: string;
          second_level_category_id?: number;
          second_level_category_name?: string;
        }>;
      };
      total_record_count?: number;
      current_page_no?: number;
      total_page_no?: number;
    }>('aliexpress.ds.recommend.feed.get', {
      feed_name: feedName,
      country: 'FR',
      category_id: enforcedCategoryId,
      page_no: params.page ?? 1,
      page_size: params.pageSize ?? 50,
      target_currency: 'EUR',
      target_language: 'EN',
      sort: 'SALE_PRICE_ASC',
    });

    // Handle correct response structure: products.traffic_product_d_t_o[]
    const rawProducts = result.products?.traffic_product_d_t_o ?? [];

    console.log(`[AliExpress DS] Feed response: ${rawProducts.length} products found`);

    // Map and filter products
    const products: AliExpressProductData[] = [];
    for (const p of rawProducts) {
      // Convert to AliExpressProductData format
      const productData: AliExpressProductData = {
        productId: String(p.product_id ?? ''),
        title: p.product_title ?? '',
        description: '',
        descriptionHtml: '',
        images: p.product_main_image_url ? [p.product_main_image_url] : [],
        price: parseFloat(p.sale_price ?? '0'),
        currency: 'EUR',
        categoryId: String(p.second_level_category_id ?? enforcedCategoryId),
        categoryName: p.second_level_category_name ?? 'Beauty & Health',
        attributes: [],
        variants: [],
        stock: 100,
        rating: this.parseRating(p.evaluate_rate),
        reviewCount: 0,
        orderCount: p.orders ?? 0,
        supplierId: '',
        supplierName: 'AliExpress Seller',
        supplierRating: 4.5,
        shippingInfo: {
          methods: [],
          minDays: 15,
          maxDays: parseInt(p.ship_to_days ?? '45', 10),
          defaultCost: 0,
          freeShippingAvailable: true,
        },
        weight: 0.1,
        dimensions: { length: 10, width: 10, height: 5 },
      };

      // Validate cosmetic niche
      const validation = validateCosmeticProduct(
        productData.title,
        productData.categoryId,
        productData.categoryName
      );

      if (validation.valid) {
        products.push(productData);
      }
    }

    return {
      products,
      totalCount: result.total_record_count ?? products.length,
      currentPage: result.current_page_no ?? 1,
      totalPages: result.total_page_no ?? 1,
    };
  }

  /**
   * Get detailed product data as AliExpressProductData
   */
  async getProductDetails(productId: string): Promise<AliExpressProductData> {
    const product = await this.getDSProduct(productId);
    return this.mapDSProductToAliExpressProductData(product);
  }

  /**
   * Calculate shipping cost for a product
   */
  async calculateShippingCost(params: ShippingCostParams): Promise<ShippingCostResult> {
    try {
      const shippingOptions = await this.calculateShipping({
        productId: params.productId,
        quantity: params.quantity,
        countryCode: params.countryCode,
      });

      const cheapestOption = shippingOptions
        .filter(opt => !opt.error_code)
        .sort((a, b) => parseFloat(a.freight ?? 'Infinity') - parseFloat(b.freight ?? 'Infinity'))[0];

      if (!cheapestOption) {
        return {
          shippingCost: this.estimateShippingCost(params.countryCode),
          currency: 'EUR',
          estimatedDays: { min: 15, max: 45 },
          carrier: 'AliExpress Standard',
          trackable: true,
        };
      }

      const deliveryDays = cheapestOption.estimated_delivery_time
        ? parseInt(cheapestOption.estimated_delivery_time, 10)
        : 30;

      return {
        shippingCost: parseFloat(cheapestOption.freight ?? '0'),
        currency: cheapestOption.currency ?? 'EUR',
        estimatedDays: { min: Math.max(deliveryDays - 10, 7), max: deliveryDays },
        carrier: cheapestOption.service_name ?? 'AliExpress Standard',
        trackable: cheapestOption.tracking_available === 'true',
      };
    } catch {
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
   * Check product availability
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
  // Debug / Raw API Methods
  // ============================================================================

  /**
   * Execute a raw API call and return the full response for debugging
   */
  async executeRawRequest(
    method: string,
    bizParams: Record<string, unknown> = {}
  ): Promise<unknown> {
    const params = await this.buildRequestParams(method, bizParams);

    console.log(`[AliExpress DS RAW] Request params:`, {
      method,
      app_key: params.app_key,
      timestamp: params.timestamp,
      sign_method: params.sign_method,
      sign_preview: params.sign?.substring(0, 8) + '...',
    });

    const response = await this.client.post(
      '',
      new URLSearchParams(params).toString()
    );

    console.log(`[AliExpress DS RAW] Response:`, JSON.stringify(response.data, null, 2));

    return response.data;
  }

  // ============================================================================
  // Test / Diagnostic Methods
  // ============================================================================

  /**
   * Test the API connection with a simple non-destructive call
   * This fetches DS categories to verify the connection works
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: {
      gateway: string;
      appKey: string;
      categoriesCount?: number;
      sampleCategories?: string[];
    };
    error?: string;
  }> {
    try {
      const categories = await this.getCategories();

      return {
        success: true,
        message: 'AliExpress DS API connection successful',
        details: {
          gateway: this.gatewayUrl,
          appKey: this.config.appKey,
          categoriesCount: categories.length,
          sampleCategories: categories.slice(0, 3).map(c => c.category_name),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'AliExpress DS API connection failed',
        details: {
          gateway: this.gatewayUrl,
          appKey: this.config.appKey,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test product retrieval with a known product ID
   */
  async testProductFetch(
    productId: string = '1005004000000000'
  ): Promise<{
    success: boolean;
    message: string;
    product?: {
      id?: number;
      title?: string;
      status?: string;
      storeId?: number;
      storeName?: string;
    };
    error?: string;
  }> {
    try {
      const product = await this.getDSProduct(productId);
      const baseInfo = product.ae_item_base_info_dto;
      const storeInfo = product.ae_store_info;

      // Build product object with only defined properties
      const productResult: {
        id?: number;
        title?: string;
        status?: string;
        storeId?: number;
        storeName?: string;
      } = {};

      if (baseInfo?.product_id !== undefined) productResult.id = baseInfo.product_id;
      if (baseInfo?.subject !== undefined) productResult.title = baseInfo.subject;
      if (baseInfo?.product_status_type !== undefined) productResult.status = baseInfo.product_status_type;
      if (storeInfo?.store_id !== undefined) productResult.storeId = storeInfo.store_id;
      if (storeInfo?.store_name !== undefined) productResult.storeName = storeInfo.store_name;

      return {
        success: true,
        message: 'Product fetched successfully',
        product: productResult,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
   * Parse rating from percentage string
   */
  private parseRating(evaluateRate?: string): number {
    if (!evaluateRate) return 4.0;
    const percentage = parseFloat(evaluateRate.replace('%', ''));
    // Convert percentage to 5-star rating
    return Math.round((percentage / 20) * 10) / 10;
  }

  /**
   * Map DS product to AliExpressProductData format
   */
  private mapDSProductToAliExpressProductData(product: DSProductDetails): AliExpressProductData {
    const baseInfo = product.ae_item_base_info_dto;
    const skuInfo = product.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o ?? [];
    const mediaInfo = product.ae_multimedia_info_dto;
    const storeInfo = product.ae_store_info;
    const packageInfo = product.package_info_dto;
    const logisticsInfo = product.logistics_info_dto;

    // Parse images
    const images: string[] = [];
    if (mediaInfo?.image_urls) {
      const urls = mediaInfo.image_urls.split(';').filter(Boolean);
      images.push(...urls);
    }

    // Parse variants
    const variants: ProductVariant[] = skuInfo.map(sku => ({
      skuId: sku.sku_id ?? sku.id ?? '',
      name: this.parseSkuName(sku.ae_sku_property_dtos?.ae_sku_property_d_t_o),
      price: parseFloat(sku.offer_sale_price ?? sku.sku_price ?? '0'),
      stock: sku.ipm_sku_stock ?? sku.sku_available_stock ?? sku.s_k_u_available_stock ?? 0,
      attributes: this.parseSkuAttributes(sku.ae_sku_property_dtos?.ae_sku_property_d_t_o),
      image: sku.ae_sku_property_dtos?.ae_sku_property_d_t_o?.find(p => p.sku_image)?.sku_image,
    }));

    // Calculate total stock
    const totalStock = skuInfo.reduce((sum, sku) => {
      return sum + (sku.ipm_sku_stock ?? sku.sku_available_stock ?? sku.s_k_u_available_stock ?? 0);
    }, 0) || 100;

    // Get base price
    const basePrice = skuInfo[0]
      ? parseFloat(skuInfo[0].offer_sale_price ?? skuInfo[0].sku_price ?? '0')
      : 0;

    return {
      productId: String(baseInfo?.product_id ?? ''),
      title: baseInfo?.subject ?? '',
      description: baseInfo?.detail ?? '',
      descriptionHtml: baseInfo?.mobile_detail ?? baseInfo?.detail ?? '',
      images,
      price: basePrice,
      currency: baseInfo?.currency_code ?? 'EUR',
      categoryId: String(baseInfo?.category_id ?? ''),
      categoryName: 'Beauty & Health', // DS API doesn't return category name
      attributes: [],
      variants,
      stock: totalStock,
      rating: parseFloat(storeInfo?.item_as_described_rating ?? '4.5'),
      reviewCount: 0,
      orderCount: 0,
      supplierId: String(storeInfo?.store_id ?? ''),
      supplierName: storeInfo?.store_name ?? 'AliExpress Seller',
      supplierRating: parseFloat(storeInfo?.shipping_speed_rating ?? '4.5'),
      shippingInfo: {
        methods: [],
        minDays: 15,
        maxDays: logisticsInfo?.delivery_time ?? 45,
        defaultCost: 0,
        freeShippingAvailable: true,
      },
      weight: parseFloat(packageInfo?.gross_weight ?? '0.1'),
      dimensions: {
        length: packageInfo?.package_length ?? 10,
        width: packageInfo?.package_width ?? 10,
        height: packageInfo?.package_height ?? 5,
      },
    };
  }

  /**
   * Parse SKU name from properties
   */
  private parseSkuName(properties?: Array<{ sku_property_name?: string; property_value_definition_name?: string }>): string {
    if (!properties) return '';
    return properties
      .map(p => p.property_value_definition_name ?? '')
      .filter(Boolean)
      .join(' / ');
  }

  /**
   * Parse SKU attributes to record
   */
  private parseSkuAttributes(properties?: Array<{ sku_property_name?: string; property_value_definition_name?: string }>): Record<string, string> {
    const result: Record<string, string> = {};
    if (!properties) return result;

    for (const prop of properties) {
      if (prop.sku_property_name && prop.property_value_definition_name) {
        result[prop.sku_property_name] = prop.property_value_definition_name;
      }
    }

    return result;
  }

  /**
   * Map to SupplierProduct interface
   */
  private mapToSupplierProduct(product: AliExpressProductData): SupplierProduct {
    return {
      id: product.productId,
      name: product.title,
      description: product.description,
      category: product.categoryName,
      images: product.images,
      price: Money.create(product.price, 'EUR'),
      stock: product.stock,
      rating: product.rating,
      orderVolume: product.orderCount,
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      shippingTime: {
        min: product.shippingInfo.minDays,
        max: product.shippingInfo.maxDays,
      },
      variants: product.variants.map(v => ({
        id: v.skuId,
        name: v.name,
        sku: v.skuId, // Use skuId as the SKU
        price: Money.create(v.price, 'EUR'),
        stock: v.stock,
        attributes: v.attributes,
      })),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAliExpressDSAdapter(
  getAccessToken: () => Promise<string>
): AliExpressDSAdapter {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('Missing ALIEXPRESS_APP_KEY or ALIEXPRESS_APP_SECRET');
  }

  return new AliExpressDSAdapter({
    appKey,
    appSecret,
    getAccessToken,
  });
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * Alias for backward compatibility with code using AliExpressAdapter
 */
export { AliExpressDSAdapter as AliExpressAdapter };
