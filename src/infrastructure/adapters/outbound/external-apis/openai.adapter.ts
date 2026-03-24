import OpenAI from 'openai';
import {
  AiContentService,
  RewriteDescriptionParams,
  RewriteDescriptionResult,
  GenerateProductTitleParams,
} from '@domain/ports/outbound/ai-content.port.js';
import { CircuitBreaker } from '@shared/utils/circuit-breaker.js';
import { withExponentialBackoff } from '@shared/utils/retry.js';
import { ExternalServiceError } from '@shared/errors/domain-error.js';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class OpenAIAdapter implements AiContentService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4-turbo-preview';
    this.maxTokens = config.maxTokens ?? 2000;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000,
      resetTimeout: 120000,
    });
  }

  async rewriteDescription(params: RewriteDescriptionParams): Promise<RewriteDescriptionResult> {
    return this.circuitBreaker.execute(async () => {
      return withExponentialBackoff(async () => {
        const toneInstructions = {
          luxury: 'Use sophisticated, elegant language that evokes exclusivity and premium quality. Emphasize craftsmanship, materials, and attention to detail.',
          professional: 'Use clear, informative language that highlights features and benefits. Focus on quality and value.',
          casual: 'Use friendly, approachable language that connects with everyday shoppers. Make it relatable and engaging.',
        };

        const systemPrompt = `You are a luxury e-commerce copywriter specializing in high-end product descriptions.
Your task is to transform product descriptions into compelling, SEO-optimized content.

Guidelines:
- ${toneInstructions[params.targetTone]}
- Write in ${params.targetLanguage}
- Never mention the original source or manufacturer
- Focus on benefits, not just features
- Include sensory language and emotional triggers
- Optimize for SEO without keyword stuffing
${params.maxLength != null ? `- Keep the description under ${params.maxLength} characters` : ''}

Output format (JSON):
{
  "description": "Plain text description",
  "descriptionHtml": "HTML formatted description with <p>, <ul>, <li>, <strong> tags",
  "seoKeywords": ["keyword1", "keyword2", ...],
  "metaDescription": "SEO meta description (max 160 characters)"
}`;

        const userPrompt = `Rewrite this product description for a luxury e-commerce site:

Product Name: ${params.productName}
Category: ${params.category}

Original Description:
${params.originalDescription}`;

        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: this.maxTokens,
            temperature: 0.7,
            response_format: { type: 'json_object' },
          });

          const content = response.choices[0]?.message?.content;
          if (content == null) {
            throw new ExternalServiceError('OpenAI', 'Empty response from API');
          }

          const result = JSON.parse(content) as RewriteDescriptionResult;
          return result;
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new ExternalServiceError('OpenAI', 'Invalid JSON response');
          }
          throw new ExternalServiceError(
            'OpenAI',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      });
    });
  }

  async generateProductTitle(params: GenerateProductTitleParams): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const systemPrompt = `You are a luxury e-commerce copywriter. Generate a compelling, SEO-friendly product title.

Guidelines:
- Write in ${params.targetLanguage}
- Keep it under 70 characters
- Include the brand if provided
- Make it elegant and descriptive
- Never use ALL CAPS
- Avoid excessive punctuation

Return only the title, nothing else.`;

        const userPrompt = `Generate a luxury product title:
Original: ${params.originalTitle}
Category: ${params.category}
${params.brand != null ? `Brand: ${params.brand}` : ''}`;

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 100,
          temperature: 0.7,
        });

        return response.choices[0]?.message?.content?.trim() ?? params.originalTitle;
    });
  }

  async generateMetaTags(
    productName: string,
    description: string
  ): Promise<{ title: string; description: string; keywords: string[] }> {
    return this.circuitBreaker.execute(async () => {
      const systemPrompt = `Generate SEO meta tags for an e-commerce product. Return JSON:
{
  "title": "SEO title (max 60 chars)",
  "description": "Meta description (max 160 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Product: ${productName}\nDescription: ${description}` },
        ],
        max_tokens: 300,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content == null) {
        return {
          title: productName,
          description: description.substring(0, 160),
          keywords: [],
        };
      }

      return JSON.parse(content) as { title: string; description: string; keywords: string[] };
    });
  }

  async translateContent(content: string, targetLanguage: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Translate the following content to ${targetLanguage}. Maintain the same tone, style, and formatting. Return only the translation.`,
          },
          { role: 'user', content },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content ?? content;
    });
  }
}
