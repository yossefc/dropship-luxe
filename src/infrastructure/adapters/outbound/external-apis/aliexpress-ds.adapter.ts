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
}

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
// AliExpress DS Adapter
// ============================================================================

export class AliExpressDSAdapter {
  private readonly client: AxiosInstance;
  private readonly config: AliExpressDSConfig;
  private readonly gatewayUrl: string;

  constructor(config: AliExpressDSConfig) {
    this.config = config;
    this.gatewayUrl = config.gatewayUrl ?? 'https://api-sg.aliexpress.com/sync';

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
        const isSuccess = rspCode === 200 || rspCode === '200';

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
   * Get product details from DS API
   * This is a non-destructive test method
   *
   * @param productId - AliExpress product ID
   * @param options - Additional options
   */
  async getProduct(
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
      const product = await this.getProduct(productId);
      const baseInfo = product.ae_item_base_info_dto;
      const storeInfo = product.ae_store_info;

      return {
        success: true,
        message: 'Product fetched successfully',
        product: {
          id: baseInfo?.product_id,
          title: baseInfo?.subject,
          status: baseInfo?.product_status_type,
          storeId: storeInfo?.store_id,
          storeName: storeInfo?.store_name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
