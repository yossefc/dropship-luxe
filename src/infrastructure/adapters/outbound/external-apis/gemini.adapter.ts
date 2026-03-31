import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// Gemini AI Adapter - Image Analysis for Product Import
// ============================================================================

interface ImageAnalysisResult {
  isCleanProductImage: boolean;
  hasMultipleProducts: boolean;
  hasText: boolean;
  hasWhiteBackground: boolean;
  confidence: number;
  reason: string;
}

interface ImageCandidateResult {
  url: string;
  score: number; // 0-100, higher is better for background removal
  isSingleProduct: boolean;
  hasProductClearlyVisible: boolean;
  isCollageOrInfographic: boolean;
  reason: string;
}

interface ProductBackgroundSuggestion {
  backgroundColor: string; // Hex color code (e.g., "F5E6E0")
  gradientColors?: string[]; // Optional gradient (2 colors)
  style: 'solid' | 'gradient' | 'soft';
  category: string; // skincare, makeup, nails, hair, etc.
  reason: string;
}

export class GeminiAdapter {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Analyze a product image to check if it's suitable for a luxury e-commerce site
   * - Product should be alone (not multiple items)
   * - Clean background (white or simple)
   * - No promotional text overlays
   */
  async analyzeProductImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      // Fetch image and convert to base64
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return {
          isCleanProductImage: false,
          hasMultipleProducts: false,
          hasText: false,
          hasWhiteBackground: false,
          confidence: 0,
          reason: 'Failed to fetch image',
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const prompt = `Analyze this product image for a LUXURY e-commerce website. Be VERY STRICT.

REQUIREMENTS - ALL must be YES:
1. PRODUCT ALONE: Is there ONLY ONE product visible? No accessories, no swatches, no hands, no nail tips, no color samples, no brushes, no extra items. Just the single product bottle/tube/container.
2. CLEAN BACKGROUND: Is the background plain white, light gray, or simple solid color? No patterns, no lifestyle settings, no hands holding the product.
3. NO TEXT: Is the image completely free of promotional text, watermarks, price tags, brand logos overlaid, "before/after" text?
4. PROFESSIONAL: Is this a clean, high-quality product shot suitable for a luxury website?

Be STRICT: If there are nail swatches, color samples, brushes, or ANY extra items besides the single product container, answer "singleProduct": false.

Respond ONLY in this exact JSON format:
{
  "singleProduct": true/false,
  "cleanBackground": true/false,
  "noText": true/false,
  "professional": true/false,
  "reason": "brief explanation"
}`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
      ]);

      const text = result.response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('[Gemini] Could not parse response:', text);
        return {
          isCleanProductImage: true, // Default to true if can't parse
          hasMultipleProducts: false,
          hasText: false,
          hasWhiteBackground: true,
          confidence: 0.5,
          reason: 'Could not parse AI response',
        };
      }

      const analysis = JSON.parse(jsonMatch[0]);

      const isClean = analysis.singleProduct && analysis.cleanBackground && analysis.noText && analysis.professional;

      return {
        isCleanProductImage: isClean,
        hasMultipleProducts: !analysis.singleProduct,
        hasText: !analysis.noText,
        hasWhiteBackground: analysis.cleanBackground,
        confidence: isClean ? 0.9 : 0.7,
        reason: analysis.reason || 'Analysis complete',
      };
    } catch (error) {
      console.error('[Gemini] Image analysis error:', error);
      return {
        isCleanProductImage: true, // Default to true on error to not block imports
        hasMultipleProducts: false,
        hasText: false,
        hasWhiteBackground: true,
        confidence: 0,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if an image URL is likely a clean product image based on quick heuristics
   * (faster than full AI analysis, use as pre-filter)
   */
  quickImageCheck(imageUrl: string): boolean {
    const url = imageUrl.toLowerCase();

    // Reject obvious promotional images
    const badPatterns = [
      'banner', 'promo', 'sale', 'discount', 'shipping',
      'size_chart', 'description', 'detail_desc',
    ];

    if (badPatterns.some(pattern => url.includes(pattern))) {
      return false;
    }

    // Prefer main product images (often have specific patterns)
    const goodPatterns = [
      'main', 'primary', 'thumb', 'product',
    ];

    return true; // Default to true for other images
  }

  /**
   * Filter images array to keep only those with product ALONE on clean background
   * Analyzes ALL images to maximize chances of finding valid ones
   */
  async filterProductAloneImages(imageUrls: string[], maxValidImages: number = 4): Promise<string[]> {
    const validImages: string[] = [];

    console.log(`[Gemini] Analyzing ${imageUrls.length} images to find product-alone shots...`);

    // Analyze ALL images to find the best ones
    for (const url of imageUrls) {
      try {
        const analysis = await this.analyzeProductImage(url);
        if (analysis.isCleanProductImage) {
          validImages.push(url);
          console.log(`[Gemini] ✓ Image OK (${validImages.length}/${maxValidImages}): ${analysis.reason}`);

          // Stop when we have enough valid images
          if (validImages.length >= maxValidImages) {
            console.log(`[Gemini] Found ${maxValidImages} valid images, stopping analysis`);
            break;
          }
        } else {
          console.log(`[Gemini] ✗ Rejected: ${analysis.reason}`);
        }
      } catch (error) {
        console.error(`[Gemini] Error analyzing image: ${error}`);
      }
    }

    console.log(`[Gemini] Result: ${validImages.length} product-alone images found out of ${imageUrls.length}`);
    return validImages;
  }

  /**
   * Find the BEST candidate image for background removal
   * Even if not perfect, find an image with the product clearly visible
   * that can be processed by remove.bg
   */
  async findBestCandidateForBackgroundRemoval(imageUrls: string[]): Promise<ImageCandidateResult | null> {
    console.log(`[Gemini] Finding best candidate for background removal from ${imageUrls.length} images...`);

    const candidates: ImageCandidateResult[] = [];

    for (const url of imageUrls) {
      try {
        // Fetch and convert image
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        const prompt = `Analyze this product image for BACKGROUND REMOVAL processing.

Score this image from 0-100 based on how suitable it is for background removal:
- HIGH SCORE (80-100): Single product clearly visible, even with busy background
- MEDIUM SCORE (50-79): Product visible but with some extras (text, hands OK if product is main focus)
- LOW SCORE (20-49): Multiple products but one is clearly the main subject
- VERY LOW (0-19): Collage, infographic, or no clear single product

IMPORTANT: We will use AI to remove the background, so:
- Busy backgrounds are OK (they get removed)
- Text on the image is OK (gets removed)
- Hands holding product: score 60 (product can be extracted)
- The KEY is: can we identify ONE main product to extract?

Respond in JSON:
{
  "score": 0-100,
  "isSingleProduct": true/false,
  "hasProductClearlyVisible": true/false,
  "isCollageOrInfographic": true/false,
  "reason": "brief explanation"
}`;

        const result = await this.model.generateContent([
          prompt,
          { inlineData: { mimeType, data: base64 } },
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const analysis = JSON.parse(jsonMatch[0]);

        candidates.push({
          url,
          score: analysis.score ?? 0,
          isSingleProduct: analysis.isSingleProduct ?? false,
          hasProductClearlyVisible: analysis.hasProductClearlyVisible ?? false,
          isCollageOrInfographic: analysis.isCollageOrInfographic ?? true,
          reason: analysis.reason ?? 'Unknown',
        });

        console.log(`[Gemini] Candidate score ${analysis.score}/100: ${analysis.reason}`);

        // If we find a great candidate (score >= 80), use it immediately
        if (analysis.score >= 80) {
          const bestCandidate = candidates[candidates.length - 1]!;
          console.log(`[Gemini] Found excellent candidate with score ${analysis.score}`);
          return bestCandidate;
        }
      } catch (error) {
        console.error(`[Gemini] Error analyzing candidate:`, error);
      }
    }

    // Sort by score and return the best one
    candidates.sort((a, b) => b.score - a.score);

    const topCandidate = candidates[0];
    if (topCandidate && topCandidate.score >= 40) {
      console.log(`[Gemini] Best candidate: score ${topCandidate.score}/100`);
      return topCandidate;
    }

    console.log(`[Gemini] No suitable candidate found for background removal`);
    return null;
  }

  /**
   * Generate luxury product name and description in French
   */
  async generateProductContent(
    originalName: string,
    originalDescription: string,
    category: string = 'cosmétique'
  ): Promise<{ name: string; description: string; benefits: string[] }> {
    try {
      const prompt = `Tu es un expert en marketing pour une marque de cosmétiques de luxe.

Produit original: ${originalName}
Description originale: ${originalDescription.substring(0, 500)}

Crée une fiche produit luxe. Réponds UNIQUEMENT en JSON valide:
{
  "name": "Nom simple et elegant avec marque si presente (max 50 caracteres)",
  "description": "Description marketing 2-3 phrases, elegante, mettant en avant les benefices",
  "benefits": ["Benefice 1", "Benefice 2", "Benefice 3"]
}

Regles strictes:
- Garde le nom de marque si present (ex: CANNI, Born Pretty, Venalisa)
- NE JAMAIS mentionner AliExpress, Chine, dropshipping, prix bas
- Ton luxueux et professionnel
- Focus sur qualite et resultats`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[Gemini] Generated: "${parsed.name}"`);
      return parsed;
    } catch (error) {
      console.error('[Gemini] Content generation error:', error);
      // Extract brand from original name
      const brandMatch = originalName.match(/^([A-Z][a-zA-Z]+)\s/);
      const brand = brandMatch ? brandMatch[1] + ' ' : '';

      return {
        name: brand + originalName.substring(0, 50).replace(/^\d+\s*(pcs?|pieces?)\s*/i, ''),
        description: 'Découvrez ce produit de qualité professionnelle pour des résultats exceptionnels.',
        benefits: ['Qualité premium', 'Résultats visibles', 'Application facile'],
      };
    }
  }

  /**
   * Analyze product image and suggest an elegant background color
   * Returns complementary/aesthetic colors based on product type and appearance
   */
  async suggestBackgroundColor(
    imageUrl: string,
    productName: string = ''
  ): Promise<ProductBackgroundSuggestion> {
    try {
      // Fetch and convert image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return this.getDefaultBackground(productName);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const prompt = `Tu es un directeur artistique pour une marque de cosmétiques de luxe.

Analyse ce produit cosmétique et suggère une couleur de fond ELEGANTE pour le mettre en valeur sur un site e-commerce luxe.

Produit: ${productName || 'Cosmétique'}

RÈGLES DE COULEURS PAR CATÉGORIE:
- SKINCARE (crèmes, sérums, soins visage): Rose poudré (#F5E6E0), Beige nude (#F7F3EF), Blanc nacré (#FAFAF8)
- MAQUILLAGE (lipstick, eyeshadow): Taupe élégant (#E8E0DA), Rose quartz (#F4E8E8), Champagne (#F5F0E6)
- ONGLES (vernis, gel): Gris perle (#EAEAEA), Blanc pur (#FFFFFF), Rose pâle (#FFF0F0)
- CHEVEUX (soins capillaires): Beige doré (#F5EFDE), Blanc crème (#FFFEF5)
- PARFUM: Doré pâle (#F5F0E0), Rose poudré (#F8E8E5)

La couleur doit:
1. CONTRASTER avec le produit (si produit clair → fond légèrement plus soutenu)
2. Être DOUCE et LUXUEUSE (pas de couleurs vives)
3. Mettre en VALEUR le produit

Réponds UNIQUEMENT en JSON:
{
  "backgroundColor": "HEXCODE sans #, ex: F5E6E0",
  "category": "skincare/makeup/nails/hair/perfume",
  "reason": "explication courte"
}`;

      const result = await this.model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64 } },
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return this.getDefaultBackground(productName);
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate hex color
      let bgColor = analysis.backgroundColor?.replace('#', '') || 'F5E6E0';
      if (!/^[0-9A-Fa-f]{6}$/.test(bgColor)) {
        bgColor = 'F5E6E0';
      }

      console.log(`[Gemini] Background suggestion: #${bgColor} (${analysis.category}): ${analysis.reason}`);

      return {
        backgroundColor: bgColor,
        style: 'solid',
        category: analysis.category || 'cosmetic',
        reason: analysis.reason || 'Couleur élégante adaptée au produit',
      };
    } catch (error) {
      console.error('[Gemini] Background suggestion error:', error);
      return this.getDefaultBackground(productName);
    }
  }

  /**
   * Get default background based on product name keywords
   */
  private getDefaultBackground(productName: string): ProductBackgroundSuggestion {
    const name = productName.toLowerCase();

    // Skincare products - soft pink/nude
    if (name.includes('cream') || name.includes('serum') || name.includes('lotion') ||
        name.includes('moistur') || name.includes('crème') || name.includes('soin')) {
      return {
        backgroundColor: 'F5E6E0',
        style: 'solid',
        category: 'skincare',
        reason: 'Rose poudré élégant pour soins visage',
      };
    }

    // Nail products - pearl grey
    if (name.includes('nail') || name.includes('gel') || name.includes('polish') ||
        name.includes('ongle') || name.includes('vernis')) {
      return {
        backgroundColor: 'EAEAEA',
        style: 'solid',
        category: 'nails',
        reason: 'Gris perle sophistiqué pour produits ongles',
      };
    }

    // Makeup - champagne
    if (name.includes('lipstick') || name.includes('mascara') || name.includes('eyeshadow') ||
        name.includes('foundation') || name.includes('maquillage')) {
      return {
        backgroundColor: 'F5F0E6',
        style: 'solid',
        category: 'makeup',
        reason: 'Champagne luxueux pour maquillage',
      };
    }

    // Hair - warm beige
    if (name.includes('hair') || name.includes('shampoo') || name.includes('cheveux') ||
        name.includes('capillaire')) {
      return {
        backgroundColor: 'F5EFDE',
        style: 'solid',
        category: 'hair',
        reason: 'Beige doré pour soins capillaires',
      };
    }

    // Default - soft off-white with warmth
    return {
      backgroundColor: 'FAF8F5',
      style: 'solid',
      category: 'cosmetic',
      reason: 'Blanc nacré élégant',
    };
  }
}

// Singleton instance
let geminiAdapter: GeminiAdapter | null = null;

export function getGeminiAdapter(): GeminiAdapter | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  if (!geminiAdapter) {
    try {
      geminiAdapter = new GeminiAdapter();
    } catch (error) {
      console.error('[Gemini] Failed to initialize:', error);
      return null;
    }
  }

  return geminiAdapter;
}
