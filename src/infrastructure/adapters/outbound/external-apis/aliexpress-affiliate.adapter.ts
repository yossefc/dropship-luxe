// ============================================================================
// AliExpress Affiliates API Adapter
// ============================================================================
// Uses the AliExpress Affiliates API (Standard API for Publishers)
// This is different from the DS (Dropshipping Solution) API:
//
// Key differences:
// - No OAuth session token needed (uses app_key + app_secret signing only)
// - Methods: aliexpress.affiliate.* (not aliexpress.ds.*)
// - Can search products, get details, generate affiliate links
// - Cannot place orders (that requires DS API)
//
// Gateway: https://api-sg.aliexpress.com/sync
// Signature: HMAC-MD5 (default) or HMAC-SHA256
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { ExternalServiceError } from '@shared/errors/domain-error.js';
import {
  AliExpressProductData,
  ProductAttribute,
  ProductVariant,
} from '@domain/ports/outbound/aliexpress.port.js';
import {
  ProductScoreCalculator,
  ProductScoreInput,
  ProductScoreResult,
} from '@domain/services/product-score-calculator.js';
import { validateCosmeticProduct, ALLOWED_COSMETIC_CATEGORY_IDS } from './aliexpress-ds.adapter.js';

// ============================================================================
// Configuration
// ============================================================================

export interface AliExpressAffiliateConfig {
  appKey: string;
  appSecret: string;
  trackingId?: string;
  gatewayUrl?: string;
}

// ============================================================================
// Affiliate API Response Types
// ============================================================================

interface AffiliateApiResponse<T = unknown> {
  [key: string]: unknown;
  error_response?: {
    code: string;
    msg: string;
    sub_code?: string;
    sub_msg?: string;
    request_id?: string;
  };
}

interface AffiliateProduct {
  product_id?: number;
  product_title?: string;
  product_main_image_url?: string;
  product_small_image_urls?: {
    string?: string[];
  };
  target_sale_price?: string;
  target_sale_price_currency?: string;
  target_original_price?: string;
  target_original_price_currency?: string;
  sale_price?: string;
  sale_price_currency?: string;
  original_price?: string;
  original_price_currency?: string;
  discount?: string;
  evaluate_rate?: string;
  first_level_category_id?: number;
  first_level_category_name?: string;
  second_level_category_id?: number;
  second_level_category_name?: string;
  shop_id?: number;
  shop_url?: string;
  promotion_link?: string;
  hot_product_commission_rate?: string;
  lastest_volume?: number;
  relevant_market_commission_rate?: string;
  ship_to_days?: string;
  target_app_sale_price?: string;
  target_app_sale_price_currency?: string;
}

interface AffiliateProductDetail {
  product_id?: number;
  product_title?: string;
  product_main_image_url?: string;
  product_small_image_urls?: {
    string?: string[];
  };
  target_sale_price?: string;
  target_sale_price_currency?: string;
  target_original_price?: string;
  target_original_price_currency?: string;
  evaluate_rate?: string;
  first_level_category_id?: number;
  first_level_category_name?: string;
  second_level_category_id?: number;
  second_level_category_name?: string;
  shop_id?: number;
  ship_to_days?: string;
  lastest_volume?: number;
  product_video_url?: string;
}

interface AffiliateCategory {
  category_id: number;
  category_name: string;
  parent_category_id?: number;
}

// ============================================================================
// AliExpress Affiliates API Adapter
// ============================================================================

export class AliExpressAffiliateAdapter {
  private readonly client: AxiosInstance;
  private readonly config: AliExpressAffiliateConfig;
  private readonly gatewayUrl: string;
  private readonly scoreCalculator: ProductScoreCalculator;

  constructor(config: AliExpressAffiliateConfig) {
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
  // Signature Generation (same algorithm as DS, but NO session token)
  // ============================================================================

  private generateSignature(
    params: Record<string, string>,
    algorithm: 'md5' | 'sha256' = 'md5'
  ): string {
    const signParams = Object.entries(params)
      .filter(([key, value]) =>
        key !== 'sign' &&
        value !== undefined &&
        value !== null &&
        value !== ''
      )
      .sort(([a], [b]) => a.localeCompare(b));

    let baseString = '';
    for (const [key, value] of signParams) {
      baseString += key + value;
    }

    return crypto
      .createHmac(algorithm, this.config.appSecret)
      .update(baseString, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  private buildRequestParams(
    method: string,
    bizParams: Record<string, unknown> = {}
  ): Record<string, string> {
    // Affiliates API: NO session token needed
    const params: Record<string, string> = {
      method,
      app_key: this.config.appKey,
      timestamp: Date.now().toString(),
      sign_method: 'hmac',
      v: '2.0',
      simplify: 'true',
    };

    for (const [key, value] of Object.entries(bizParams)) {
      if (value !== undefined && value !== null) {
        params[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    params.sign = this.generateSignature(params, 'md5');
    return params;
  }

  // ============================================================================
  // Request Execution
  // ============================================================================

  private async executeRequest<T>(
    method: string,
    bizParams: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      const params = this.buildRequestParams(method, bizParams);

      console.log(`[AliExpress Affiliate] Calling ${method}`, {
        gateway: this.gatewayUrl,
        app_key: params.app_key,
      });

      const response = await this.client.post<AffiliateApiResponse<T>>(
        '',
        new URLSearchParams(params).toString()
      );

      // Check for API error
      if (response.data.error_response) {
        const err = response.data.error_response;
        console.error(`[AliExpress Affiliate] API Error`, {
          code: err.code,
          msg: err.msg,
          sub_code: err.sub_code,
          sub_msg: err.sub_msg,
        });
        throw new ExternalServiceError(
          'AliExpress Affiliate',
          `${err.code}: ${err.sub_msg ?? err.msg}`
        );
      }

      // Find the response key
      const responseKey = `${method.replace(/\./g, '_')}_response`;
      const methodResponse = response.data[responseKey] as {
        resp_result?: {
          resp_code?: number;
          resp_msg?: string;
          result?: T;
        };
        result?: T;
      } | undefined;

      if (methodResponse) {
        // Affiliates API wraps in resp_result
        if (methodResponse.resp_result) {
          const rr = methodResponse.resp_result;
          if (rr.resp_code !== undefined && rr.resp_code !== 200) {
            throw new ExternalServiceError(
              'AliExpress Affiliate',
              `${rr.resp_code}: ${rr.resp_msg ?? 'Unknown error'}`
            );
          }
          if (rr.result !== undefined) {
            return rr.result;
          }
        }

        if (methodResponse.result !== undefined) {
          return methodResponse.result;
        }

        return methodResponse as unknown as T;
      }

      // Try alternative response format
      const altKey = Object.keys(response.data).find(
        k => k.endsWith('_response') && k !== 'error_response'
      );
      if (altKey) {
        const altResponse = response.data[altKey] as Record<string, unknown>;
        if (typeof altResponse === 'object' && altResponse !== null) {
          // Try resp_result pattern
          if (altResponse.resp_result) {
            const rr = altResponse.resp_result as { result?: T; resp_code?: number; resp_msg?: string };
            if (rr.resp_code !== undefined && rr.resp_code !== 200) {
              throw new ExternalServiceError(
                'AliExpress Affiliate',
                `${rr.resp_code}: ${rr.resp_msg ?? 'Unknown error'}`
              );
            }
            return rr.result ?? (altResponse as T);
          }
          return (altResponse as { result?: T }).result ?? (altResponse as T);
        }
      }

      // Return raw data for debugging
      console.warn('[AliExpress Affiliate] Unexpected response format, returning raw:', JSON.stringify(response.data).slice(0, 500));
      return response.data as T;
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;

      if (axios.isAxiosError(error)) {
        console.error('[AliExpress Affiliate] Network Error', {
          status: error.response?.status,
          data: JSON.stringify(error.response?.data).slice(0, 500),
        });
        throw new ExternalServiceError(
          'AliExpress Affiliate',
          `Network error: ${error.message}`
        );
      }

      throw new ExternalServiceError(
        'AliExpress Affiliate',
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  // ============================================================================
  // Affiliate API Methods
  // ============================================================================

  /**
   * Search products using the Affiliates API
   * Method: aliexpress.affiliate.product.query
   */
  async searchProducts(params: {
    keywords?: string;
    categoryIds?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    pageSize?: number;
    sort?: string;
    targetCurrency?: string;
    targetLanguage?: string;
    shipToCountry?: string;
  }): Promise<{
    products: AffiliateProduct[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    interface SearchResponse {
      products?: {
        product?: AffiliateProduct[];
      };
      total_record_count?: number;
      current_page_no?: number;
      total_page_no?: number;
      current_record_count?: number;
    }

    const bizParams: Record<string, unknown> = {
      target_currency: params.targetCurrency ?? 'EUR',
      target_language: params.targetLanguage ?? 'EN',
      ship_to_country: params.shipToCountry ?? 'FR',
      page_no: params.page ?? 1,
      page_size: Math.min(params.pageSize ?? 50, 50),
      sort: params.sort ?? 'SALE_PRICE_ASC',
    };

    if (params.keywords) bizParams.keywords = params.keywords;
    if (params.categoryIds) bizParams.category_ids = params.categoryIds;
    if (params.minPrice) bizParams.min_sale_price = params.minPrice;
    if (params.maxPrice) bizParams.max_sale_price = params.maxPrice;
    if (this.config.trackingId) bizParams.tracking_id = this.config.trackingId;

    const result = await this.executeRequest<SearchResponse>(
      'aliexpress.affiliate.product.query',
      bizParams
    );

    const products = result.products?.product ?? [];

    return {
      products,
      totalCount: result.total_record_count ?? products.length,
      currentPage: result.current_page_no ?? 1,
      totalPages: result.total_page_no ?? 1,
    };
  }

  /**
   * Get detailed product information
   * Method: aliexpress.affiliate.productdetail.get
   */
  async getProductDetails(productIds: string[]): Promise<AffiliateProductDetail[]> {
    interface DetailResponse {
      products?: {
        product?: AffiliateProductDetail[];
      };
    }

    const result = await this.executeRequest<DetailResponse>(
      'aliexpress.affiliate.productdetail.get',
      {
        product_ids: productIds.join(','),
        target_currency: 'EUR',
        target_language: 'EN',
        ship_to_country: 'FR',
        ...(this.config.trackingId && { tracking_id: this.config.trackingId }),
      }
    );

    return result.products?.product ?? [];
  }

  /**
   * Get category list
   * Method: aliexpress.affiliate.category.get
   */
  async getCategories(): Promise<AffiliateCategory[]> {
    interface CategoriesResponse {
      categories?: {
        category?: AffiliateCategory[];
      };
    }

    const result = await this.executeRequest<CategoriesResponse>(
      'aliexpress.affiliate.category.get',
      {}
    );

    return result.categories?.category ?? [];
  }

  /**
   * Get hot/trending products
   * Method: aliexpress.affiliate.hotproduct.query
   */
  async getHotProducts(params: {
    keywords?: string;
    categoryIds?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{
    products: AffiliateProduct[];
    totalCount: number;
  }> {
    interface HotProductResponse {
      products?: {
        product?: AffiliateProduct[];
      };
      total_record_count?: number;
      current_page_no?: number;
    }

    const bizParams: Record<string, unknown> = {
      target_currency: 'EUR',
      target_language: 'EN',
      ship_to_country: 'FR',
      page_no: params.page ?? 1,
      page_size: Math.min(params.pageSize ?? 50, 50),
      sort: 'LAST_VOLUME_DESC',
    };

    if (params.keywords) bizParams.keywords = params.keywords;
    if (params.categoryIds) bizParams.category_ids = params.categoryIds;
    if (params.minPrice) bizParams.min_sale_price = params.minPrice;
    if (params.maxPrice) bizParams.max_sale_price = params.maxPrice;
    if (this.config.trackingId) bizParams.tracking_id = this.config.trackingId;

    const result = await this.executeRequest<HotProductResponse>(
      'aliexpress.affiliate.hotproduct.query',
      bizParams
    );

    return {
      products: result.products?.product ?? [],
      totalCount: result.total_record_count ?? 0,
    };
  }

  // ============================================================================
  // Mapping: Affiliate product → AliExpressProductData (shared format)
  // ============================================================================

  mapToProductData(product: AffiliateProduct): AliExpressProductData {
    const price = parseFloat(product.target_sale_price ?? product.sale_price ?? '0');
    const originalPrice = parseFloat(product.target_original_price ?? product.original_price ?? '0');
    const images: string[] = [];

    if (product.product_main_image_url) {
      images.push(product.product_main_image_url);
    }
    if (product.product_small_image_urls?.string) {
      images.push(...product.product_small_image_urls.string);
    }

    const rating = parseFloat(product.evaluate_rate ?? '0') / 20; // evaluate_rate is 0-100, convert to 0-5
    const categoryId = String(product.second_level_category_id ?? product.first_level_category_id ?? '');
    const categoryName = product.second_level_category_name ?? product.first_level_category_name ?? '';
    const shipDays = parseInt(product.ship_to_days ?? '20', 10);

    return {
      productId: String(product.product_id ?? ''),
      title: product.product_title ?? '',
      description: product.product_title ?? '',
      descriptionHtml: `<p>${product.product_title ?? ''}</p>`,
      images,
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      currency: product.target_sale_price_currency ?? 'EUR',
      categoryId,
      categoryName,
      attributes: [],
      variants: [],
      stock: 100, // Affiliates API doesn't return stock, assume available
      rating: Math.min(rating, 5),
      reviewCount: Math.max(Math.floor((product.lastest_volume ?? 0) * 0.15), 0), // Estimate reviews from volume
      orderCount: product.lastest_volume ?? 0,
      supplierId: String(product.shop_id ?? ''),
      supplierName: '',
      supplierRating: Math.min(rating, 5), // Use product rating as proxy
      shippingInfo: {
        methods: [{
          name: 'Standard Shipping',
          cost: 0,
          minDays: Math.max(shipDays - 5, 7),
          maxDays: shipDays,
          trackable: true,
        }],
        minDays: Math.max(shipDays - 5, 7),
        maxDays: shipDays,
        defaultCost: 0,
        freeShippingAvailable: true,
      },
      weight: 0.3, // Default estimate for cosmetics
      dimensions: { length: 15, width: 10, height: 5 },
    };
  }

  // ============================================================================
  // Search with cosmetic validation + scoring
  // ============================================================================

  /**
   * Search and evaluate products for import.
   * Applies cosmetic validation and quality scoring.
   */
  async searchAndEvaluateProducts(params: {
    keywords: string;
    categoryIds?: string;
    page?: number;
    pageSize?: number;
    pricingStrategy?: {
      markupMultiplier: number;
      minimumMargin: number;
    };
  }): Promise<{
    eligible: Array<{ product: AliExpressProductData; score: ProductScoreResult; suggestedPrice: number }>;
    quarantine: Array<{ product: AliExpressProductData; score: number; reason: string }>;
    rejected: Array<{ productId: string; title: string; reason: string }>;
    raw: AffiliateProduct[];
    stats: { total: number; eligible: number; quarantine: number; rejected: number };
  }> {
    const pricing = params.pricingStrategy ?? { markupMultiplier: 2.5, minimumMargin: 0.35 };

    // Force beauty category for safety
    const categoryIds = params.categoryIds ?? '66';

    const searchResult = await this.searchProducts({
      keywords: params.keywords,
      categoryIds,
      page: params.page,
      pageSize: params.pageSize,
    });

    const eligible: Array<{ product: AliExpressProductData; score: ProductScoreResult; suggestedPrice: number }> = [];
    const quarantine: Array<{ product: AliExpressProductData; score: number; reason: string }> = [];
    const rejected: Array<{ productId: string; title: string; reason: string }> = [];

    for (const rawProduct of searchResult.products) {
      const productData = this.mapToProductData(rawProduct);

      // Cosmetic niche validation
      const validation = validateCosmeticProduct(
        productData.title,
        productData.categoryId,
        productData.categoryName
      );

      if (!validation.valid) {
        rejected.push({
          productId: productData.productId,
          title: productData.title,
          reason: validation.reason,
        });
        continue;
      }

      // Calculate score
      const totalCost = productData.price;
      const suggestedPrice = Math.max(
        totalCost * pricing.markupMultiplier,
        totalCost / (1 - pricing.minimumMargin)
      );

      const scoreInput: ProductScoreInput = {
        product: productData,
        shippingCost: 0,
        targetSellingPrice: suggestedPrice,
        targetCountry: 'FR',
      };

      const scoreResult = this.scoreCalculator.calculate(scoreInput);

      if (scoreResult.shouldImport && scoreResult.totalScore >= 50) {
        eligible.push({ product: productData, score: scoreResult, suggestedPrice });
      } else if (scoreResult.totalScore >= 35) {
        quarantine.push({
          product: productData,
          score: scoreResult.totalScore,
          reason: `Score risqué (${scoreResult.totalScore}/100)`,
        });
      } else {
        rejected.push({
          productId: productData.productId,
          title: productData.title,
          reason: `Score trop bas (${scoreResult.totalScore}/100) - ${scoreResult.riskFactors[0] ?? ''}`,
        });
      }
    }

    return {
      eligible,
      quarantine,
      rejected,
      raw: searchResult.products,
      stats: {
        total: searchResult.products.length,
        eligible: eligible.length,
        quarantine: quarantine.length,
        rejected: rejected.length,
      },
    };
  }

  // ============================================================================
  // Connection Test
  // ============================================================================

  /**
   * Test the API connection by fetching categories
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const categories = await this.getCategories();
      return {
        success: true,
        message: `Connection OK - ${categories.length} categories found`,
        data: { categoryCount: categories.length, sample: categories.slice(0, 5) },
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
