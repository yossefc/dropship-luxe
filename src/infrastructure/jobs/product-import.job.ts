// ============================================================================
// Product Import Job - AliExpress DS API Integration
// ============================================================================
// Automated product import from AliExpress Dropshipping Solution API.
// Features:
// - Fetches products from DS recommended feeds
// - Applies mathematical scoring algorithm (quality, margin, shipping)
// - AI-powered luxury copywriting via OpenAI
// - Multi-language translations (FR, EN)
// - Quarantine system for low-score products
// ============================================================================

import { PrismaClient, QuarantineStatus } from '@prisma/client';
import { createAliExpressDSAdapter, AliExpressDSAdapter, DSProductDetails } from '@infrastructure/adapters/outbound/external-apis/aliexpress-ds.adapter.js';
import { createAliExpressOAuthService } from '@infrastructure/adapters/outbound/external-apis/aliexpress-oauth.service.js';
import { OpenAIAdapter } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { getGeminiAdapter, GeminiAdapter } from '@infrastructure/adapters/outbound/external-apis/gemini.adapter.js';
import { getBackgroundRemovalAdapter, BackgroundRemovalAdapter } from '@infrastructure/adapters/outbound/external-apis/background-removal.adapter.js';
import { getImagenAdapter, ImagenAdapter } from '@infrastructure/adapters/outbound/external-apis/imagen.adapter.js';
import { env } from '@infrastructure/config/env.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface ProductScore {
  total: number;
  breakdown: {
    rating: number;        // 0-25 points
    volume: number;        // 0-20 points
    margin: number;        // 0-25 points
    shipping: number;      // 0-15 points
    storeRating: number;   // 0-15 points
  };
  riskFactors: string[];
}

export interface ImportedProduct {
  aliexpressId: string;
  title: string;
  score: number;
  status: 'imported' | 'quarantined' | 'rejected';
  reason?: string;
}

export interface ImportJobResult {
  jobId: string;
  totalProcessed: number;
  importedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  errorCount: number;
  averageScore: number;
  products: ImportedProduct[];
  errors: Array<{ productId: string; stage: string; message: string }>;
  processingTimeMs: number;
}

export interface ImportJobConfig {
  feedName?: string;
  maxProducts?: number;
  minScore?: number;
  quarantineThreshold?: number;
  priceMultiplier?: number;
  dryRun?: boolean;
  filterCosmetics?: boolean; // Only import cosmetics products
  useBeautyCategory?: boolean; // Search in Beauty & Health category (recommended for cosmetics)
  searchKeywords?: string; // Custom search keywords
  categoryId?: string; // Sub-category ID: 3001=Makeup, 3002=SkinCare, 3003=HairCare, 3004=Nails, 3005=Tools, 3006=Fragrances
  page?: number; // Page number for pagination
  targetCategories?: string[]; // Filter by product category IDs (e.g., ['3306'] for skincare only)
  useAffiliateSearch?: boolean; // Use Affiliate API for keyword search + best sellers (recommended)
  affiliateSort?: 'SALE_PRICE_ASC' | 'SALE_PRICE_DESC' | 'LAST_VOLUME_ASC' | 'LAST_VOLUME_DESC';
}

// ============================================================================
// GLOBAL ENGLISH KEYWORDS - For International Best-Sellers Sourcing
// ============================================================================
// Using English keywords to search global AliExpress servers (USA, Europe, Asia)
// This maximizes product variety and finds international best-sellers

// Keywords that should REJECT a product (non-cosmetics)
const REJECT_KEYWORDS = [
  // Electronics
  'usb', 'cable', 'connector', 'pcb', 'terminal', 'led strip', 'adapter', 'charger',
  'hdmi', 'ethernet', 'bluetooth', 'wireless', 'speaker', 'headphone', 'earphone',
  'canbus', 'led bulb', 'light bulb', 'car light', 'strobe', 'flash light',
  // Hardware
  'screw', 'bolt', 'nut', 'washer', 'hex', 'flange', 'bearing', 'motor', 'gear',
  // Fishing
  'fishing', 'lure', 'bait', 'hook', 'fly tying', 'dubbing', 'rod', 'reel',
  // Tools
  'drill', 'wrench', 'plier', 'screwdriver', 'hammer', 'saw', 'soldering',
  // Home/Garden
  'garden', 'plant pot', 'watering', 'lawn', 'fence', 'pipe', 'valve', 'hose',
  // Automotive
  'car part', 'automotive', 'brake', 'spark plug', 'oil filter', 'tire', 'parking light',
  // Toys & Games
  'dinosaur', 'jurassic', 'raptor', 't-rex', 'toy', 'action figure', 'collectible',
  'lego', 'puzzle', 'game', 'playing card',
  // Medical/Dental (not cosmetic)
  'denture', 'orthodontic', 'dental', 'teeth cleaning', 'braces', 'retainer',
  // Eyewear (not cosmetic)
  'reading glasses', 'eyeglasses', 'spectacles', 'prescription', 'optical frame',
  // Other non-cosmetics
  'pet food', 'dog food', 'cat food', 'aquarium', 'bird cage',
  'phone case', 'laptop', 'keyboard', 'mouse pad',
];

const COSMETICS_KEYWORDS = [
  // Skincare - Premium English terms
  'serum', 'cream', 'moisturizer', 'lotion', 'mask', 'cleanser', 'toner',
  'skincare', 'skin care', 'facial', 'face', 'anti-aging', 'anti-wrinkle',
  'moisturizing', 'hydrating', 'vitamin c', 'retinol', 'hyaluronic', 'collagen',
  'sunscreen', 'spf', 'essence', 'ampoule', 'eye cream', 'night cream', 'day cream',
  'bb cream', 'cc cream', 'sheet mask', 'peel', 'exfoliant', 'scrub', 'body lotion',
  'niacinamide', 'peptide', 'ceramide', 'snail mucin', 'centella', 'squalane',
  // Makeup - Global terms
  'beauty', 'cosmetic', 'makeup', 'make-up', 'lipstick', 'lip gloss', 'lip tint',
  'foundation', 'concealer', 'mascara', 'eyeliner', 'eyeshadow', 'blush',
  'bronzer', 'primer', 'powder', 'highlighter', 'contour', 'brow', 'eyebrow',
  'lip balm', 'lipliner', 'lipgloss', 'rouge', 'palette', 'setting spray',
  // Nails
  'nail', 'nail polish', 'gel nail', 'manicure', 'pedicure', 'nail art',
  'gel polish', 'nail gel', 'nail varnish', 'false nail', 'fake nail', 'press on nail',
  // Eyelashes
  'eyelash', 'lash', 'lashes', 'false lash', 'fake lash', 'lash extension',
  'eyelash extension', 'lash glue', 'eyelash glue', 'premade fan', 'volume lash',
  // Hair & Body
  'perfume', 'fragrance', 'cologne', 'body mist', 'hair', 'shampoo', 'conditioner',
  'oil', 'body oil', 'face oil', 'hair oil', 'body scrub', 'bath', 'shower gel',
  // Tools
  'makeup brush', 'beauty sponge', 'blender', 'puff', 'applicator', 'beauty tool',
  'curler', 'tweezers', 'mirror', 'organizer', 'cotton pad',
  // Product types
  'skincare set', 'beauty set', 'cosmetic set', 'gift set', 'luxury',
];

// ============================================================================
// GLOBAL SEARCH KEYWORDS - English only for best international results
// ============================================================================
// Rotation of search terms to diversify product imports

const GLOBAL_SEARCH_KEYWORDS_ROTATION = [
  // Best-seller searches (used with DS feed API)
  'luxury skincare serum bestseller',
  'premium face cream moisturizer',
  'korean skincare k-beauty',
  'professional makeup palette',
  'organic natural beauty',
  'anti aging vitamin c serum',
  'hyaluronic acid moisturizer',
  'retinol night cream',
  'niacinamide pore minimizer',
  'collagen face mask',
  'lip gloss lipstick matte',
  'foundation concealer makeup',
  'eyelash extension kit',
  'nail gel polish professional',
  'perfume fragrance women',
  'makeup brush set professional',
  'beauty gift set luxury',
];

// ============================================================================
// AFFILIATE SEARCH KEYWORDS - Used with aliexpress.affiliate.product.query
// ============================================================================
// These keywords are searched individually for best results with the Affiliate API
// Each search returns products sorted by LAST_VOLUME_DESC (best sellers first)

const AFFILIATE_COSMETICS_KEYWORDS = [
  // Skincare - High demand
  'vitamin c serum face',
  'retinol serum anti aging',
  'hyaluronic acid serum',
  'niacinamide serum',
  'snail mucin essence',
  'collagen face cream',
  'moisturizer cream face',
  'sunscreen face SPF50',
  'face mask skincare',
  'eye cream anti wrinkle',
  'ceramide moisturizer',
  'salicylic acid cleanser',
  'peptide serum face',
  'korean skincare set',
  'centella asiatica cream',
  // Makeup - Popular
  'liquid foundation makeup',
  'concealer full coverage',
  'setting powder face',
  'eyeshadow palette',
  'mascara waterproof',
  'lip gloss plumping',
  'lipstick matte long lasting',
  'blush palette cheek',
  'highlighter makeup',
  'makeup primer face',
  'eyeliner waterproof',
  'brow pencil',
  // Hair & Body
  'hair growth serum',
  'hair oil treatment',
  'perfume women long lasting',
  'body lotion moisturizing',
  // Tools
  'makeup brush set',
  'beauty blender sponge',
  'jade roller gua sha',
];

// ============================================================================
// Product Scoring Algorithm
// ============================================================================

export function calculateProductScore(
  product: DSProductDetails,
  shippingCost: number,
  priceMultiplier: number
): ProductScore {
  const riskFactors: string[] = [];
  const breakdown = {
    rating: 0,
    volume: 0,
    margin: 0,
    shipping: 0,
    storeRating: 0,
  };

  // Get base info
  const baseInfo = product.ae_item_base_info_dto;
  const storeInfo = product.ae_store_info;
  const skuInfo = product.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];

  // 1. Rating Score (0-25 points)
  // We don't have direct rating in DS API, estimate from store rating
  const itemRating = parseFloat(storeInfo?.item_as_described_rating ?? '0');
  if (itemRating >= 4.8) {
    breakdown.rating = 25;
  } else if (itemRating >= 4.5) {
    breakdown.rating = 20;
  } else if (itemRating >= 4.2) {
    breakdown.rating = 15;
  } else if (itemRating >= 4.0) {
    breakdown.rating = 10;
    riskFactors.push('Store rating below 4.2');
  } else {
    breakdown.rating = 5;
    riskFactors.push('Low store rating');
  }

  // 2. Volume Score (0-20 points) - Based on store reputation
  const commRating = parseFloat(storeInfo?.communication_rating ?? '0');
  const shippingRating = parseFloat(storeInfo?.shipping_speed_rating ?? '0');
  const avgStoreRating = (itemRating + commRating + shippingRating) / 3;

  if (avgStoreRating >= 4.7) {
    breakdown.volume = 20;
  } else if (avgStoreRating >= 4.4) {
    breakdown.volume = 15;
  } else if (avgStoreRating >= 4.1) {
    breakdown.volume = 10;
  } else {
    breakdown.volume = 5;
    riskFactors.push('Low store average rating');
  }

  // 3. Margin Score (0-25 points)
  const basePrice = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
  const totalCost = basePrice + shippingCost;
  const sellingPrice = totalCost * priceMultiplier;
  const margin = (sellingPrice - totalCost) / sellingPrice;

  if (margin >= 0.60) {
    breakdown.margin = 25;
  } else if (margin >= 0.50) {
    breakdown.margin = 20;
  } else if (margin >= 0.40) {
    breakdown.margin = 15;
  } else if (margin >= 0.30) {
    breakdown.margin = 10;
    riskFactors.push('Margin below 40%');
  } else {
    breakdown.margin = 5;
    riskFactors.push('Low profit margin');
  }

  // 4. Shipping Score (0-15 points)
  const deliveryTime = product.logistics_info_dto?.delivery_time ?? 30;

  if (deliveryTime <= 10) {
    breakdown.shipping = 15;
  } else if (deliveryTime <= 15) {
    breakdown.shipping = 12;
  } else if (deliveryTime <= 20) {
    breakdown.shipping = 9;
  } else if (deliveryTime <= 30) {
    breakdown.shipping = 6;
    riskFactors.push('Long shipping time (20-30 days)');
  } else {
    breakdown.shipping = 3;
    riskFactors.push('Very long shipping time (30+ days)');
  }

  // 5. Store Rating Score (0-15 points)
  if (avgStoreRating >= 4.8) {
    breakdown.storeRating = 15;
  } else if (avgStoreRating >= 4.5) {
    breakdown.storeRating = 12;
  } else if (avgStoreRating >= 4.2) {
    breakdown.storeRating = 9;
  } else {
    breakdown.storeRating = 5;
    riskFactors.push('Seller reliability concerns');
  }

  const total = breakdown.rating + breakdown.volume + breakdown.margin + breakdown.shipping + breakdown.storeRating;

  return {
    total,
    breakdown,
    riskFactors,
  };
}

// ============================================================================
// Image Filtering - Keep only clean product images
// ============================================================================

/**
 * Filters images to keep only clean product photos.
 * Removes images with:
 * - Promotional text/banners (often first or last images)
 * - Size charts, text overlays
 * - Model lifestyle shots (optional)
 * Prioritizes: white/clean backgrounds, product-only shots
 */
function filterCleanProductImages(images: string[]): string[] {
  if (images.length === 0) return [];
  if (images.length === 1) return images;

  // STRATEGY: Keep only first 2 images (cleanest on AliExpress)
  // First images are typically: product alone on white background
  // Later images are often: size charts, promo banners, lifestyle shots

  // AliExpress image URL patterns that often indicate promotional/text images
  const bannedPatterns = [
    /size.*chart/i,
    /shipping/i,
    /banner/i,
    /promo/i,
    /sale/i,
    /discount/i,
    /_(desc|detail)_/i, // Description images often have text
  ];

  // Take only first 2 images and filter out banned patterns
  const firstTwo = images.slice(0, 2);
  let filtered = firstTwo.filter((url) => {
    const hasBannedPattern = bannedPatterns.some(pattern => pattern.test(url));
    return !hasBannedPattern;

    return true;
  });

  // If filtering removed too many, keep at least 3 from the beginning
  if (filtered.length < 3 && images.length >= 3) {
    filtered = images.slice(0, Math.min(5, images.length));
  }

  // Limit to max 6 clean images
  return filtered.slice(0, 6);
}

// ============================================================================
// Product Name Cleaning - Remove quantity mentions
// ============================================================================

/**
 * Parses quantity variants from product name
 * Examples:
 * - "1/5/10pcs Nail Glue" -> [1, 5, 10]
 * - "1-5-10 pcs Serum" -> [1, 5, 10]
 * - "5pcs Makeup Brush" -> [5]
 * Returns array of quantities that should become selectable options
 */
function parseQuantityVariants(name: string): number[] {
  const variants: number[] = [];

  // Pattern for "1/5/10pcs" or "1-5-10 pcs" format
  const multiVariantMatch = name.match(/(\d+(?:[\/\-]\d+)+)\s*(?:pcs?|pieces?|pack|set)/i);
  if (multiVariantMatch && multiVariantMatch[1]) {
    const numbers = multiVariantMatch[1].split(/[\/\-]/).map(n => parseInt(n, 10));
    variants.push(...numbers.filter(n => !isNaN(n) && n > 0));
  }

  // If no multi-variant, check for single quantity
  if (variants.length === 0) {
    const singleMatch = name.match(/^(\d+)\s*(?:pcs?|pieces?|pack|set)\b/i);
    if (singleMatch && singleMatch[1]) {
      const qty = parseInt(singleMatch[1], 10);
      if (!isNaN(qty) && qty > 0) {
        variants.push(qty);
      }
    }
  }

  return variants.sort((a, b) => a - b);
}

/**
 * Cleans product names by removing:
 * - Quantity mentions: "1pcs", "1/5/10pcs", etc.
 * - Promotional text: "Hot Sale", "Best Price", etc.
 * - AliExpress-specific terms
 * - Excessive punctuation and whitespace
 */
function cleanProductName(name: string): string {
  let cleaned = name;

  // Remove quantity variant patterns (1/5/10pcs, etc.)
  const quantityPatterns = [
    /^\d+(?:[\/\-]\d+)*\s*(?:pcs?|pieces?|pack|set)\s*/gi,  // Start: 1/5/10pcs
    /\b\d+(?:[\/\-]\d+)*\s*(?:pcs?|pieces?|pack|set)\b/gi,  // Middle: 1/5/10pcs
    /\b\d+\s*pcs?\b/gi,           // 1pcs, 10 pcs, 2pc
    /\b\d+\s*pieces?\b/gi,        // 1 piece, 10 pieces
    /\b\d+\s*pack\b/gi,           // 5 pack
    /\b\d+\s*set\b/gi,            // 3 set
    /\bpcs?\/?set\b/gi,           // pcs/set, pc/set
    /\b\d+\s*bottles?\b/gi,       // 2 bottles
    /\b\d+\s*boxes?\b/gi,         // 3 boxes
    /\b\d+\s*tubes?\b/gi,         // 2 tubes
    /\b\d+\s*pairs?\b/gi,         // 5 pairs
    /\bset\s+of\s+\d+\b/gi,       // set of 5
    /\(\d+\s*pcs?\)/gi,           // (10pcs)
    /\[\d+\s*pcs?\]/gi,           // [10pcs]
  ];

  // Remove promotional and AliExpress-specific text
  const promoPatterns = [
    /\bhot\s+sale\b/gi,
    /\bbest\s+seller\b/gi,
    /\bbest\s+price\b/gi,
    /\bnew\s+arrival\b/gi,
    /\bfree\s+shipping\b/gi,
    /\bdropshipping\b/gi,
    /\bwholesale\b/gi,
    /\bcheap\b/gi,
    /\bdiscount\b/gi,
    /\bfor\s+women\/men\b/gi,
    /\bfor\s+women\s+men\b/gi,
    /\bunisex\b/gi,
    /\baliexpress\b/gi,           // Remove AliExpress mentions
    /\bali\s*express\b/gi,
    /\bchina\s+brand\b/gi,
    /\bchinese\b/gi,
  ];

  // Apply quantity patterns
  for (const pattern of quantityPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Apply promo patterns
  for (const pattern of promoPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up punctuation and whitespace
  cleaned = cleaned
    .replace(/\s*[-–—]\s*$/, '')       // Trailing dashes
    .replace(/^\s*[-–—]\s*/, '')       // Leading dashes
    .replace(/\s*[,;|\/]\s*$/, '')     // Trailing punctuation
    .replace(/\s+/g, ' ')              // Multiple spaces
    .replace(/\s*\(\s*\)\s*/g, '')     // Empty parentheses
    .replace(/\s*\[\s*\]\s*/g, '')     // Empty brackets
    .trim();

  // Capitalize first letter if needed
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || name; // Return original if cleaning removed everything
}

/**
 * Creates size options from quantity variants
 * Returns array of SizeOption objects for the product
 */
function createQuantityOptions(quantities: number[], basePrice: number): Array<{
  id: string;
  label: string;
  price: number;
  available: boolean;
}> {
  if (quantities.length === 0) return [];

  return quantities.map((qty, index) => ({
    id: `qty-${qty}`,
    label: `${qty} ${qty === 1 ? 'pièce' : 'pièces'}`,
    price: basePrice * qty, // Price scales with quantity
    available: true,
  }));
}

// ============================================================================
// Product Import Job Class
// ============================================================================

export class ProductImportJob {
  private readonly prisma: PrismaClient;
  private readonly dsAdapter: AliExpressDSAdapter;
  private readonly openai: OpenAIAdapter | null;
  private readonly gemini: GeminiAdapter | null;
  private readonly bgRemoval: BackgroundRemovalAdapter | null;
  private readonly imagen: ImagenAdapter | null;

  constructor(
    prisma: PrismaClient,
    dsAdapter: AliExpressDSAdapter,
    openai: OpenAIAdapter | null,
    gemini: GeminiAdapter | null = null,
    bgRemoval: BackgroundRemovalAdapter | null = null
  ) {
    this.prisma = prisma;
    this.dsAdapter = dsAdapter;
    this.openai = openai;
    this.gemini = gemini || getGeminiAdapter();
    this.bgRemoval = bgRemoval || getBackgroundRemovalAdapter();
    this.imagen = getImagenAdapter();

    // Log which image processing service is available
    if (this.imagen?.isAvailable()) {
      console.log('[ProductImport] Imagen (AI image generation) enabled for luxury backgrounds');
    }
  }

  // ==========================================================================
  // Image Quality Check with Gemini Vision
  // ==========================================================================

  /**
   * Pick a diverse set of affiliate keywords based on maxProducts.
   * Picks randomly from the pool, ensuring variety across categories.
   */
  private pickAffiliateKeywords(maxProducts: number): string[] {
    // Pick enough keywords to cover the requested product count
    // Each keyword search returns ~10-30 valid products
    const keywordsNeeded = Math.max(2, Math.ceil(maxProducts / 15));
    const shuffled = [...AFFILIATE_COSMETICS_KEYWORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(keywordsNeeded, 10));
  }

  private async checkImageQuality(imageUrl: string): Promise<{ isValid: boolean; reason: string }> {
    if (!this.gemini) {
      // If no Gemini, use quick heuristic check
      return { isValid: true, reason: 'No Gemini API available' };
    }

    try {
      const analysis = await this.gemini.analyzeProductImage(imageUrl);

      if (!analysis.isCleanProductImage) {
        return {
          isValid: false,
          reason: analysis.reason || 'Image not suitable: multiple products or promotional content',
        };
      }

      return { isValid: true, reason: 'Clean product image' };
    } catch (error) {
      console.error('[ProductImport] Image analysis error:', error);
      return { isValid: true, reason: 'Analysis error, defaulting to valid' };
    }
  }

  // ==========================================================================
  // Main Execution
  // ==========================================================================

  async execute(config: ImportJobConfig = {}): Promise<ImportJobResult> {
    const jobId = uuidv4();
    const startTime = Date.now();

    // Select random global search keywords for diversity
    const randomKeywordIndex = Math.floor(Math.random() * GLOBAL_SEARCH_KEYWORDS_ROTATION.length);
    const defaultGlobalKeywords = GLOBAL_SEARCH_KEYWORDS_ROTATION[randomKeywordIndex];

    const {
      feedName = 'DS_France_topsellers',
      maxProducts = 20,
      minScore = 45, // Lowered from 65 to accept more products
      quarantineThreshold = 40, // Lowered from 50
      priceMultiplier = 2.5,
      dryRun = false,
      filterCosmetics = true, // Filter cosmetics by default
      useBeautyCategory = true, // Use Beauty & Health category by default
      searchKeywords = defaultGlobalKeywords, // Use English global keywords by default
      categoryId = '66', // Default: Beauty & Health. Sub-cats: 3001=Makeup, 3002=SkinCare, 3003=HairCare, 3004=Nails
      page = 1, // Page number for pagination
      targetCategories, // Filter by specific category IDs (e.g., ['3306'] for skincare)
      useAffiliateSearch = false, // Use Affiliate API for keyword search + best sellers
      affiliateSort = 'LAST_VOLUME_DESC' as const,
    } = config;

    console.log(`[ProductImport] Starting job ${jobId}`, {
      feedName,
      maxProducts,
      minScore,
      quarantineThreshold,
      priceMultiplier,
      dryRun,
      filterCosmetics,
      useBeautyCategory,
      useAffiliateSearch,
      searchKeywords,
      categoryId,
      page,
      targetCategories: targetCategories ?? 'all',
    });

    const result: ImportJobResult = {
      jobId,
      totalProcessed: 0,
      importedCount: 0,
      quarantinedCount: 0,
      rejectedCount: 0,
      errorCount: 0,
      averageScore: 0,
      products: [],
      errors: [],
      processingTimeMs: 0,
    };

    try {
      // Fetch products using the best available method
      let feedProducts: DSProductDetails[];

      if (useAffiliateSearch && this.dsAdapter) {
        // ================================================================
        // AFFILIATE SEARCH: Keyword-based search sorted by best sellers
        // ================================================================
        // This is the RECOMMENDED method for finding top-selling cosmetics.
        // It searches multiple keywords and merges results, deduplicating by product ID.
        console.log(`[ProductImport] Using AFFILIATE SEARCH (best sellers mode)`);

        const keywords = searchKeywords
          ? [searchKeywords]
          : this.pickAffiliateKeywords(maxProducts);

        console.log(`[ProductImport] Searching ${keywords.length} keyword(s): ${keywords.join(' | ')}`);

        // Collect products from all keyword searches, deduplicate by product ID
        const seenIds = new Set<string>();
        const allSearchProducts: Array<{ productId: string; categoryId: string; orderCount: number }> = [];

        for (const kw of keywords) {
          try {
            const searchResult = await this.dsAdapter.searchByKeyword({
              keywords: kw,
              categoryIds: categoryId !== '66' ? categoryId : undefined, // Only filter subcategory if specified
              sort: affiliateSort,
              page,
              pageSize: Math.min(50, Math.ceil(maxProducts / keywords.length) + 10),
              shipToCountry: 'FR',
              targetCurrency: 'EUR',
            });

            for (const p of searchResult.products) {
              if (!seenIds.has(p.productId)) {
                seenIds.add(p.productId);
                allSearchProducts.push({
                  productId: p.productId,
                  categoryId: p.categoryId,
                  orderCount: p.orderCount,
                });
              }
            }
          } catch (error) {
            console.warn(`[ProductImport] Affiliate search failed for "${kw}":`, error);
          }
        }

        // Sort by order count (best sellers first) and apply target category filter
        let productsToFetch = allSearchProducts.sort((a, b) => b.orderCount - a.orderCount);

        if (targetCategories && targetCategories.length > 0) {
          const beforeFilter = productsToFetch.length;
          productsToFetch = productsToFetch.filter(p => targetCategories.includes(p.categoryId));
          console.log(`[ProductImport] Category pre-filter: ${beforeFilter} -> ${productsToFetch.length} products`);
        }

        console.log(`[ProductImport] Found ${productsToFetch.length} unique best-selling products, fetching full details...`);

        // Fetch FULL product details via DS API (for images, SKUs, store info)
        // Falls back to affiliate data if DS API is not available
        feedProducts = [];
        for (const p of productsToFetch.slice(0, maxProducts)) {
          try {
            const fullDetails = await this.dsAdapter.getDSProduct(p.productId);
            feedProducts.push(fullDetails);
            const imageCount = fullDetails.ae_multimedia_info_dto?.image_urls?.split(';').filter(Boolean).length ?? 0;
            console.log(`[ProductImport] Got ${imageCount} images for best-seller ${p.productId} (${p.orderCount} orders)`);
          } catch (error) {
            // DS API not available - use Affiliate productdetail.get as fallback
            console.log(`[ProductImport] DS API unavailable for ${p.productId}, using affiliate detail fallback`);
            try {
              const affiliateDetails = await this.dsAdapter.getAffiliateProductDetail(p.productId);
              if (affiliateDetails) {
                feedProducts.push(affiliateDetails);
                const imageCount = affiliateDetails.ae_multimedia_info_dto?.image_urls?.split(';').filter(Boolean).length ?? 0;
                console.log(`[ProductImport] Got ${imageCount} affiliate images for ${p.productId}`);
              }
            } catch (affError) {
              console.warn(`[ProductImport] Could not fetch any details for ${p.productId}:`, affError);
            }
          }
        }
        console.log(`[ProductImport] Fetched ${feedProducts.length} best-selling products with details`);

      } else if (useBeautyCategory && this.dsAdapter && searchKeywords) {
        // ================================================================
        // DS FEED SEARCH: Original method (limited to category 66 feed)
        // ================================================================
        console.log(`[ProductImport] Using DS FEED search (category ${categoryId})`);
        console.log(`[ProductImport] Searching category ${categoryId} with keywords: ${searchKeywords}, page: ${page}`);
        const searchResult = await this.dsAdapter.searchProductsDetailed({
          keywords: searchKeywords,
          categoryId, // 66=Beauty, 3001=Makeup, 3002=SkinCare, 3003=HairCare, 3004=Nails
          pageSize: Math.min(maxProducts, 50),
          page,
        });

        console.log(`[ProductImport] Found ${searchResult.products.length} products`);

        // Filter by target categories BEFORE fetching full details (using second_level_category_id)
        let productsToFetch = searchResult.products;
        if (targetCategories && targetCategories.length > 0) {
          const beforeFilter = productsToFetch.length;
          productsToFetch = productsToFetch.filter(p => targetCategories.includes(p.categoryId));
          console.log(`[ProductImport] Category pre-filter: ${beforeFilter} -> ${productsToFetch.length} products (targets: ${targetCategories.join(', ')})`);
        }

        console.log(`[ProductImport] Fetching full details with ALL images...`);

        // Fetch FULL product details for each to get ALL images (not just main image)
        feedProducts = [];
        for (const p of productsToFetch.slice(0, maxProducts)) {
          try {
            console.log(`[ProductImport] Fetching full details for ${p.productId}...`);
            const fullDetails = await this.dsAdapter.getDSProduct(p.productId);
            feedProducts.push(fullDetails);

            // Log how many images we got
            const imageCount = fullDetails.ae_multimedia_info_dto?.image_urls?.split(';').filter(Boolean).length ?? 0;
            console.log(`[ProductImport] Got ${imageCount} images for product ${p.productId}`);
          } catch (error) {
            console.warn(`[ProductImport] Could not fetch full details for ${p.productId}:`, error);
          }
        }
        console.log(`[ProductImport] Fetched ${feedProducts.length} products with full image galleries`);
      } else {
        feedProducts = await this.fetchFeedProducts(feedName, maxProducts);
      }

      // Note: Category filtering now done BEFORE fetching full details (see pre-filter above)

      result.totalProcessed = feedProducts.length;
      console.log(`[ProductImport] Processing ${feedProducts.length} products`);

      let totalScore = 0;

      for (const productData of feedProducts) {
        try {
          const productId = String(productData.ae_item_base_info_dto?.product_id ?? '');
          if (!productId) {
            result.errors.push({
              productId: 'unknown',
              stage: 'fetch',
              message: 'Missing product ID',
            });
            result.errorCount++;
            continue;
          }

          // Check if already imported
          const existing = await this.prisma.product.findUnique({
            where: { aliexpressId: productId },
          });

          if (existing) {
            console.log(`[ProductImport] Skipping existing product ${productId}`);
            continue;
          }

          // Filter for cosmetics products only
          if (filterCosmetics) {
            const title = (productData.ae_item_base_info_dto?.subject ?? '').toLowerCase();

            // First check if product contains REJECTED keywords (non-cosmetics)
            const isRejected = REJECT_KEYWORDS.some(keyword => title.includes(keyword.toLowerCase()));
            if (isRejected) {
              console.log(`[ProductImport] REJECTED (non-cosmetic keyword): ${productId}: ${title.substring(0, 50)}...`);
              result.rejectedCount++;
              result.products.push({
                aliexpressId: productId,
                title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
                score: 0,
                status: 'rejected',
                reason: 'Contains non-cosmetics keyword',
              });
              continue;
            }

            // Then check if product contains at least one cosmetics keyword
            const isCosmetics = COSMETICS_KEYWORDS.some(keyword => title.includes(keyword.toLowerCase()));
            if (!isCosmetics) {
              console.log(`[ProductImport] Skipping non-cosmetics product ${productId}: ${title.substring(0, 50)}...`);
              result.rejectedCount++;
              result.products.push({
                aliexpressId: productId,
                title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
                score: 0,
                status: 'rejected',
                reason: 'Not a cosmetics product',
              });
              continue;
            }
          }

          // Keep only clean product images (first 2 images are usually the best on AliExpress)
          // Skip products with obviously promotional first images
          const images = productData.ae_multimedia_info_dto?.image_urls?.split(';') || [];
          const firstImageUrl = images[0];
          if (firstImageUrl) {
            const firstImage = firstImageUrl.toLowerCase();
            // Reject if first image looks promotional
            const badImagePatterns = ['banner', 'promo', 'sale', 'discount', 'size_chart', 'shipping', 'description'];
            const isBadImage = badImagePatterns.some(p => firstImage.includes(p));
            if (isBadImage) {
              console.log(`[ProductImport] REJECTED (promotional image): ${productId}`);
              result.rejectedCount++;
              result.products.push({
                aliexpressId: productId,
                title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
                score: 0,
                status: 'rejected',
                reason: 'First image is promotional',
              });
              continue;
            }
          }

          // Calculate shipping cost (default estimate)
          const shippingCost = await this.estimateShippingCost(productId);

          // Calculate score
          const score = calculateProductScore(productData, shippingCost, priceMultiplier);
          totalScore += score.total;

          console.log(`[ProductImport] Product ${productId}: Score ${score.total}/100`, {
            breakdown: score.breakdown,
            riskFactors: score.riskFactors,
          });

          // Decision based on score
          if (score.total >= minScore) {
            // Import product
            if (!dryRun) {
              await this.importProduct(productData, score, shippingCost, priceMultiplier);
            }
            result.importedCount++;
            result.products.push({
              aliexpressId: productId,
              title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
              score: score.total,
              status: 'imported',
            });
          } else if (score.total >= quarantineThreshold) {
            // Quarantine for review
            if (!dryRun) {
              await this.quarantineProduct(productData, score, shippingCost, priceMultiplier);
            }
            result.quarantinedCount++;
            result.products.push({
              aliexpressId: productId,
              title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
              score: score.total,
              status: 'quarantined',
              reason: score.riskFactors.join(', '),
            });
          } else {
            // Reject
            result.rejectedCount++;
            result.products.push({
              aliexpressId: productId,
              title: productData.ae_item_base_info_dto?.subject ?? 'Unknown',
              score: score.total,
              status: 'rejected',
              reason: score.riskFactors.join(', '),
            });
          }
        } catch (error) {
          const productId = String(productData.ae_item_base_info_dto?.product_id ?? 'unknown');
          console.error(`[ProductImport] Error processing product ${productId}`, error);
          result.errors.push({
            productId,
            stage: 'processing',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          result.errorCount++;
        }
      }

      result.averageScore = result.totalProcessed > 0 ? Math.round(totalScore / result.totalProcessed) : 0;

    } catch (error) {
      console.error('[ProductImport] Job failed', error);
      result.errors.push({
        productId: 'job',
        stage: 'execution',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      result.errorCount++;
    }

    result.processingTimeMs = Date.now() - startTime;

    // Save import history
    if (!config.dryRun) {
      await this.saveImportHistory(result, feedName);
    }

    console.log(`[ProductImport] Job ${jobId} completed`, {
      totalProcessed: result.totalProcessed,
      imported: result.importedCount,
      quarantined: result.quarantinedCount,
      rejected: result.rejectedCount,
      errors: result.errorCount,
      averageScore: result.averageScore,
      processingTimeMs: result.processingTimeMs,
    });

    return result;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async fetchFeedProducts(feedName: string, maxProducts: number): Promise<DSProductDetails[]> {
    // For now, we use the categories to get product IDs, then fetch full details
    // In production, you'd use aliexpress.ds.recommend.feed.get
    try {
      // Try to get feed products
      const rawResponse = await this.dsAdapter.executeRawRequest('aliexpress.ds.recommend.feed.get', {
        feed_name: feedName,
        country: 'FR',
        target_currency: 'EUR',
        target_language: 'EN',
        page_no: 1,
        page_size: Math.min(maxProducts, 50),
      }) as {
        aliexpress_ds_recommend_feed_get_response?: {
          result?: {
            products?: {
              traffic_product_d_t_o?: Array<{
                product_id?: number;
              }>;
            };
          };
        };
      };

      const products = rawResponse.aliexpress_ds_recommend_feed_get_response?.result?.products?.traffic_product_d_t_o ?? [];

      console.log(`[ProductImport] Found ${products.length} products in feed`);

      // Fetch full details for each product
      const fullProducts: DSProductDetails[] = [];
      for (const p of products.slice(0, maxProducts)) {
        if (p.product_id) {
          try {
            const details = await this.dsAdapter.getDSProduct(String(p.product_id));
            fullProducts.push(details);
          } catch (error) {
            console.warn(`[ProductImport] Could not fetch product ${p.product_id}`, error);
          }
        }
      }

      return fullProducts;
    } catch (error) {
      console.error('[ProductImport] Error fetching feed products', error);
      return [];
    }
  }

  private async estimateShippingCost(productId: string): Promise<number> {
    try {
      const shipping = await this.dsAdapter.calculateShipping({
        productId,
        quantity: 1,
        countryCode: 'FR',
      });

      const cheapestOption = shipping
        .filter(s => !s.error_code)
        .sort((a, b) => parseFloat(a.freight ?? '999') - parseFloat(b.freight ?? '999'))[0];

      return parseFloat(cheapestOption?.freight ?? '5');
    } catch {
      return 5; // Default shipping estimate
    }
  }

  private async importProduct(
    productData: DSProductDetails,
    score: ProductScore,
    shippingCost: number,
    priceMultiplier: number
  ): Promise<void> {
    const baseInfo = productData.ae_item_base_info_dto;
    const storeInfo = productData.ae_store_info;
    const skuInfo = productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];
    const multimedia = productData.ae_multimedia_info_dto;

    const productId = String(baseInfo?.product_id ?? '');
    const basePrice = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
    const sellingPrice = (basePrice + shippingCost) * priceMultiplier;

    // Parse ALL images and use Gemini Vision to find product-alone shots
    const rawImages = multimedia?.image_urls?.split(';').filter(Boolean) ?? [];
    let images: string[] = [];

    // STEP 1: Try to find clean "product alone" images
    if (this.gemini && rawImages.length > 0) {
      console.log(`[ProductImport] Analyzing ${rawImages.length} images with Gemini Vision...`);
      images = await this.gemini.filterProductAloneImages(rawImages);
      console.log(`[ProductImport] Gemini filtered: ${rawImages.length} -> ${images.length} product-alone images`);
    }

    // STEP 2: If no clean images, try IMAGEN AI to generate luxury product image
    const productName = baseInfo?.subject ?? '';
    if (images.length === 0 && this.imagen?.isAvailable() && rawImages.length > 0) {
      console.log(`[ProductImport] No clean images found. Generating luxury image with Imagen AI...`);

      // Find best candidate image for AI generation
      let candidateUrl = rawImages[0];
      if (this.gemini) {
        const candidate = await this.gemini.findBestCandidateForBackgroundRemoval(rawImages);
        if (candidate && candidate.score >= 30) {
          candidateUrl = candidate.url;
          console.log(`[ProductImport] Selected candidate (score ${candidate.score}): ${candidate.reason}`);
        }
      }

      // Generate luxury product image with Imagen
      const imagenResult = await this.imagen.generateLuxuryProductImage(candidateUrl!, productName);

      if (imagenResult.success && imagenResult.generatedImageBase64) {
        // Save generated image to disk
        const generatedImagePath = await this.saveGeneratedImage(productId, imagenResult.generatedImageBase64, imagenResult.mimeType);
        if (generatedImagePath) {
          images = [generatedImagePath];
          console.log(`[ProductImport] ✓ Luxury image generated and saved: ${generatedImagePath}`);
          console.log(`[ProductImport] Background: ${imagenResult.prompt?.substring(0, 60)}...`);
        }
      } else {
        console.log(`[ProductImport] Imagen generation failed: ${imagenResult.error}`);
      }
    }

    // STEP 2b: Fallback to remove.bg if Imagen failed or unavailable
    if (images.length === 0 && this.gemini && this.bgRemoval && rawImages.length > 0) {
      console.log(`[ProductImport] Trying fallback: remove.bg background removal...`);

      // Find best candidate for background removal
      const candidate = await this.gemini.findBestCandidateForBackgroundRemoval(rawImages);

      if (candidate && candidate.score >= 40) {
        console.log(`[ProductImport] Found candidate (score ${candidate.score}): ${candidate.reason}`);

        // Get AI-suggested background color based on product image and name
        const bgSuggestion = await this.gemini.suggestBackgroundColor(candidate.url, productName);
        console.log(`[ProductImport] Background color: #${bgSuggestion.backgroundColor} (${bgSuggestion.category})`);

        // Remove background with adaptive color
        const cleanedResult = await this.bgRemoval.removeBackground(candidate.url, {
          backgroundColor: bgSuggestion.backgroundColor,
          addShadow: true,
          cropMargin: '12%', // Slightly more margin for luxe look
        });

        if (cleanedResult.success && cleanedResult.cleanImageBase64) {
          // Save cleaned image to disk
          const cleanedImagePath = await this.saveCleanedImage(productId, cleanedResult.cleanImageBase64);
          if (cleanedImagePath) {
            images = [cleanedImagePath];
            console.log(`[ProductImport] ✓ Background removed (${bgSuggestion.category} style, #${bgSuggestion.backgroundColor}) and saved: ${cleanedImagePath}`);
          }
        } else {
          console.log(`[ProductImport] Background removal failed: ${cleanedResult.error}`);
        }
      } else {
        console.log(`[ProductImport] No suitable candidate for background removal`);
      }
    }

    // STEP 3: If no AI image, use a placeholder - product can be updated later in admin
    if (images.length === 0) {
      images = ['/products/placeholder-luxe.png'];
      console.log(`[ProductImport] No AI image for ${productId} - using placeholder (update via admin)`);
    }

    // Clean the product name (remove "Xpcs", promotional text, AliExpress, etc.)
    const originalName = baseInfo?.subject ?? '';
    const cleanedName = cleanProductName(originalName);
    console.log(`[ProductImport] Cleaned name: "${originalName.substring(0, 50)}" -> "${cleanedName.substring(0, 50)}"`);

    // ========================================================================
    // Build variants from AliExpress SKU data (color, size, ml, etc.)
    // Falls back to quantity variants parsed from the product name
    // ========================================================================
    const aliVariants = this.parseSkuVariants(productData);
    const variantsToCreate = this.buildVariantsFromSku(aliVariants, sellingPrice, basePrice, shippingCost, priceMultiplier, productId);

    // If no real SKU variants, try quantity variants from product name
    if (variantsToCreate.length === 0) {
      const quantityVariants = parseQuantityVariants(originalName);
      if (quantityVariants.length > 0) {
        for (const qty of quantityVariants) {
          variantsToCreate.push({
            aliexpressSku: `${productId}-QTY${qty}`,
            name: `${qty} ${qty === 1 ? 'piece' : 'pieces'}`,
            sku: `${productId}-QTY${qty}`,
            price: sellingPrice * qty,
            currency: 'EUR',
            stock: 100,
            attributes: { quantity: qty, type: 'quantity' } as object,
            image: null,
            isActive: true,
            frName: `${qty} ${qty === 1 ? 'pièce' : 'pièces'}`,
          });
        }
      }
    }

    console.log(`[ProductImport] Variants: ${variantsToCreate.length} (${variantsToCreate.map(v => v.name).slice(0, 5).join(', ')}${variantsToCreate.length > 5 ? '...' : ''})`);

    // Generate AI translation with cleaned name
    const frenchContent = await this.generateFrenchContent(cleanedName, baseInfo?.detail ?? '');

    // Create product with translation and real variants
    await this.prisma.product.create({
      data: {
        aliexpressId: productId,
        aliexpressUrl: `https://www.aliexpress.com/item/${productId}.html`,
        name: cleanedName,
        originalName: baseInfo?.subject, // Keep original for reference
        originalDescription: baseInfo?.detail,
        images,
        basePrice,
        costPrice: basePrice + shippingCost,
        sellingPrice,
        currency: 'EUR',
        stock: skuInfo?.ipm_sku_stock ?? 100,
        rating: parseFloat(storeInfo?.item_as_described_rating ?? '4.5'),
        supplierId: String(storeInfo?.store_id ?? 'unknown'),
        supplierName: 'Hayoss', // Brand name instead of AliExpress supplier
        shippingTimeMin: productData.logistics_info_dto?.delivery_time ?? 15,
        shippingTimeMax: (productData.logistics_info_dto?.delivery_time ?? 15) + 10,
        importScore: score.total,
        importScoreBreakdown: score.breakdown,
        riskFactors: score.riskFactors,
        isActive: true,
        translations: {
          create: {
            locale: 'fr',
            name: frenchContent.name,
            slug: this.generateSlug(frenchContent.name),
            description: frenchContent.description,
            descriptionHtml: `<p>${frenchContent.description}</p>`,
            benefits: frenchContent.benefits,
            metaTitle: frenchContent.metaTitle,
            metaDescription: frenchContent.metaDescription,
            metaKeywords: frenchContent.keywords,
            aiModel: this.gemini ? 'gemini-2.5-flash' : (this.openai ? 'gpt-4-turbo' : 'fallback'),
            aiPromptVersion: '1.1',
          },
        },
        // Create variants from AliExpress SKUs or quantity parsing
        variants: variantsToCreate.length > 0 ? {
          create: variantsToCreate.map(v => ({
            aliexpressSku: v.aliexpressSku,
            name: v.name,
            sku: v.sku,
            price: v.price,
            currency: v.currency,
            stock: v.stock,
            attributes: v.attributes,
            image: v.image,
            isActive: v.isActive,
            translations: {
              create: {
                locale: 'fr',
                name: v.frName,
              },
            },
          })),
        } : undefined,
      },
    });

    console.log(`[ProductImport] Created product ${productId} with ${variantsToCreate.length} variants`);
  }

  private async quarantineProduct(
    productData: DSProductDetails,
    score: ProductScore,
    shippingCost: number,
    priceMultiplier: number
  ): Promise<void> {
    const baseInfo = productData.ae_item_base_info_dto;
    const skuInfo = productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0];
    const basePrice = parseFloat(skuInfo?.sku_price ?? skuInfo?.offer_sale_price ?? '0');
    const sellingPrice = (basePrice + shippingCost) * priceMultiplier;

    const aliexpressId = String(baseInfo?.product_id ?? '');
    await this.prisma.productQuarantine.upsert({
      where: { aliexpressId },
      update: {
        title: baseInfo?.subject ?? 'Unknown',
        score: score.total,
        reason: score.riskFactors.join(', ') || 'Score below threshold',
        productData: productData as unknown as object,
        shippingCost,
        suggestedPrice: sellingPrice,
        scoreBreakdown: score.breakdown,
        riskFactors: score.riskFactors,
        status: QuarantineStatus.pending,
      },
      create: {
        aliexpressId,
        title: baseInfo?.subject ?? 'Unknown',
        score: score.total,
        reason: score.riskFactors.join(', ') || 'Score below threshold',
        productData: productData as unknown as object,
        shippingCost,
        suggestedPrice: sellingPrice,
        scoreBreakdown: score.breakdown,
        riskFactors: score.riskFactors,
        status: QuarantineStatus.pending,
      },
    });
  }

  // ========================================================================
  // Parse SKU variants from raw DSProductDetails
  // ========================================================================

  private parseSkuVariants(productData: DSProductDetails): Array<{
    skuId: string;
    name: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
    image?: string;
  }> {
    const skuInfoList = productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o;
    if (!skuInfoList || skuInfoList.length === 0) return [];

    return skuInfoList.map(sku => {
      const properties = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o ?? [];

      // Build attributes map: { "Color": "Red", "Size": "30ml" }
      const attributes: Record<string, string> = {};
      for (const prop of properties) {
        if (prop.sku_property_name && prop.property_value_definition_name) {
          attributes[prop.sku_property_name] = prop.property_value_definition_name;
        }
      }

      // Build readable name: "Red / 30ml"
      const name = properties
        .map(p => p.property_value_definition_name ?? '')
        .filter(Boolean)
        .join(' / ');

      // Find variant-specific image
      const image = properties.find(p => p.sku_image)?.sku_image;

      return {
        skuId: sku.sku_id ?? sku.id ?? '',
        name,
        price: parseFloat(sku.offer_sale_price ?? sku.sku_price ?? '0'),
        stock: sku.ipm_sku_stock ?? sku.sku_available_stock ?? (sku as any).s_k_u_available_stock ?? 0,
        attributes,
        image,
      };
    });
  }

  // ========================================================================
  // Build real variants from AliExpress SKU data
  // ========================================================================

  /**
   * Converts AliExpress SKU variants (color, size, ml, etc.) into database-ready variant objects.
   * Each SKU has attributes like { Color: "Red", Size: "30ml" } and its own price/stock/image.
   *
   * Variant type detection:
   * - "Color" / "Colour" → shade (with color swatch)
   * - "Size" / "Volume" / quantity-like → size option
   * - Combined (Color + Size) → one variant per combination
   */
  private buildVariantsFromSku(
    aliVariants: Array<{
      skuId: string;
      name: string;
      price: number;
      stock: number;
      attributes: Record<string, string>;
      image?: string;
    }>,
    sellingPrice: number,
    basePrice: number,
    shippingCost: number,
    priceMultiplier: number,
    productId: string,
  ): Array<{
    aliexpressSku: string;
    name: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
    attributes: object;
    image: string | null;
    isActive: boolean;
    frName: string;
  }> {
    if (!aliVariants || aliVariants.length === 0) return [];

    // Skip if all variants have identical empty attributes (no real options)
    const hasRealAttributes = aliVariants.some(v =>
      Object.keys(v.attributes).length > 0
    );
    if (!hasRealAttributes) return [];

    // Skip if only 1 variant (no choice for customer)
    if (aliVariants.length === 1 && Object.keys(aliVariants[0]?.attributes ?? {}).length <= 1) return [];

    const results: Array<{
      aliexpressSku: string;
      name: string;
      sku: string;
      price: number;
      currency: string;
      stock: number;
      attributes: object;
      image: string | null;
      isActive: boolean;
      frName: string;
    }> = [];

    // Detect which attribute keys are present (normalize to lowercase for matching)
    const allAttrKeys = new Set<string>();
    for (const v of aliVariants) {
      for (const key of Object.keys(v.attributes)) {
        allAttrKeys.add(key);
      }
    }

    // Classify attribute types
    const colorKeys = [...allAttrKeys].filter(k =>
      /^colou?r$/i.test(k) || /^shade$/i.test(k) || /^teinte$/i.test(k)
    );
    const sizeKeys = [...allAttrKeys].filter(k =>
      /^size$/i.test(k) || /^volume$/i.test(k) || /^capacity$/i.test(k) ||
      /^ships?\s*from$/i.test(k) || /^model$/i.test(k) || /^type$/i.test(k) ||
      /^specification$/i.test(k) || /^style$/i.test(k)
    );

    // Keys not classified as color or size
    const otherKeys = [...allAttrKeys].filter(k =>
      !colorKeys.includes(k) && !sizeKeys.includes(k)
    );

    // Treat unclassified keys as size-type options
    sizeKeys.push(...otherKeys);

    console.log(`[ProductImport] SKU variant attributes: color=[${colorKeys.join(',')}] size=[${sizeKeys.join(',')}]`);

    for (const variant of aliVariants) {
      // Calculate variant selling price using the same markup formula
      const variantCost = variant.price;
      const variantSellingPrice = (variantCost + shippingCost) * priceMultiplier;

      // Build a readable variant name from attributes
      const nameParts: string[] = [];
      const attrs = variant.attributes;
      for (const key of Object.keys(attrs)) {
        const val = attrs[key];
        if (val) nameParts.push(val);
      }
      const variantName = nameParts.join(' / ') || variant.name;

      // Determine the type for each attribute
      const typedAttributes: Record<string, unknown> = { ...attrs };

      // Tag variant type for frontend mapping
      const firstColorKey = colorKeys[0];
      if (firstColorKey && colorKeys.some(k => attrs[k])) {
        typedAttributes._type = 'shade';
        typedAttributes._colorValue = attrs[firstColorKey] ?? '';
      } else {
        typedAttributes._type = 'size';
      }

      // Ensure HD image URL
      let variantImage = variant.image ?? null;
      if (variantImage && !variantImage.startsWith('http')) {
        variantImage = `https:${variantImage}`;
      }

      results.push({
        aliexpressSku: variant.skuId,
        name: variantName,
        sku: `${productId}-${variant.skuId}`,
        price: Math.round(variantSellingPrice * 100) / 100,
        currency: 'EUR',
        stock: variant.stock || 100,
        attributes: typedAttributes as object,
        image: variantImage,
        isActive: variant.stock > 0,
        frName: variantName, // Same for now, AI translation per-variant would be too expensive
      });
    }

    // Limit to 30 variants max (some AliExpress products have 50+ color combos)
    return results.slice(0, 30);
  }

  private async generateFrenchContent(title: string, description: string): Promise<{
    name: string;
    description: string;
    benefits: string[];
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  }> {
    try {
      // PRIORITY 1: Use Gemini for simple name with brand + quality description
      if (this.gemini) {
        console.log(`[ProductImport] Generating content with Gemini Vision...`);
        const geminiContent = await this.gemini.generateProductContent(title, description, 'cosmétique');

        return {
          name: geminiContent.name,
          description: geminiContent.description,
          benefits: geminiContent.benefits,
          metaTitle: geminiContent.name.substring(0, 60),
          metaDescription: geminiContent.description.substring(0, 155),
          keywords: ['cosmétique', 'beauté', 'soin', 'luxe'],
        };
      }

      // FALLBACK: Use OpenAI if Gemini not available
      if (this.openai) {
        console.log(`[ProductImport] Generating content with OpenAI...`);
        const result = await this.openai.generateLuxuryTranslations({
          originalName: title,
          originalDescription: description,
          category: 'cosmetics',
          targetLocales: ['fr'],
        });

        const frTranslation = result.translations.find(t => t.locale === 'fr');
        if (frTranslation) {
          return {
            name: frTranslation.name,
            description: frTranslation.description,
            benefits: frTranslation.benefits,
            metaTitle: frTranslation.metaTitle,
            metaDescription: frTranslation.metaDescription,
            keywords: frTranslation.metaKeywords,
          };
        }
      }

      throw new Error('No AI service available');
    } catch (error) {
      console.warn('[ProductImport] AI generation failed, using fallback', error);
      // Fallback - clean the title and create basic content
      const cleanTitle = cleanProductName(title);
      return {
        name: cleanTitle.substring(0, 60),
        description: `Découvrez ${cleanTitle}, un produit de qualité professionnelle pour des résultats exceptionnels. Formulé avec soin pour répondre aux exigences les plus élevées.`,
        benefits: ['Qualité premium', 'Ingrédients sélectionnés', 'Résultats visibles'],
        metaTitle: cleanTitle.substring(0, 60),
        metaDescription: `${cleanTitle} - Produit cosmétique de qualité professionnelle. Livraison rapide.`,
        keywords: ['cosmétique', 'beauté', 'soin'],
      };
    }
  }

  /**
   * Save cleaned product image to disk and return the URL
   */
  private async saveCleanedImage(productId: string, base64Data: string): Promise<string | null> {
    try {
      // Create products directory if it doesn't exist
      const productsDir = path.join(process.cwd(), 'frontend', 'public', 'products');
      if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
      }

      // Generate filename
      const filename = `${productId}-clean.png`;
      const filepath = path.join(productsDir, filename);

      // Write file
      fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
      console.log(`[ProductImport] Saved cleaned image: ${filepath}`);

      // Return URL (relative to frontend public folder)
      return `/products/${filename}`;
    } catch (error) {
      console.error(`[ProductImport] Error saving cleaned image:`, error);
      return null;
    }
  }

  /**
   * Save Imagen-generated luxury product image to disk
   */
  private async saveGeneratedImage(productId: string, base64Data: string, mimeType?: string): Promise<string | null> {
    try {
      // Create products directory if it doesn't exist
      const productsDir = path.join(process.cwd(), 'frontend', 'public', 'products');
      if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
      }

      // Determine file extension based on mime type
      const extension = mimeType?.includes('png') ? 'png' : 'jpg';

      // Generate filename with 'luxe' prefix to indicate AI-generated
      const filename = `${productId}-luxe.${extension}`;
      const filepath = path.join(productsDir, filename);

      // Write file
      fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
      console.log(`[ProductImport] Saved Imagen-generated image: ${filepath}`);

      // Return URL (relative to frontend public folder)
      return `/products/${filename}`;
    } catch (error) {
      console.error(`[ProductImport] Error saving generated image:`, error);
      return null;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async saveImportHistory(result: ImportJobResult, feedName: string): Promise<void> {
    await this.prisma.importHistory.create({
      data: {
        jobId: result.jobId,
        jobName: 'product-import',
        keywords: [feedName],
        totalProcessed: result.totalProcessed,
        importedCount: result.importedCount,
        quarantinedCount: result.quarantinedCount,
        rejectedCount: result.rejectedCount,
        errorCount: result.errorCount,
        averageScore: result.averageScore,
        processingTimeMs: result.processingTimeMs,
        importedProducts: result.products.filter(p => p.status === 'imported').map(p => p.aliexpressId),
        errors: result.errors,
        startedAt: new Date(Date.now() - result.processingTimeMs),
        completedAt: new Date(),
      },
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createProductImportJob(prisma: PrismaClient): ProductImportJob {
  const oauthService = createAliExpressOAuthService(prisma);
  // Gracefully handle missing OAuth token - affiliate methods don't need it
  const dsAdapter = createAliExpressDSAdapter(async () => {
    try {
      return await oauthService.getValidAccessToken();
    } catch {
      return ''; // No OAuth token - affiliate methods will still work
    }
  });

  // OpenAI is optional - if not configured, translations will be skipped
  const openai = env.OPENAI_API_KEY
    ? new OpenAIAdapter({ apiKey: env.OPENAI_API_KEY })
    : null;

  // Gemini for image analysis (optional but recommended)
  const gemini = getGeminiAdapter();
  if (gemini) {
    console.log('[ProductImport] Gemini Vision enabled for image analysis');
  }

  // Background removal service (optional but recommended for clean images)
  const bgRemoval = getBackgroundRemovalAdapter();
  if (bgRemoval) {
    console.log('[ProductImport] Background removal service enabled (remove.bg)');
  }

  return new ProductImportJob(prisma, dsAdapter, openai, gemini, bgRemoval);
}

// ============================================================================
// Standalone Execution (use src/run-import.ts instead)
// ============================================================================
// To run import directly, use: npx ts-node src/run-import.ts
