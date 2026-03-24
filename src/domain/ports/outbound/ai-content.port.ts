export interface RewriteDescriptionParams {
  originalDescription: string;
  productName: string;
  category: string;
  targetTone: 'luxury' | 'professional' | 'casual';
  targetLanguage: string;
  includeSeoKeywords: boolean;
  maxLength?: number;
}

export interface RewriteDescriptionResult {
  description: string;
  descriptionHtml: string;
  seoKeywords: string[];
  metaDescription: string;
}

export interface GenerateProductTitleParams {
  originalTitle: string;
  category: string;
  brand?: string;
  targetLanguage: string;
}

// ============================================================================
// Luxury Multi-Language Translation Types
// ============================================================================

export type SupportedLocale = 'fr' | 'en' | 'es' | 'it' | 'de';

export interface LuxuryTranslationParams {
  originalName: string;
  originalDescription: string;
  category: string;
  targetLocales: SupportedLocale[];
  productBenefits?: string[];
  ingredients?: string;
}

export interface LocalizedProductContent {
  locale: SupportedLocale;
  name: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  benefits: string[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

export interface LuxuryTranslationResult {
  translations: LocalizedProductContent[];
  aiModel: string;
  promptVersion: string;
}

// ============================================================================
// AI Content Service Interface
// ============================================================================

export interface AiContentService {
  rewriteDescription(params: RewriteDescriptionParams): Promise<RewriteDescriptionResult>;
  generateProductTitle(params: GenerateProductTitleParams): Promise<string>;
  generateMetaTags(productName: string, description: string): Promise<{
    title: string;
    description: string;
    keywords: string[];
  }>;
  translateContent(content: string, targetLanguage: string): Promise<string>;

  /**
   * Generate luxury copywriting translations for multiple locales
   * Uses culturally-adapted prompts for each market
   */
  generateLuxuryTranslations(params: LuxuryTranslationParams): Promise<LuxuryTranslationResult>;
}
