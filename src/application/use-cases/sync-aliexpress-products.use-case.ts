// ============================================================================
// Sync AliExpress Products Use Case
// ============================================================================
// Orchestrates the complete product sync pipeline:
// 1. Search/fetch products from AliExpress
// 2. Score and filter products (65+ threshold)
// 3. Generate luxury translations with brand-safety guardrails
// 4. Store in database with all locale translations
// ============================================================================

import { AliExpressAdapter, validateCosmeticProduct } from '@infrastructure/adapters/outbound/external-apis/aliexpress.adapter.js';
import { OpenAIAdapter } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { AliExpressProductData } from '@domain/ports/outbound/aliexpress.port.js';
import { ProductScoreResult } from '@domain/services/product-score-calculator.js';
import { PrismaClient, Prisma } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface SyncConfig {
  targetCountry: string;
  locales: string[];
  pricingStrategy: {
    markupMultiplier: number;
    minimumMargin: number;
  };
  categories?: string[];
  maxProductsPerBatch: number;
  dryRun?: boolean;
}

export interface SyncResult {
  success: boolean;
  imported: ImportedProduct[];
  quarantined: QuarantinedProduct[];
  rejected: RejectedProduct[];
  errors: SyncError[];
  stats: SyncStats;
}

export interface ImportedProduct {
  productId: string;
  aliexpressId: string;
  title: string;
  score: number;
  suggestedPrice: number;
  translations: Record<string, { name: string; slug: string }>;
}

export interface QuarantinedProduct {
  aliexpressId: string;
  title: string;
  score: number;
  reason: string;
}

export interface RejectedProduct {
  aliexpressId: string;
  title: string;
  score: number;
  reason: string;
}

export interface SyncError {
  aliexpressId: string;
  stage: 'fetch' | 'score' | 'translate' | 'store';
  message: string;
}

export interface SyncStats {
  totalProcessed: number;
  importedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  errorCount: number;
  averageScore: number;
  processingTimeMs: number;
}

// ============================================================================
// Brand Safety Guardrails for Cosmetics
// ============================================================================

const COSMETIC_GUARDRAILS = {
  // Forbidden medical claims - NEVER use these
  forbiddenClaims: [
    // Medical conditions
    'treats', 'cures', 'heals', 'medical', 'therapeutic', 'clinically proven',
    'dermatologically tested', 'doctor recommended', 'prescription',
    'eczema', 'psoriasis', 'acne treatment', 'rosacea', 'dermatitis',
    'anti-aging', 'anti-wrinkle', 'removes wrinkles', 'eliminates',
    'permanent', 'guaranteed results', 'miracle', '100% effective',
    // French
    'traite', 'guérit', 'soigne', 'médical', 'thérapeutique', 'cliniquement prouvé',
    'testé dermatologiquement', 'recommandé par les médecins',
    'anti-âge', 'anti-rides', 'élimine les rides', 'résultats garantis',
    // Spanish
    'trata', 'cura', 'sana', 'médico', 'terapéutico', 'clínicamente probado',
    'anti-edad', 'antiarrugas', 'elimina arrugas', 'resultados garantizados',
    // Italian
    'tratta', 'cura', 'guarisce', 'medico', 'terapeutico',
    'anti-età', 'antirughe', 'elimina le rughe', 'risultati garantiti',
    // German
    'behandelt', 'heilt', 'medizinisch', 'therapeutisch', 'klinisch bewiesen',
    'Anti-Aging', 'Anti-Falten', 'entfernt Falten', 'garantierte Ergebnisse',
  ],

  // Allowed cosmetic benefit language
  allowedClaims: [
    // English
    'helps reduce the appearance of', 'minimizes the look of', 'visibly improves',
    'hydrates', 'moisturizes', 'nourishes', 'softens', 'smooths',
    'enhances radiance', 'illuminates', 'refines', 'perfects',
    // French
    'aide à réduire l\'apparence de', 'minimise l\'aspect de', 'améliore visiblement',
    'hydrate', 'nourrit', 'adoucit', 'lisse', 'sublime', 'illumine', 'affine', 'parfait',
    // Spanish
    'ayuda a reducir la apariencia de', 'minimiza el aspecto de', 'mejora visiblemente',
    'hidrata', 'nutre', 'suaviza', 'alisa', 'ilumina', 'refina', 'perfecciona',
    // Italian
    'aiuta a ridurre l\'aspetto di', 'minimizza l\'aspetto di', 'migliora visibilmente',
    'idrata', 'nutre', 'ammorbidisce', 'leviga', 'illumina', 'raffina', 'perfeziona',
    // German
    'hilft das Erscheinungsbild zu reduzieren', 'minimiert das Aussehen von',
    'spendet Feuchtigkeit', 'nährt', 'glättet', 'verleiht Strahlkraft', 'verfeinert',
  ],

  // Mandatory disclaimers per locale
  disclaimers: {
    fr: 'Résultats individuels peuvent varier. Usage cosmétique uniquement.',
    en: 'Individual results may vary. For cosmetic use only.',
    es: 'Los resultados individuales pueden variar. Solo para uso cosmético.',
    it: 'I risultati individuali possono variare. Solo per uso cosmetico.',
    de: 'Individuelle Ergebnisse können variieren. Nur für kosmetische Zwecke.',
  } as Record<string, string>,
};

// ============================================================================
// Use Case Class
// ============================================================================

export class SyncAliExpressProductsUseCase {
  constructor(
    private readonly aliexpressAdapter: AliExpressAdapter,
    private readonly openaiAdapter: OpenAIAdapter,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Execute the complete sync pipeline
   */
  async execute(
    productIds: string[],
    config: SyncConfig
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const imported: ImportedProduct[] = [];
    const quarantined: QuarantinedProduct[] = [];
    const rejected: RejectedProduct[] = [];
    const errors: SyncError[] = [];
    let totalScore = 0;

    // Process products in batches
    const batches = this.chunkArray(productIds, config.maxProductsPerBatch);

    for (const batch of batches) {
      for (const aliexpressId of batch) {
        try {
          // Step 1: Evaluate product
          const evaluation = await this.aliexpressAdapter.evaluateProductForImport(
            aliexpressId,
            config.targetCountry,
            config.pricingStrategy
          );

          totalScore += evaluation.scoreResult.totalScore;

          // Step 2: Filter based on score
          if (!evaluation.eligible) {
            if (evaluation.scoreResult.totalScore >= 50) {
              quarantined.push({
                aliexpressId,
                title: evaluation.product.title,
                score: evaluation.scoreResult.totalScore,
                reason: evaluation.reason,
              });
            } else {
              rejected.push({
                aliexpressId,
                title: evaluation.product.title,
                score: evaluation.scoreResult.totalScore,
                reason: evaluation.reason,
              });
            }
            continue;
          }

          // Step 3: Generate luxury translations with brand-safety
          const translations = await this.generateSafeTranslations(
            evaluation.product,
            config.locales
          );

          // Step 4: Store in database (if not dry run)
          if (!config.dryRun) {
            const storedProduct = await this.storeProduct(
              evaluation.product,
              evaluation.suggestedPrice,
              evaluation.scoreResult,
              translations
            );

            imported.push({
              productId: storedProduct.id,
              aliexpressId,
              title: evaluation.product.title,
              score: evaluation.scoreResult.totalScore,
              suggestedPrice: evaluation.suggestedPrice,
              translations: Object.fromEntries(
                config.locales.map(locale => [
                  locale,
                  {
                    name: translations[locale]?.name ?? evaluation.product.title,
                    slug: translations[locale]?.slug ?? this.generateSlug(evaluation.product.title),
                  },
                ])
              ),
            });
          } else {
            // Dry run - just record what would be imported
            imported.push({
              productId: `dry-run-${aliexpressId}`,
              aliexpressId,
              title: evaluation.product.title,
              score: evaluation.scoreResult.totalScore,
              suggestedPrice: evaluation.suggestedPrice,
              translations: Object.fromEntries(
                config.locales.map(locale => [
                  locale,
                  {
                    name: translations[locale]?.name ?? evaluation.product.title,
                    slug: translations[locale]?.slug ?? this.generateSlug(evaluation.product.title),
                  },
                ])
              ),
            });
          }
        } catch (error) {
          errors.push({
            aliexpressId,
            stage: this.determineErrorStage(error),
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const totalProcessed = productIds.length;

    return {
      success: errors.length === 0,
      imported,
      quarantined,
      rejected,
      errors,
      stats: {
        totalProcessed,
        importedCount: imported.length,
        quarantinedCount: quarantined.length,
        rejectedCount: rejected.length,
        errorCount: errors.length,
        averageScore: totalProcessed > 0 ? Math.round(totalScore / totalProcessed) : 0,
        processingTimeMs,
      },
    };
  }

  /**
   * Generate translations with cosmetic brand-safety guardrails
   */
  private async generateSafeTranslations(
    product: AliExpressProductData,
    locales: string[]
  ): Promise<Record<string, TranslationResult>> {
    const translations: Record<string, TranslationResult> = {};

    try {
      // Generate luxury translations for all locales at once via OpenAI
      const luxuryResult = await this.openaiAdapter.generateLuxuryTranslations({
        originalName: product.title,
        originalDescription: product.description,
        category: 'cosmetics',
        targetLocales: locales as Array<'fr' | 'en' | 'es' | 'it' | 'de'>,
        productBenefits: product.attributes.map(a => `${a.name}: ${a.value}`),
      });

      // Process each locale translation
      for (const localizedContent of luxuryResult.translations) {
        const locale = localizedContent.locale;

        // Apply brand-safety guardrails
        const safeName = this.applyCosmeticGuardrails(localizedContent.name, locale);
        const safeDescription = this.applyCosmeticGuardrails(localizedContent.description, locale);
        const safeBenefits = localizedContent.benefits.map((b: string) => this.applyCosmeticGuardrails(b, locale));

        // Add disclaimer to description
        const disclaimer = COSMETIC_GUARDRAILS.disclaimers[locale] ?? COSMETIC_GUARDRAILS.disclaimers['en'];
        const descriptionWithDisclaimer = `${safeDescription}\n\n${disclaimer}`;

        translations[locale] = {
          name: safeName,
          slug: this.generateSlug(safeName),
          description: descriptionWithDisclaimer,
          descriptionHtml: this.wrapInHtml(descriptionWithDisclaimer),
          benefits: safeBenefits,
          metaTitle: localizedContent.metaTitle,
          metaDescription: localizedContent.metaDescription,
          metaKeywords: localizedContent.metaKeywords.join(', '),
        };
      }

      // Fill in any missing locales with fallback
      for (const locale of locales) {
        if (!translations[locale]) {
          translations[locale] = this.createFallbackTranslation(product, locale);
        }
      }
    } catch (error) {
      // Fallback to basic translation for all locales on error
      for (const locale of locales) {
        translations[locale] = this.createFallbackTranslation(product, locale);
      }
    }

    return translations;
  }

  /**
   * Create fallback translation when AI generation fails
   */
  private createFallbackTranslation(product: AliExpressProductData, locale: string): TranslationResult {
    return {
      name: product.title,
      slug: this.generateSlug(product.title),
      description: product.description,
      descriptionHtml: product.descriptionHtml,
      benefits: [],
      metaTitle: product.title,
      metaDescription: product.description.substring(0, 160),
      metaKeywords: product.categoryName,
    };
  }

  /**
   * Apply cosmetic brand-safety guardrails to text
   */
  private applyCosmeticGuardrails(text: string, locale: string): string {
    let safeText = text;

    // Remove forbidden claims
    for (const claim of COSMETIC_GUARDRAILS.forbiddenClaims) {
      const regex = new RegExp(claim, 'gi');
      safeText = safeText.replace(regex, '');
    }

    // Clean up double spaces and punctuation
    safeText = safeText
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,!?])/g, '$1')
      .trim();

    return safeText;
  }

  /**
   * Store product and translations in database
   * IMPORTANT: Includes FINAL cosmetic validation guard before insertion
   */
  private async storeProduct(
    product: AliExpressProductData,
    suggestedPrice: number,
    scoreResult: ProductScoreResult,
    translations: Record<string, TranslationResult>
  ): Promise<{ id: string }> {
    // ========================================================================
    // GARDE-FOU FINAL: Dernière vérification AVANT insertion en base
    // Cette validation est CRITIQUE - elle empêche tout produit non-cosmétique
    // d'être stocké dans la base de données, même si les filtres précédents
    // ont échoué pour une raison quelconque.
    // ========================================================================
    const finalValidation = validateCosmeticProduct(
      product.title,
      product.categoryId,
      product.categoryName
    );

    if (!finalValidation.valid) {
      throw new Error(
        `INSERTION BLOQUÉE: ${finalValidation.reason}. ` +
        `Produit "${product.title}" (${product.productId}) rejeté par le garde-fou cosmétique.`
      );
    }
    // ========================================================================

    // Create product with translations in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Find or create category
      let category = await tx.category.findFirst({
        where: { aliexpressId: product.categoryId },
      });

      if (!category) {
        category = await tx.category.create({
          data: {
            aliexpressId: product.categoryId,
            name: product.categoryName,
            slug: this.generateSlug(product.categoryName),
            sortOrder: 0,
          },
        });
      }

      // Create product
      const createdProduct = await tx.product.create({
        data: {
          aliexpressId: product.productId,
          aliexpressUrl: `https://www.aliexpress.com/item/${product.productId}.html`,
          supplierId: product.supplierId,
          supplierName: product.supplierName,
          categoryId: category.id,
          basePrice: new Prisma.Decimal(product.price),
          sellingPrice: new Prisma.Decimal(suggestedPrice),
          currency: 'EUR',
          costPrice: new Prisma.Decimal(product.price),
          weight: new Prisma.Decimal(product.weight),
          dimensions: {
            length: product.dimensions.length,
            width: product.dimensions.width,
            height: product.dimensions.height,
          } as Prisma.JsonObject,
          images: product.images,
          isActive: true,
          isFeatured: scoreResult.totalScore >= 80,
          stock: product.stock,
          importScore: scoreResult.totalScore,
          importScoreBreakdown: scoreResult.breakdown as unknown as Prisma.JsonObject,
          riskFactors: scoreResult.riskFactors,
        },
      });

      // Create translations
      for (const [locale, translation] of Object.entries(translations)) {
        // Convert metaKeywords string to array for Prisma
        const keywordsArray = translation.metaKeywords
          ? translation.metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
          : [];

        await tx.productTranslation.create({
          data: {
            productId: createdProduct.id,
            locale,
            name: translation.name,
            slug: translation.slug,
            description: translation.description,
            descriptionHtml: translation.descriptionHtml,
            benefits: translation.benefits,
            metaTitle: translation.metaTitle,
            metaDescription: translation.metaDescription,
            metaKeywords: keywordsArray,
            aiModel: 'gpt-4',
            aiPromptVersion: '1.0',
            generatedAt: new Date(),
          },
        });
      }

      // Create variants if available
      for (const variant of product.variants) {
        await tx.productVariant.create({
          data: {
            productId: createdProduct.id,
            aliexpressSku: variant.skuId,
            name: variant.name,
            price: new Prisma.Decimal(variant.price),
            stock: variant.stock,
            attributes: variant.attributes as Prisma.JsonObject,
            image: variant.image ?? null,
            isActive: true,
          },
        });
      }

      return createdProduct;
    });

    return { id: result.id };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  private wrapInHtml(text: string): string {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private determineErrorStage(error: unknown): 'fetch' | 'score' | 'translate' | 'store' {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('aliexpress') || message.includes('product not found')) {
        return 'fetch';
      }
      if (message.includes('score') || message.includes('margin')) {
        return 'score';
      }
      if (message.includes('openai') || message.includes('translation')) {
        return 'translate';
      }
    }
    return 'store';
  }
}

// ============================================================================
// Types for Translations
// ============================================================================

interface TranslationResult {
  name: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  benefits: string[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}
