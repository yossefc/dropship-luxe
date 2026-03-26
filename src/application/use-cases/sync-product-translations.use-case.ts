// ============================================================================
// Sync Product Translations Use Case
// ============================================================================
// Orchestrates the AI-powered translation of product content for all supported
// locales. Generates SEO-optimized luxury copywriting adapted to each market.
// ============================================================================

import {
  AiContentService,
  SupportedLocale,
  LocalizedProductContent,
} from '@domain/ports/outbound/ai-content.port.js';
import { logger } from '@infrastructure/config/logger.js';

export interface SyncProductTranslationsInput {
  productId: string;
  originalName: string;
  originalDescription: string;
  category: string;
  targetLocales?: SupportedLocale[];
  productBenefits?: string[];
  ingredients?: string;
}

export interface SyncProductTranslationsOutput {
  productId: string;
  translations: LocalizedProductContent[];
  aiModel: string;
  promptVersion: string;
  processingTimeMs: number;
}

export interface ProductTranslationRepository {
  upsertTranslations(
    productId: string,
    translations: LocalizedProductContent[],
    metadata: { aiModel: string; promptVersion: string }
  ): Promise<void>;

  getExistingTranslations(productId: string): Promise<LocalizedProductContent[]>;
}

export class SyncProductTranslationsUseCase {
  private readonly DEFAULT_LOCALES: SupportedLocale[] = ['fr', 'en', 'es', 'it', 'de'];

  constructor(
    private readonly aiContentService: AiContentService,
    private readonly translationRepository: ProductTranslationRepository
  ) {}

  async execute(input: SyncProductTranslationsInput): Promise<SyncProductTranslationsOutput> {
    const startTime = Date.now();
    const targetLocales = input.targetLocales ?? this.DEFAULT_LOCALES;

    logger.info('Starting product translation sync', {
      productId: input.productId,
      locales: targetLocales,
    });

    try {
      // Build params object, only including optional properties if defined
      const translationParams: {
        originalName: string;
        originalDescription: string;
        category: string;
        targetLocales: SupportedLocale[];
        productBenefits?: string[];
        ingredients?: string;
      } = {
        originalName: input.originalName,
        originalDescription: input.originalDescription,
        category: input.category,
        targetLocales,
      };

      // Only add optional params if they have values
      if (input.productBenefits !== undefined) translationParams.productBenefits = input.productBenefits;
      if (input.ingredients !== undefined) translationParams.ingredients = input.ingredients;

      // Generate luxury translations for all target locales
      const result = await this.aiContentService.generateLuxuryTranslations(translationParams);

      // Persist translations to database
      await this.translationRepository.upsertTranslations(
        input.productId,
        result.translations,
        {
          aiModel: result.aiModel,
          promptVersion: result.promptVersion,
        }
      );

      const processingTimeMs = Date.now() - startTime;

      logger.info('Product translation sync completed', {
        productId: input.productId,
        localesProcessed: result.translations.length,
        processingTimeMs,
      });

      return {
        productId: input.productId,
        translations: result.translations,
        aiModel: result.aiModel,
        promptVersion: result.promptVersion,
        processingTimeMs,
      };
    } catch (error) {
      logger.error('Product translation sync failed', {
        productId: input.productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Sync translations only for missing locales
   */
  async syncMissingTranslations(
    input: SyncProductTranslationsInput
  ): Promise<SyncProductTranslationsOutput> {
    const allLocales = input.targetLocales ?? this.DEFAULT_LOCALES;

    // Check which translations already exist
    const existingTranslations = await this.translationRepository.getExistingTranslations(
      input.productId
    );
    const existingLocales = new Set(existingTranslations.map((t) => t.locale));

    // Only process missing locales
    const missingLocales = allLocales.filter((locale) => !existingLocales.has(locale));

    if (missingLocales.length === 0) {
      logger.info('All translations already exist', {
        productId: input.productId,
        existingLocales: Array.from(existingLocales),
      });

      return {
        productId: input.productId,
        translations: existingTranslations,
        aiModel: 'cached',
        promptVersion: 'existing',
        processingTimeMs: 0,
      };
    }

    return this.execute({
      ...input,
      targetLocales: missingLocales as SupportedLocale[],
    });
  }
}
