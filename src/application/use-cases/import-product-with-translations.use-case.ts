// ============================================================================
// Import Product With Translations Use Case
// ============================================================================
// Complete product import flow: fetches from supplier, generates luxury
// copywriting in all locales, and stores everything in the database.
// ============================================================================

import {
  AiContentService,
  SupportedLocale,
} from '@domain/ports/outbound/ai-content.port.js';
import { logger } from '@infrastructure/config/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface SupplierProductData {
  aliexpressId: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  price: number;
  currency: string;
  stock: number;
  variants?: {
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
  }[];
  supplierId: string;
  supplierName: string;
  rating: number;
  orderVolume: number;
  shippingTimeMin: number;
  shippingTimeMax: number;
}

export interface ImportProductInput {
  supplierProduct: SupplierProductData;
  marginPercentage: number;
  targetLocales?: SupportedLocale[];
}

export interface ImportProductOutput {
  productId: string;
  sku: string;
  translationsGenerated: number;
  processingTimeMs: number;
}

export interface ProductRepository {
  createWithTranslations(data: {
    aliexpressId: string;
    sku: string;
    name: string;
    originalName: string;
    originalDescription: string;
    category: string;
    images: string[];
    supplierPrice: number;
    supplierCurrency: string;
    sellingPrice: number;
    sellingCurrency: string;
    stock: number;
    rating: number;
    orderVolume: number;
    supplierId: string;
    supplierName: string;
    shippingTimeMin: number;
    shippingTimeMax: number;
    translations: {
      locale: string;
      name: string;
      slug: string;
      description: string;
      descriptionHtml: string;
      benefits: string[];
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string[];
      aiModel: string;
      aiPromptVersion: string;
    }[];
  }): Promise<{ id: string; sku: string }>;

  existsByAliexpressId(aliexpressId: string): Promise<boolean>;
}

// ============================================================================
// Use Case
// ============================================================================

export class ImportProductWithTranslationsUseCase {
  private readonly DEFAULT_LOCALES: SupportedLocale[] = ['fr', 'en', 'es', 'it', 'de'];

  constructor(
    private readonly aiContentService: AiContentService,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(input: ImportProductInput): Promise<ImportProductOutput> {
    const startTime = Date.now();
    const { supplierProduct, marginPercentage, targetLocales } = input;
    const locales = targetLocales ?? this.DEFAULT_LOCALES;

    logger.info('Starting product import with translations', {
      aliexpressId: supplierProduct.aliexpressId,
      name: supplierProduct.name,
      locales,
    });

    // Check if product already exists
    const exists = await this.productRepository.existsByAliexpressId(
      supplierProduct.aliexpressId
    );

    if (exists) {
      throw new Error(`Product already exists: ${supplierProduct.aliexpressId}`);
    }

    // Generate SKU
    const sku = this.generateSku(supplierProduct.category, supplierProduct.aliexpressId);

    // Calculate selling price with margin
    const sellingPrice = this.calculateSellingPrice(
      supplierProduct.price,
      marginPercentage
    );

    // Generate luxury translations for all locales
    logger.info('Generating luxury translations', {
      aliexpressId: supplierProduct.aliexpressId,
      localesCount: locales.length,
    });

    const translationResult = await this.aiContentService.generateLuxuryTranslations({
      originalName: supplierProduct.name,
      originalDescription: supplierProduct.description,
      category: supplierProduct.category,
      targetLocales: locales,
    });

    // Prepare translations for database
    const translationsForDb = translationResult.translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      slug: t.slug,
      description: t.description,
      descriptionHtml: t.descriptionHtml,
      benefits: t.benefits,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
      metaKeywords: t.metaKeywords,
      aiModel: translationResult.aiModel,
      aiPromptVersion: translationResult.promptVersion,
    }));

    // Use French name as base name (primary market)
    const frenchTranslation = translationResult.translations.find(
      (t) => t.locale === 'fr'
    );
    const baseName = frenchTranslation?.name ?? supplierProduct.name;

    // Create product with all translations
    const { id: productId } = await this.productRepository.createWithTranslations({
      aliexpressId: supplierProduct.aliexpressId,
      sku,
      name: baseName,
      originalName: supplierProduct.name,
      originalDescription: supplierProduct.description,
      category: supplierProduct.category,
      images: supplierProduct.images,
      supplierPrice: supplierProduct.price,
      supplierCurrency: supplierProduct.currency,
      sellingPrice,
      sellingCurrency: 'EUR',
      stock: supplierProduct.stock,
      rating: supplierProduct.rating,
      orderVolume: supplierProduct.orderVolume,
      supplierId: supplierProduct.supplierId,
      supplierName: supplierProduct.supplierName,
      shippingTimeMin: supplierProduct.shippingTimeMin,
      shippingTimeMax: supplierProduct.shippingTimeMax,
      translations: translationsForDb,
    });

    const processingTimeMs = Date.now() - startTime;

    logger.info('Product import completed', {
      productId,
      sku,
      translationsGenerated: translationResult.translations.length,
      processingTimeMs,
    });

    return {
      productId,
      sku,
      translationsGenerated: translationResult.translations.length,
      processingTimeMs,
    };
  }

  private generateSku(category: string, aliexpressId: string): string {
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const idSuffix = aliexpressId.slice(-6);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${categoryPrefix}-${idSuffix}-${timestamp}`;
  }

  private calculateSellingPrice(supplierPrice: number, marginPercentage: number): number {
    const margin = supplierPrice * (marginPercentage / 100);
    const sellingPrice = supplierPrice + margin;
    // Round to 2 decimal places
    return Math.round(sellingPrice * 100) / 100;
  }
}
