import axios, { AxiosInstance } from 'axios';
import {
  SupplierApi,
  SupplierProduct,
  SupplierProductVariant,
  SupplierOrderItem,
  SupplierOrderResult,
  SupplierOrderTracking,
  SearchProductsParams,
} from '@domain/ports/outbound/supplier-api.port.js';
import { Money } from '@domain/value-objects/money.js';
import { Address } from '@domain/value-objects/address.js';
import { CircuitBreaker } from '@shared/utils/circuit-breaker.js';
import { withExponentialBackoff } from '@shared/utils/retry.js';
import { CryptoService } from '@shared/utils/crypto.js';
import { ExternalServiceError } from '@shared/errors/domain-error.js';

export interface AliExpressConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  trackingId: string;
  baseUrl?: string;
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
  };
}

export class AliExpressAdapter implements SupplierApi {
  private readonly client: AxiosInstance;
  private readonly config: AliExpressConfig;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: AliExpressConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000,
    });

    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://api-sg.aliexpress.com/sync',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  private generateSignature(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map((key) => `${key}${params[key]}`).join('');
    const signWithSecret = `${this.config.appSecret}${signString}${this.config.appSecret}`;
    return CryptoService.generateHmacSha256(signWithSecret, this.config.appSecret).toUpperCase();
  }

  private buildRequestParams(method: string, bizParams: Record<string, unknown>): Record<string, string> {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const params: Record<string, string> = {
      app_key: this.config.appKey,
      method,
      timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'hmac-sha256',
    };

    for (const [key, value] of Object.entries(bizParams)) {
      if (value !== undefined && value !== null) {
        params[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    params['sign'] = this.generateSignature(params);
    return params;
  }

  private async executeRequest<T>(
    method: string,
    bizParams: Record<string, unknown>
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return withExponentialBackoff(async () => {
        const params = this.buildRequestParams(method, bizParams);
        const response = await this.client.post<AliExpressApiResponse<T>>(
          '',
          new URLSearchParams(params).toString()
        );

        if (response.data.error_response != null) {
          throw new ExternalServiceError(
            'AliExpress',
            `${response.data.error_response.code}: ${response.data.error_response.msg}`
          );
        }

        const respResult = response.data.aliexpress_affiliate_product_query_response?.resp_result;
        if (respResult == null || respResult.resp_code !== 200) {
          throw new ExternalServiceError(
            'AliExpress',
            respResult?.resp_msg ?? 'Unknown error'
          );
        }

        return respResult.result as T;
      });
    });
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
