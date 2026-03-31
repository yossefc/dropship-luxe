// ============================================================================
// Background Removal Adapter - Clean product images automatically
// ============================================================================
// Uses remove.bg API to remove backgrounds and create clean product images
// suitable for luxury e-commerce.

interface BackgroundRemovalResult {
  success: boolean;
  cleanImageUrl?: string;
  cleanImageBase64?: string;
  originalUrl: string;
  error?: string;
}

export class BackgroundRemovalAdapter {
  private apiKey: string;
  private apiUrl = 'https://api.remove.bg/v1.0/removebg';

  constructor() {
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) {
      throw new Error('REMOVEBG_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  /**
   * Remove background from image URL with customizable styling
   * Returns base64 encoded PNG with professional styling:
   * - Customizable background color (adapts to product category)
   * - Natural shadow for depth
   * - Proper cropping and centering
   * - High resolution output
   *
   * @param imageUrl - URL of the image to process
   * @param options - Optional styling options
   */
  async removeBackground(
    imageUrl: string,
    options?: {
      backgroundColor?: string; // Hex color without # (e.g., "F5E6E0")
      addShadow?: boolean;
      cropMargin?: string; // e.g., "10%" or "15%"
    }
  ): Promise<BackgroundRemovalResult> {
    try {
      // Default options
      const bgColor = options?.backgroundColor || 'FAFAFA';
      const addShadow = options?.addShadow !== false; // Default true
      const cropMargin = options?.cropMargin || '10%';

      console.log(`[RemoveBG] Processing image with PRO settings: ${imageUrl.substring(0, 50)}...`);
      console.log(`[RemoveBG] Background color: #${bgColor}, Shadow: ${addShadow}, Margin: ${cropMargin}`);

      const formData = new FormData();
      formData.append('image_url', imageUrl);

      // === QUALITY SETTINGS ===
      formData.append('size', 'full'); // full resolution for best quality
      formData.append('type', 'product'); // optimized for product photography
      formData.append('format', 'png'); // PNG for best quality

      // === PROFESSIONAL STYLING ===
      formData.append('bg_color', bgColor); // Dynamic background color adapted to product
      formData.append('add_shadow', addShadow ? 'true' : 'false'); // Natural drop shadow for depth

      // === CROPPING & POSITIONING ===
      formData.append('crop', 'true'); // Crop to product bounds
      formData.append('crop_margin', cropMargin); // Margin around product

      console.log(`[RemoveBG] Settings: full size, product type, bg #${bgColor}, shadow: ${addShadow}`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RemoveBG] API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          originalUrl: imageUrl,
          error: `API error: ${response.status}`,
        };
      }

      // Get result as base64
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Calculate approximate dimensions from file size
      const sizeKB = Math.round(base64.length / 1024);
      console.log(`[RemoveBG] ✓ Professional image created: ${sizeKB}KB (shadow + margin applied)`);

      return {
        success: true,
        originalUrl: imageUrl,
        cleanImageBase64: base64,
      };
    } catch (error) {
      console.error(`[RemoveBG] Error:`, error);
      return {
        success: false,
        originalUrl: imageUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process multiple images and return cleaned versions
   * Stops at first successful image
   *
   * @param imageUrls - Array of image URLs to try
   * @param options - Optional styling options (passed to removeBackground)
   */
  async processImages(
    imageUrls: string[],
    options?: {
      backgroundColor?: string;
      addShadow?: boolean;
      cropMargin?: string;
    }
  ): Promise<BackgroundRemovalResult | null> {
    for (const url of imageUrls) {
      const result = await this.removeBackground(url, options);
      if (result.success) {
        return result;
      }
    }
    return null;
  }
}

// Singleton instance
let backgroundRemovalAdapter: BackgroundRemovalAdapter | null = null;

export function getBackgroundRemovalAdapter(): BackgroundRemovalAdapter | null {
  if (!process.env.REMOVEBG_API_KEY) {
    return null;
  }

  if (!backgroundRemovalAdapter) {
    try {
      backgroundRemovalAdapter = new BackgroundRemovalAdapter();
    } catch (error) {
      console.error('[RemoveBG] Failed to initialize:', error);
      return null;
    }
  }

  return backgroundRemovalAdapter;
}
