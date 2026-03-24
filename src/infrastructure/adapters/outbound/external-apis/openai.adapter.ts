import OpenAI from 'openai';
import {
  AiContentService,
  RewriteDescriptionParams,
  RewriteDescriptionResult,
  GenerateProductTitleParams,
  LuxuryTranslationParams,
  LuxuryTranslationResult,
  LocalizedProductContent,
  SupportedLocale,
} from '@domain/ports/outbound/ai-content.port.js';
import { CircuitBreaker } from '@shared/utils/circuit-breaker.js';
import { withExponentialBackoff } from '@shared/utils/retry.js';
import { ExternalServiceError } from '@shared/errors/domain-error.js';

// ============================================================================
// Luxury Copywriting Prompts - Culturally Adapted
// ============================================================================

const LUXURY_PROMPTS_BY_LOCALE: Record<SupportedLocale, {
  culturalTone: string;
  brandVoice: string;
  seoFocus: string;
}> = {
  fr: {
    culturalTone: `Adoptez l'élégance française — sophistication discrète, raffinement absolu.
Utilisez un vocabulaire évocateur: "précieux", "d'exception", "sublimer", "révéler".
Évitez le style commercial américain agressif. Privilégiez la suggestion et l'art de vivre.`,
    brandVoice: `Ton: Maison de haute couture parisienne
- Phrases élégantes et rythmées
- Métaphores sensorielles (texture soyeuse, éclat nacré)
- Évocation du savoir-faire et de l'héritage
- Tutoiement élégant ou vouvoiement selon le positionnement`,
    seoFocus: `Mots-clés FR: soins visage luxe, cosmétique haut de gamme, beauté premium, sérum anti-âge, crème hydratante luxe, routine beauté`,
  },
  en: {
    culturalTone: `Embrace British-inspired luxury — understated elegance with quiet confidence.
Use sophisticated vocabulary: "exquisite", "curated", "artisanal", "bespoke".
Balance aspiration with accessibility. Less is more.`,
    brandVoice: `Tone: Established British beauty house
- Refined yet warm
- Sensory language (velvety texture, luminous finish)
- Heritage and craftsmanship references
- Second person singular for intimacy`,
    seoFocus: `Keywords UK/US: luxury skincare, premium beauty, anti-aging serum, high-end cosmetics, luxury face cream, skincare routine`,
  },
  es: {
    culturalTone: `Abraza la pasión española — calidez mediterránea con elegancia sofisticada.
Vocabulario evocador: "extraordinario", "exclusivo", "luminosidad", "ritual de belleza".
Conexión emocional fuerte, sensualidad refinada.`,
    brandVoice: `Tono: Casa de belleza mediterránea de prestigio
- Lenguaje cálido y apasionado pero elegante
- Referencias sensoriales (textura sedosa, brillo radiante)
- Énfasis en resultados y transformación
- Tuteo elegante`,
    seoFocus: `Palabras clave ES: cosmética de lujo, cuidado facial premium, sérum antiedad, crema hidratante lujo, belleza exclusiva`,
  },
  it: {
    culturalTone: `Incarna l'eleganza italiana — bellezza come arte, stile come filosofia di vita.
Vocabolario raffinato: "prezioso", "sublime", "luminosità", "eccellenza".
La bellezza italiana è armonia, proporzione, perfezione naturale.`,
    brandVoice: `Tono: Maison di bellezza milanese
- Linguaggio poetico e sofisticato
- Riferimenti all'arte e al design italiano
- Sensorialità mediterranea (texture setosa, luminosità dorata)
- Dare del "tu" elegante o "Lei" formale`,
    seoFocus: `Parole chiave IT: cosmetici di lusso, skincare premium, siero anti-età, crema viso lusso, bellezza italiana, cura della pelle`,
  },
  de: {
    culturalTone: `Verkörpere deutsche Präzision mit luxuriöser Raffinesse.
Anspruchsvolles Vokabular: "exquisit", "hochwertig", "Perfektion", "Wirksamkeit".
Qualität und Ergebnisse betonen, wissenschaftliche Glaubwürdigkeit.`,
    brandVoice: `Ton: Deutsches Luxus-Beautyhaus
- Präzise und elegant
- Wissenschaftlich fundiert aber nicht klinisch
- Sensorische Sprache (samtige Textur, strahlender Teint)
- Siezen für Respekt und Professionalität`,
    seoFocus: `Keywords DE: Luxus Hautpflege, Premium Kosmetik, Anti-Aging Serum, hochwertige Gesichtspflege, Luxus Schönheitspflege`,
  },
};

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

  // ============================================================================
  // Luxury Multi-Language Translation
  // ============================================================================

  private readonly PROMPT_VERSION = 'luxury-v2.0';

  async generateLuxuryTranslations(
    params: LuxuryTranslationParams
  ): Promise<LuxuryTranslationResult> {
    const translations: LocalizedProductContent[] = [];

    // Process each locale
    for (const locale of params.targetLocales) {
      const translation = await this.generateSingleLocaleTranslation(params, locale);
      translations.push(translation);
    }

    return {
      translations,
      aiModel: this.model,
      promptVersion: this.PROMPT_VERSION,
    };
  }

  private async generateSingleLocaleTranslation(
    params: LuxuryTranslationParams,
    locale: SupportedLocale
  ): Promise<LocalizedProductContent> {
    return this.circuitBreaker.execute(async () => {
      return withExponentialBackoff(async () => {
        const localeConfig = LUXURY_PROMPTS_BY_LOCALE[locale];
        const languageNames: Record<SupportedLocale, string> = {
          fr: 'French',
          en: 'English',
          es: 'Spanish',
          it: 'Italian',
          de: 'German',
        };

        const systemPrompt = `You are an elite luxury beauty copywriter creating content for a high-end cosmetics e-commerce brand.

=== TARGET MARKET: ${languageNames[locale].toUpperCase()} ===

${localeConfig.culturalTone}

=== BRAND VOICE ===
${localeConfig.brandVoice}

=== SEO OPTIMIZATION ===
${localeConfig.seoFocus}

=== STRICT GUIDELINES ===
1. NEVER mention AliExpress, China, wholesale, dropshipping, or any supplier references
2. NEVER use generic e-commerce language ("Buy now!", "Limited offer!")
3. Create content that feels like it belongs to a prestigious French/Italian beauty house
4. Focus on TRANSFORMATION and EXPERIENCE, not just features
5. Use sensory language: textures, scents, feelings, rituals
6. Make the customer feel they're discovering an exclusive secret
7. SEO keywords must feel natural, never forced

=== OUTPUT FORMAT (JSON) ===
{
  "name": "Elegant product name in ${languageNames[locale]}",
  "slug": "url-friendly-slug-in-target-language",
  "description": "Plain text description (200-300 words). Focus on the sensory experience, transformation, and luxury ritual.",
  "descriptionHtml": "Same description with HTML formatting: <p>, <strong>, <em>, <ul><li> for benefits",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
  "metaTitle": "SEO title (max 60 characters) - include main keyword naturally",
  "metaDescription": "Compelling meta description (max 155 characters) - evoke desire and curiosity",
  "metaKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

        const userPrompt = `Transform this raw product data into luxury ${languageNames[locale]} e-commerce content:

ORIGINAL PRODUCT NAME:
${params.originalName}

ORIGINAL DESCRIPTION:
${params.originalDescription}

CATEGORY: ${params.category}

${params.productBenefits?.length ? `KNOWN BENEFITS:\n${params.productBenefits.join('\n')}` : ''}

${params.ingredients ? `INGREDIENTS:\n${params.ingredients}` : ''}

Create compelling luxury content that will convert high-intent beauty shoppers in the ${languageNames[locale]} market.`;

        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 2000,
            temperature: 0.75, // Slightly higher for creative luxury copy
            response_format: { type: 'json_object' },
          });

          const content = response.choices[0]?.message?.content;
          if (content == null) {
            throw new ExternalServiceError('OpenAI', 'Empty response from API');
          }

          const result = JSON.parse(content) as Omit<LocalizedProductContent, 'locale'>;

          return {
            locale,
            ...result,
          };
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new ExternalServiceError('OpenAI', `Invalid JSON response for locale ${locale}`);
          }
          throw new ExternalServiceError(
            'OpenAI',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      });
    });
  }
}
