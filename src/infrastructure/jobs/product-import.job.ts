// ============================================================================
// Product Import Job - AliExpress DS API Integration
// ============================================================================
// Automated product import from AliExpress Dropshipping Solution API.
// Features:
// - Fetches products from DS recommended feeds
// - Applies mathematical scoring algorithm (quality, margin, shipping)
// - AI-powered luxury copywriting via OpenAI
// - Multi-language translations (FR, EN)
// - Quarantine system for low-score products
// ============================================================================

import { PrismaClient, QuarantineStatus } from '@prisma/client';
import { createAliExpressDSAdapter, AliExpressDSAdapter, DSProductDetails } from '@infrastructure/adapters/outbound/external-apis/aliexpress-ds.adapter.js';
import { createAliExpressOAuthService } from '@infrastructure/adapters/outbound/external-apis/aliexpress-oauth.service.js';
import { OpenAIAdapter } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { env } from '@infrastructure/config/env.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface ProductScore {
  total: number;
  breakdown: {
    rating: number;        // 0-25 points
    volume: number;        // 0-20 points
    margin: number;        // 0-25 points
    shipping: number;      // 0-15 points
    storeRating: number;   // 0-15 points
  };
  riskFactors: string[];
}

export interface ImportedProduct {
  aliexpressId: string;
  title: string;
  score: number;
  status: 'imported' | 'quarantined' | 'rejected';
  reason?: string;
}

export interface ImportJobResult {
  jobId: string;
  totalProcessed: number;
  importedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  errorCount: number;
  averageScore: number;
  products: ImportedProduct[];
  errors: Array<{ productId: string; stage: string; message: string }>;
  processingTimeMs: number;
}

export interface ImportJobConfig {
  feedName?: string;
  maxProducts?: number;
  minScore?: number;
  quarantineThreshold?: number;
  priceMultiplier?: number;
  dryRun?: boolean;
}

// ============================================================================
// Product Scoring Algorithm
// ============================================================================

export function calculateProductScore(
  product: DSProductDetails,
  shippingCost: number,
  priceMultiplier: number
): ProductScore {
  const riskFactors: string[] = [];
  const breakdown = {
    rating: 0,
    volume: 0,
    margin: 0,
    shipping: 0,
    storeRating: 0,
  };

  // Get base info
  const baseInfo = product.ae_item_base_info_dto;
  const storeInfo = product.ae_store_info;
  const skuInfo = product.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];

  // 1. Rating Score (0-25 points)
  // We don't have direct rating in DS API, estimate from store rating
  const itemRating = parseFloat(storeInfo?.item_as_described_rating ?? '0');
  if (itemRating >= 4.8) {
    breakdown.rating = 25;
  } else if (itemRating >= 4.5) {
    breakdown.rating = 20;
  } else if (itemRating >= 4.2) {
    breakdown.rating = 15;
  } else if (itemRating >= 4.0) {
    breakdown.rating = 10;
    riskFactors.push('Store rating below 4.2');
  } else {
    breakdown.rating = 5;
    riskFactors.push('Low store rating');
  }

  // 2. Volume Score (0-20 points) - Based on store reputation
  const commRating = parseFloat(storeInfo?.communication_rating ?? '0');
  const shippingRating = parseFloat(storeInfo?.shipping_speed_rating ?? '0');
  const avgStoreRating = (itemRating + commRating + shippingRating) / 3;

  if (avgStoreRating >= 4.7) {
    breakdown.volume = 20;
  } else if (avgStoreRating >= 4.4) {
    breakdown.volume = 15;
  } else if (avgStoreRating >= 4.1) {
    breakdown.volume = 10;
  } else {
    breakdown.volume = 5;
    riskFactors.push('Low store average rating');
  }

  // 3. Margin Score (0-25 points)
  const basePrice = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
  const totalCost = basePrice + shippingCost;
  const sellingPrice = totalCost * priceMultiplier;
  const margin = (sellingPrice - totalCost) / sellingPrice;

  if (margin >= 0.60) {
    breakdown.margin = 25;
  } else if (margin >= 0.50) {
    breakdown.margin = 20;
  } else if (margin >= 0.40) {
    breakdown.margin = 15;
  } else if (margin >= 0.30) {
    breakdown.margin = 10;
    riskFactors.push('Margin below 40%');
  } else {
    breakdown.margin = 5;
    riskFactors.push('Low profit margin');
  }

  // 4. Shipping Score (0-15 points)
  const deliveryTime = product.logistics_info_dto?.delivery_time ?? 30;

  if (deliveryTime <= 10) {
    breakdown.shipping = 15;
  } else if (deliveryTime <= 15) {
    breakdown.shipping = 12;
  } else if (deliveryTime <= 20) {
    breakdown.shipping = 9;
  } else if (deliveryTime <= 30) {
    breakdown.shipping = 6;
    riskFactors.push('Long shipping time (20-30 days)');
  } else {
    breakdown.shipping = 3;
    riskFactors.push('Very long shipping time (30+ days)');
  }

  // 5. Store Rating Score (0-15 points)
  if (avgStoreRating >= 4.8) {
    breakdown.storeRating = 15;
  } else if (avgStoreRating >= 4.5) {
    breakdown.storeRating = 12;
  } else if (avgStoreRating >= 4.2) {
    breakdown.storeRating = 9;
  } else {
    breakdown.storeRating = 5;
    riskFactors.push('Seller reliability concerns');
  }

  const total = breakdown.rating + breakdown.volume + breakdown.margin + breakdown.shipping + breakdown.storeRating;

  return {
    total,
    breakdown,
    riskFactors,
  };
}

// ============================================================================
// Product Import Job Class
// ============================================================================

export class ProductImportJob {
  private readonly prisma: PrismaClient;
  private readonly dsAdapter: AliExpressDSAdapter;
  private readonly openai: OpenAIAdapter;

  constructor(
    prisma: PrismaClient,
    dsAdapter: AliExpressDSAdapter,
    openai: OpenAIAdapter
  ) {
    this.prisma = prisma;
    this.dsAdapter = dsAdapter;
    this.openai = openai;
  }

  // ==========================================================================
  // Main Execution
  // ==========================================================================

  async execute(config: ImportJobConfig = {}): Promise<ImportJobResult> {
    const jobId = uuidv4();
    const startTime = Date.now();

    const {
      feedName = 'DS_France_topsellers',
      maxProducts = 20,
      minScore = 65,
      quarantineThreshold = 50,
      priceMultiplier = 2.5,
      dryRun = false,
    } = config;

    console.log(`[ProductImport] Starting job ${jobId}`, {
      feedName,
      maxProducts,
      minScore,
      quarantineThreshold,
      priceMultiplier,
      dryRun,
    });

    const result: ImportJobResult = {
      jobId,
      totalProcessed: 0,
      importedCount: 0,
      quarantinedCount: 0,
      rejectedCount: 0,
      errorCount: 0,
      averageScore: 0,
      products: [],
      errors: [],
      processingTimeMs: 0,
    };

    try {
      // Fetch products from DS feed
      const feedProducts = await this.fetchFeedProducts(feedName, maxProducts);
      result.totalProcessed = feedProducts.length;

      console.log(`[ProductImport] Fetched ${feedProducts.length} products from feed`);

      let totalScore = 0;

      for (const productData of feedProducts) {
        try {
          const productId = String(productData.ae_item_base_info_dto?.product_id ?? '');
          if (!productId) {
            result.errors.push({
              productId: 'unknown',
              stage: 'fetch',
              message: 'Missing product ID',
            });
            result.errorCount++;
            continue;
          }

          // Check if already imported
          const existing = await this.prisma.product.findUnique({
            where: { aliexpressId: productId },
          });

          if (existing) {
            console.log(`[ProductImport] Skipping existing product ${productId}`);
            continue;
          }

          // Calculate shipping cost (default estimate)
          const shippingCost = await this.estimateShippingCost(productId);

          // Calculate score
          const score = calculateProductScore(productData, shippingCost, priceMultiplier);
          totalScore += score.total;

          console.log(`[ProductImport] Product ${productId}: Score ${score.total}/100`, {
            breakdown: score.breakdown,
            riskFactors: score.riskFactors,
          });

          // Decision based on score
          if (score.total >= minScore) {
            // Import product
            if (!dryRun) {
              await this.importProduct(productData, score, shippingCost, priceMultiplier);
            }
            result.importedCount++;
            result.products.push({
              aliexpressId: productId,
              title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
              score: score.total,
              status: 'imported',
            });
          } else if (score.total >= quarantineThreshold) {
            // Quarantine for review
            if (!dryRun) {
              await this.quarantineProduct(productData, score, shippingCost, priceMultiplier);
            }
            result.quarantinedCount++;
            result.products.push({
              aliexpressId: productId,
              title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
              score: score.total,
              status: 'quarantined',
              reason: score.riskFactors.join(', '),
            });
          } else {
            // Reject
            result.rejectedCount++;
            result.products.push({
              aliexpressId: productId,
              title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
              score: score.total,
              status: 'rejected',
              reason: score.riskFactors.join(', '),
            });
          }
        } catch (error) {
          const productId = String(productData.ae_item_base_info_dto?.product_id ?? 'unknown');
          console.error(`[ProductImport] Error processing product ${productId}`, error);
          result.errors.push({
            productId,
            stage: 'processing',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          result.errorCount++;
        }
      }

      result.averageScore = result.totalProcessed > 0 ? Math.round(totalScore / result.totalProcessed) : 0;

    } catch (error) {
      console.error('[ProductImport] Job failed', error);
      result.errors.push({
        productId: 'job',
        stage: 'execution',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      result.errorCount++;
    }

    result.processingTimeMs = Date.now() - startTime;

    // Save import history
    if (!config.dryRun) {
      await this.saveImportHistory(result, feedName);
    }

    console.log(`[ProductImport] Job ${jobId} completed`, {
      totalProcessed: result.totalProcessed,
      imported: result.importedCount,
      quarantined: result.quarantinedCount,
      rejected: result.rejectedCount,
      errors: result.errorCount,
      averageScore: result.averageScore,
      processingTimeMs: result.processingTimeMs,
    });

    return result;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async fetchFeedProducts(feedName: string, maxProducts: number): Promise<DSProductDetails[]> {
    // For now, we use the categories to get product IDs, then fetch full details
    // In production, you'd use aliexpress.ds.recommend.feed.get
    try {
      // Try to get feed products
      const rawResponse = await this.dsAdapter.executeRawRequest('aliexpress.ds.recommend.feed.get', {
        feed_name: feedName,
        country: 'FR',
        target_currency: 'EUR',
        target_language: 'EN',
        page_no: 1,
        page_size: Math.min(maxProducts, 50),
      }) as {
        aliexpress_ds_recommend_feed_get_response?: {
          result?: {
            products?: {
              traffic_product_d_t_o?: Array<{
                product_id?: number;
              }>;
            };
          };
        };
      };

      const products = rawResponse.aliexpress_ds_recommend_feed_get_response?.result?.products?.traffic_product_d_t_o ?? [];

      console.log(`[ProductImport] Found ${products.length} products in feed`);

      // Fetch full details for each product
      const fullProducts: DSProductDetails[] = [];
      for (const p of products.slice(0, maxProducts)) {
        if (p.product_id) {
          try {
            const details = await this.dsAdapter.getProduct(String(p.product_id));
            fullProducts.push(details);
          } catch (error) {
            console.warn(`[ProductImport] Could not fetch product ${p.product_id}`, error);
          }
        }
      }

      return fullProducts;
    } catch (error) {
      console.error('[ProductImport] Error fetching feed products', error);
      return [];
    }
  }

  private async estimateShippingCost(productId: string): Promise<number> {
    try {
      const shipping = await this.dsAdapter.calculateShipping({
        productId,
        quantity: 1,
        countryCode: 'FR',
      });

      const cheapestOption = shipping
        .filter(s => !s.error_code)
        .sort((a, b) => parseFloat(a.freight ?? '999') - parseFloat(b.freight ?? '999'))[0];

      return parseFloat(cheapestOption?.freight ?? '5');
    } catch {
      return 5; // Default shipping estimate
    }
  }

  private async importProduct(
    productData: DSProductDetails,
    score: ProductScore,
    shippingCost: number,
    priceMultiplier: number
  ): Promise<void> {
    const baseInfo = productData.ae_item_base_info_dto;
    const storeInfo = productData.ae_store_info;
    const skuInfo = productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];
    const multimedia = productData.ae_multimedia_info_dto;

    const productId = String(baseInfo?.product_id ?? '');
    const basePrice = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
    const sellingPrice = (basePrice + shippingCost) * priceMultiplier;

    // Parse images
    const images = multimedia?.image_urls?.split(';').filter(Boolean) ?? [];

    // Generate AI translation (simplified for now)
    const frenchContent = await this.generateFrenchContent(baseInfo?.subject ?? '', baseInfo?.detail ?? '');

    // Create product with translation
    await this.prisma.product.create({
      data: {
        aliexpressId: productId,
        aliexpressUrl: `https://www.aliexpress.com/item/${productId}.html`,
        name: baseInfo?.subject,
        originalName: baseInfo?.subject,
        originalDescription: baseInfo?.detail,
        images,
        basePrice,
        costPrice: basePrice + shippingCost,
        sellingPrice,
        currency: 'EUR',
        stock: skuInfo?.ipm_sku_stock ?? 100,
        rating: parseFloat(storeInfo?.item_as_described_rating ?? '4.5'),
        supplierId: String(storeInfo?.store_id ?? 'unknown'),
        supplierName: storeInfo?.store_name ?? 'Unknown Store',
        shippingTimeMin: productData.logistics_info_dto?.delivery_time ?? 15,
        shippingTimeMax: (productData.logistics_info_dto?.delivery_time ?? 15) + 10,
        importScore: score.total,
        importScoreBreakdown: score.breakdown,
        riskFactors: score.riskFactors,
        isActive: true,
        translations: {
          create: {
            locale: 'fr',
            name: frenchContent.name,
            slug: this.generateSlug(frenchContent.name),
            description: frenchContent.description,
            descriptionHtml: `<p>${frenchContent.description}</p>`,
            benefits: frenchContent.benefits,
            metaTitle: frenchContent.metaTitle,
            metaDescription: frenchContent.metaDescription,
            metaKeywords: frenchContent.keywords,
            aiModel: 'gpt-4-turbo',
            aiPromptVersion: '1.0',
          },
        },
      },
    });
  }

  private async quarantineProduct(
    productData: DSProductDetails,
    score: ProductScore,
    shippingCost: number,
    priceMultiplier: number
  ): Promise<void> {
    const baseInfo = productData.ae_item_base_info_dto;
    const skuInfo = productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];
    const basePrice = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
    const sellingPrice = (basePrice + shippingCost) * priceMultiplier;

    await this.prisma.productQuarantine.create({
      data: {
        aliexpressId: String(baseInfo?.product_id ?? ''),
        title: baseInfo?.subject ?? 'Unknown',
        score: score.total,
        reason: score.riskFactors.join(', ') || 'Score below threshold',
        productData: productData as unknown as object,
        shippingCost,
        suggestedPrice: sellingPrice,
        scoreBreakdown: score.breakdown,
        riskFactors: score.riskFactors,
        status: QuarantineStatus.pending,
      },
    });
  }

  private async generateFrenchContent(title: string, description: string): Promise<{
    name: string;
    description: string;
    benefits: string[];
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  }> {
    try {
      const prompt = `Transform this product into luxury French cosmetics copy:

Title: ${title}
Description: ${description}

Provide JSON with:
- name: Elegant French product name (max 60 chars)
- description: Luxurious French description (150-200 words)
- benefits: Array of 3-4 key benefits in French
- metaTitle: SEO title in French (max 60 chars)
- metaDescription: SEO description in French (max 155 chars)
- keywords: Array of 5-7 French SEO keywords`;

      const result = await this.openai.generateCompletion({
        prompt,
        maxTokens: 1000,
        temperature: 0.7,
      });

      return JSON.parse(result.text);
    } catch (error) {
      console.warn('[ProductImport] AI generation failed, using fallback', error);
      // Fallback
      return {
        name: title.substring(0, 60),
        description: description.substring(0, 500),
        benefits: ['Qualité premium', 'Ingrédients naturels', 'Résultats visibles'],
        metaTitle: title.substring(0, 60),
        metaDescription: description.substring(0, 155),
        keywords: ['cosmétique', 'beauté', 'soin'],
      };
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async saveImportHistory(result: ImportJobResult, feedName: string): Promise<void> {
    await this.prisma.importHistory.create({
      data: {
        jobId: result.jobId,
        jobName: 'product-import',
        keywords: [feedName],
        totalProcessed: result.totalProcessed,
        importedCount: result.importedCount,
        quarantinedCount: result.quarantinedCount,
        rejectedCount: result.rejectedCount,
        errorCount: result.errorCount,
        averageScore: result.averageScore,
        processingTimeMs: result.processingTimeMs,
        importedProducts: result.products.filter(p => p.status === 'imported').map(p => p.aliexpressId),
        errors: result.errors,
        startedAt: new Date(Date.now() - result.processingTimeMs),
        completedAt: new Date(),
      },
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createProductImportJob(prisma: PrismaClient): ProductImportJob {
  const oauthService = createAliExpressOAuthService(prisma);
  const dsAdapter = createAliExpressDSAdapter(() => oauthService.getValidAccessToken());
  const openai = new OpenAIAdapter({ apiKey: env.OPENAI_API_KEY });

  return new ProductImportJob(prisma, dsAdapter, openai);
}
