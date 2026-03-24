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

export interface AiContentService {
  rewriteDescription(params: RewriteDescriptionParams): Promise<RewriteDescriptionResult>;
  generateProductTitle(params: GenerateProductTitleParams): Promise<string>;
  generateMetaTags(productName: string, description: string): Promise<{
    title: string;
    description: string;
    keywords: string[];
  }>;
  translateContent(content: string, targetLanguage: string): Promise<string>;
}
