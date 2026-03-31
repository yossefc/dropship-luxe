// ============================================================================
// IMAGEN 3 ADAPTER - Luxury Product Image Generation
// ============================================================================
// Uses Google Gemini to generate unique product images on luxury backgrounds
// Replaces remove.bg - creates original, high-end visuals for dropshipping
// Note: Uses Gemini 2.0 Flash which supports multimodal generation
// ============================================================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Luxury background prompts by product category
const LUXURY_BACKGROUNDS: Record<string, string[]> = {
  skincare: [
    'elegant white marble surface with soft morning light, rose petals scattered, minimalist luxury spa aesthetic',
    'soft pink silk fabric draped elegantly, natural daylight, high-end beauty editorial style',
    'clean white ceramic tray on beige linen, fresh eucalyptus leaves, premium skincare brand aesthetic',
    'light grey stone surface with water droplets, zen spa atmosphere, professional product photography',
  ],
  makeup: [
    'sleek black marble surface with gold accents, dramatic studio lighting, luxury cosmetics brand aesthetic',
    'rose gold metallic tray, soft blush pink velvet background, glamorous beauty editorial',
    'white lacquered surface with mirror reflection, professional makeup counter style',
    'dark slate with scattered gold leaf flakes, moody luxury beauty photography',
  ],
  nails: [
    'glossy white acrylic surface, soft shadows, nail salon professional aesthetic',
    'light pink marble with gold veins, elegant manicure studio style',
    'clean glass surface with subtle reflections, modern nail art display',
    'white textured ceramic, minimalist Japanese beauty aesthetic',
  ],
  hair: [
    'natural wooden surface with soft fabric, organic beauty brand aesthetic',
    'white bathroom counter with fresh towels, premium haircare styling',
    'light beige stone with dried botanicals, natural luxury spa feel',
    'clean white surface with subtle texture, professional salon brand',
  ],
  body: [
    'natural wood spa tray with white orchids, luxury wellness resort aesthetic',
    'soft beige linen with dried lavender, artisanal body care styling',
    'white marble bathroom counter, premium body care brand',
    'light stone surface with eucalyptus and cotton, spa retreat atmosphere',
  ],
  tools: [
    'white marble vanity surface, elegant beauty tools display',
    'rose quartz stone surface, crystal healing aesthetic, luxury wellness',
    'clean acrylic organizer, modern beauty station styling',
    'soft grey velvet with gold accents, premium beauty accessories',
  ],
  perfume: [
    'dark wood with silk fabric, luxurious fragrance editorial',
    'white marble with gold details, high-end perfumery aesthetic',
    'soft blush satin with crystal elements, romantic luxury',
    'black lacquer surface with subtle reflections, sophisticated fragrance brand',
  ],
  default: [
    'clean white marble surface, soft natural lighting, luxury product photography',
    'elegant beige stone with subtle texture, minimalist premium aesthetic',
    'soft grey concrete with dramatic shadows, modern luxury brand styling',
  ],
};

export interface ImagenGenerationResult {
  success: boolean;
  generatedImageBase64?: string;
  mimeType?: string;
  prompt?: string;
  error?: string;
}

export class ImagenAdapter {
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private modelName = 'gemini-2.5-flash-image'; // Supports image generation

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'] as unknown as undefined,
        } as Record<string, unknown>,
      });
      console.log(`[Imagen] Adapter initialized with ${this.modelName} for image generation`);
    } else {
      console.warn('[Imagen] No GEMINI_API_KEY found - image generation disabled');
    }
  }

  /**
   * Get a random luxury background prompt for the product category
   */
  private getBackgroundPrompt(category: string): string {
    const categoryKey = category.toLowerCase();
    const backgrounds = LUXURY_BACKGROUNDS[categoryKey] ?? LUXURY_BACKGROUNDS['default'];
    if (!backgrounds || backgrounds.length === 0) {
      return 'clean white marble surface, soft natural lighting, luxury product photography';
    }
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    return backgrounds[randomIndex] ?? 'clean white marble surface, soft natural lighting, luxury product photography';
  }

  /**
   * Detect product category from product name/description
   */
  detectCategory(productName: string): string {
    const name = productName.toLowerCase();

    if (name.includes('serum') || name.includes('cream') || name.includes('moistur') ||
        name.includes('lotion') || name.includes('mask') || name.includes('cleanser') ||
        name.includes('toner') || name.includes('essence') || name.includes('eye')) {
      return 'skincare';
    }
    if (name.includes('lipstick') || name.includes('lip') || name.includes('mascara') ||
        name.includes('eyeshadow') || name.includes('foundation') || name.includes('concealer') ||
        name.includes('blush') || name.includes('highlighter') || name.includes('makeup')) {
      return 'makeup';
    }
    if (name.includes('nail') || name.includes('gel') || name.includes('polish') ||
        name.includes('manicure')) {
      return 'nails';
    }
    if (name.includes('hair') || name.includes('shampoo') || name.includes('conditioner') ||
        name.includes('scalp')) {
      return 'hair';
    }
    if (name.includes('body') || name.includes('scrub') || name.includes('lotion') ||
        name.includes('bath') || name.includes('shower') || name.includes('hand') ||
        name.includes('foot')) {
      return 'body';
    }
    if (name.includes('brush') || name.includes('sponge') || name.includes('roller') ||
        name.includes('gua sha') || name.includes('led') || name.includes('tool') ||
        name.includes('organizer')) {
      return 'tools';
    }
    if (name.includes('perfume') || name.includes('fragrance') || name.includes('cologne') ||
        name.includes('eau de')) {
      return 'perfume';
    }

    return 'default';
  }

  /**
   * Generate a luxury product image using Gemini's image generation
   * Takes an original product image and creates a new one on a luxury background
   */
  async generateLuxuryProductImage(
    originalImageUrl: string,
    productName: string,
    customBackground?: string
  ): Promise<ImagenGenerationResult> {
    if (!this.client) {
      return { success: false, error: 'Imagen client not initialized' };
    }

    try {
      // Detect category and get appropriate background
      const category = this.detectCategory(productName);
      const backgroundPrompt = customBackground || this.getBackgroundPrompt(category);

      // Fetch original image
      const response = await fetch(originalImageUrl);
      if (!response.ok) {
        return { success: false, error: `Failed to fetch original image: ${response.status}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      // Create the prompt for image generation
      const prompt = `You are a professional product photographer for a luxury cosmetics brand.

TASK: Create a stunning product photograph of this cosmetic product.

ORIGINAL PRODUCT: [The image provided shows the product to photograph]

BACKGROUND SETTING: ${backgroundPrompt}

REQUIREMENTS:
1. Keep the EXACT product visible, centered, and clearly identifiable
2. Product should be the hero - sharp, well-lit, professional
3. Background should complement but not distract from the product
4. Lighting should be soft, flattering, and luxurious
5. Style: High-end beauty brand campaign, editorial quality
6. Aspect ratio: Square (1:1) perfect for e-commerce
7. NO text, NO watermarks, NO logos
8. Clean, minimalist composition

Generate a single, stunning product photograph.`;

      console.log(`[Imagen] Generating luxury image for "${productName}" (${category})`);
      console.log(`[Imagen] Background: ${backgroundPrompt.substring(0, 50)}...`);

      // Use Gemini model for image generation
      if (!this.model) {
        return { success: false, error: 'Model not initialized' };
      }

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
            data: base64Image,
          },
        },
      ]);

      const generationResponse = result.response;
      const parts = generationResponse.candidates?.[0]?.content?.parts;

      if (!parts || parts.length === 0) {
        return { success: false, error: 'No response from image generation' };
      }

      // Check if we got an image in the response
      for (const part of parts) {
        // Type assertion for inlineData check
        const partWithData = part as { inlineData?: { data: string; mimeType: string } };
        if (partWithData.inlineData?.data) {
          console.log(`[Imagen] ✓ Generated luxury product image successfully`);
          return {
            success: true,
            generatedImageBase64: partWithData.inlineData.data,
            mimeType: partWithData.inlineData.mimeType || 'image/png',
            prompt: backgroundPrompt,
          };
        }
      }

      // If no image was generated, the model might not support image output
      // Return original image info for potential fallback
      const textPart = parts.find((p): p is { text: string } => 'text' in p && typeof p.text === 'string');
      return {
        success: false,
        error: textPart?.text || 'Image generation not available in this model version',
      };

    } catch (error) {
      console.error('[Imagen] Generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate multiple variations of a product image
   */
  async generateVariations(
    originalImageUrl: string,
    productName: string,
    count: number = 2
  ): Promise<ImagenGenerationResult[]> {
    const results: ImagenGenerationResult[] = [];
    const category = this.detectCategory(productName);
    const backgrounds = LUXURY_BACKGROUNDS[category] ?? LUXURY_BACKGROUNDS['default'] ?? [];

    const iterationCount = Math.min(count, backgrounds.length);
    for (let i = 0; i < iterationCount; i++) {
      const backgroundPrompt = backgrounds[i];
      if (!backgroundPrompt) continue;

      const result = await this.generateLuxuryProductImage(
        originalImageUrl,
        productName,
        backgroundPrompt
      );
      results.push(result);

      // Small delay to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Check if the adapter is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

// Singleton instance
let imagenAdapterInstance: ImagenAdapter | null = null;

export function getImagenAdapter(): ImagenAdapter {
  if (!imagenAdapterInstance) {
    imagenAdapterInstance = new ImagenAdapter();
  }
  return imagenAdapterInstance;
}

export function createImagenAdapter(): ImagenAdapter {
  return new ImagenAdapter();
}
