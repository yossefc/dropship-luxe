#!/usr/bin/env tsx
// ============================================================================
// HAYOSS - Import Produits AliExpress (Pipeline Complet)
// ============================================================================
// Pour CHAQUE produit importé, en un seul passage :
// 1. Recherche AliExpress (Affiliate API)
// 2. Dédoublonnage (par ID et par nom, mise à jour prix si moins cher)
// 3. Catégorisation (AliExpress category → sous-catégorie, sinon Gemini AI)
// 4. Image AI (Gemini Vision score → image propre OU Imagen génère image luxe)
// 5. Nom FR luxe (Gemini : produit + marque + catégorie)
// 6. Description FR détaillée (Gemini : bienfaits, ingrédients, utilisation)
// 7. Sauvegarde DB (sous-catégorie + image locale + nom FR + description)
// 8. ZERO trace AliExpress visible côté client
//
// Usage:
//   npx tsx scripts/import-real-products.ts
//   npx tsx scripts/import-real-products.ts --keywords "vitamin c serum"
//   npx tsx scripts/import-real-products.ts --hot           # Hot Products API
//   npx tsx scripts/import-real-products.ts --category soins
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const PRODUCTS_DIR = path.join(process.cwd(), 'frontend', 'public', 'products');

// ============================================================================
// Config
// ============================================================================

const ALIEXPRESS_APP_KEY = process.env.ALIEXPRESS_APP_KEY!;
const ALIEXPRESS_APP_SECRET = process.env.ALIEXPRESS_APP_SECRET!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DS_APP_KEY = process.env.ALIEXPRESS_DS_APP_KEY || '530400';
const DS_APP_SECRET = process.env.ALIEXPRESS_DS_APP_SECRET || 'IlvnsV9KYL91OVSp0s0bLuI9fZNFFXWO';

if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
  console.error('ERROR: ALIEXPRESS_APP_KEY + ALIEXPRESS_APP_SECRET required');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY required');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

// Price multiplier
const PRICE_MULTIPLIER = 2.5;
const MIN_MARGIN = 0.35;

// ============================================================================
// AliExpress API helpers
// ============================================================================

function signParams(params: Record<string, string>): string {
  const sorted = Object.entries(params)
    .filter(([k, v]) => k !== 'sign' && v)
    .sort(([a], [b]) => a.localeCompare(b));
  let base = '';
  for (const [k, v] of sorted) base += k + v;
  return crypto.createHmac('md5', ALIEXPRESS_APP_SECRET).update(base, 'utf8').digest('hex').toUpperCase();
}

async function aliexpressCall<T>(method: string, bizParams: Record<string, string> = {}): Promise<T> {
  const params: Record<string, string> = {
    method,
    app_key: ALIEXPRESS_APP_KEY,
    timestamp: Date.now().toString(),
    sign_method: 'hmac',
    v: '2.0',
    simplify: 'true',
    ...bizParams,
  };
  params.sign = signParams(params);

  const resp = await axios.post('https://api-sg.aliexpress.com/sync', new URLSearchParams(params).toString(), {
    timeout: 15000,
  });

  // Find response key
  const responseKey = `${method.replace(/\./g, '_')}_response`;
  const methodResp = resp.data[responseKey];

  if (resp.data.error_response) {
    throw new Error(`AliExpress: ${resp.data.error_response.msg}`);
  }

  // Handle resp_result wrapping (Affiliate API)
  if (methodResp?.resp_result?.result) return methodResp.resp_result.result;
  if (methodResp?.result) return methodResp.result;
  return methodResp;
}

// ============================================================================
// DS API helpers (details, variants, descriptions)
// ============================================================================

let _dsToken: string | null = null;

async function getDSToken(): Promise<string | null> {
  if (_dsToken) return _dsToken;
  try {
    const cred = await prisma.aliExpressCredential.findFirst({ where: { isActive: true } });
    if (!cred) return null;
    const key = CryptoJS.enc.Hex.parse(process.env.ENCRYPTION_KEY!);
    const combined = CryptoJS.enc.Base64.parse(cred.accessTokenEncrypted);
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
    const enc = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);
    const dec = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext: enc }), key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    _dsToken = dec.toString(CryptoJS.enc.Utf8);
    return _dsToken;
  } catch { return null; }
}

function signDS(params: Record<string, string>): string {
  const sorted = Object.entries(params).filter(([k, v]) => k !== 'sign' && v).sort(([a], [b]) => a.localeCompare(b));
  let base = '';
  for (const [k, v] of sorted) base += k + v;
  return crypto.createHmac('md5', DS_APP_SECRET).update(base, 'utf8').digest('hex').toUpperCase();
}

async function fetchDSProduct(token: string, productId: string): Promise<any> {
  const params: Record<string, string> = {
    method: 'aliexpress.ds.product.get', app_key: DS_APP_KEY, session: token,
    timestamp: Date.now().toString(), sign_method: 'hmac', v: '2.0', simplify: 'true',
    product_id: productId, ship_to_country: 'FR', target_currency: 'EUR', target_language: 'EN',
  };
  params.sign = signDS(params);
  const resp = await axios.post('https://api-sg.aliexpress.com/sync', new URLSearchParams(params).toString(), { timeout: 15000 });
  return resp.data?.aliexpress_ds_product_get_response?.result;
}

// ============================================================================
// Category mapping: AliExpress → Our subcategories
// ============================================================================

interface SubCatRow { id: string; slug: string; name: string; parentSlug: string }

async function loadSubCategories(): Promise<SubCatRow[]> {
  // Load subcategories (have parent) + parent categories without children (like Parfums)
  const allCats = await prisma.category.findMany({
    include: { parent: true, children: true },
  });

  const result: SubCatRow[] = [];
  for (const c of allCats) {
    if (c.parentId && c.parent) {
      // Subcategory
      result.push({ id: c.id, slug: c.slug, name: c.name, parentSlug: c.parent.slug });
    } else if ((c as any).children?.length === 0) {
      // Parent with no children (like Parfums) — treat as assignable category
      result.push({ id: c.id, slug: c.slug, name: c.name, parentSlug: c.slug });
    }
  }
  return result;
}

// Map AliExpress category names → our subcategory slugs
const CATEGORY_MAP: Record<string, string> = {
  // Soins
  'Skin Care': 'hydratants',
  'Face Skin Care': 'hydratants',
  'Face Cream': 'hydratants',
  'Facial Care': 'hydratants',
  'Serum': 'serums',
  'Eye Care': 'soins-yeux',
  'Sun Care': 'solaires-autobronzants',
  'Sunscreen': 'solaires-autobronzants',
  'Cleansing': 'nettoyants',
  'Facial Cleanser': 'nettoyants',
  'Face Mask': 'masques-visage',
  'Sheet Masks': 'masques-visage',
  'Body Care': 'mains-corps',
  'Body Lotion': 'mains-corps',
  'Hand Care': 'mains-corps',
  'Hand Cream': 'mains-corps',
  'Lip Care': 'soins-levres',
  // Maquillage
  'Makeup': 'fond-de-teint',
  'Face Makeup': 'fond-de-teint',
  'Foundation': 'fond-de-teint',
  'Concealer': 'anti-cernes',
  'Powder': 'poudre',
  'Blush': 'blush-bronzer',
  'Eye Shadow': 'maquillage-visage',
  'Eyeshadow': 'maquillage-visage',
  'Mascara': 'maquillage-yeux',
  'Eyeliner': 'maquillage-yeux',
  'Eye Makeup': 'maquillage-yeux',
  'Lipstick': 'maquillage-levres',
  'Lip Gloss': 'maquillage-levres',
  'Lip Care': 'maquillage-levres',
  'Lip Makeup': 'maquillage-levres',
  // Parfums
  'Perfume': 'parfums',
  'Fragrance': 'parfums',
  'Deodorant': 'parfums',
};

function mapToSubCategory(aliCategoryName: string, title: string, subCats: SubCatRow[]): SubCatRow | null {
  // 1. Direct match from AliExpress category
  const mapped = CATEGORY_MAP[aliCategoryName];
  if (mapped) {
    const found = subCats.find(s => s.slug === mapped);
    if (found) return found;
  }

  // 2. Keyword detection from title (order matters — most specific first)
  const lower = title.toLowerCase();

  // Parfums
  if (/perfum|fragranc|cologne|eau de|parfum|body mist|pheromone/.test(lower)) {
    return subCats.find(s => s.slug === 'parfums') ?? null;
  }
  // Maquillage — Lèvres
  if (/lipstick|lip gloss|lip liner|lip tint|lip colour|lip color/.test(lower)) {
    return subCats.find(s => s.slug === 'maquillage-levres') ?? null;
  }
  // Maquillage — Fards à Paupières
  if (/eyeshadow|eye shadow|palette.*eye|palette.*shimmer|palette.*nude/.test(lower)) {
    return subCats.find(s => s.slug === 'maquillage-visage') ?? null;
  }
  // Maquillage — Mascara & Eyeliner
  if (/mascara|eyeliner|eye liner/.test(lower)) {
    return subCats.find(s => s.slug === 'maquillage-yeux') ?? null;
  }
  // Maquillage — Fond de Teint
  if (/foundation|bb cream|cc cream|tinted|tint stick/.test(lower)) {
    return subCats.find(s => s.slug === 'fond-de-teint') ?? null;
  }
  // Maquillage — Anti-Cernes
  if (/concealer|anti.cerne|corrector/.test(lower)) {
    return subCats.find(s => s.slug === 'anti-cernes') ?? null;
  }
  // Maquillage — Poudre
  if (/powder|poudre|setting powder|compact/.test(lower)) {
    return subCats.find(s => s.slug === 'poudre') ?? null;
  }
  // Maquillage — Blush & Bronzer
  if (/blush|bronzer|highlighter|contour.*face/.test(lower)) {
    return subCats.find(s => s.slug === 'blush-bronzer') ?? null;
  }
  // Soins — Yeux
  if (/eye cream|eye care|dark circle|eye bag|eye contour|eye balm|eye serum/.test(lower)) {
    return subCats.find(s => s.slug === 'soins-yeux') ?? null;
  }
  // Soins — Solaires
  if (/sunscreen|spf|sun protection|sun cream|sun stick/.test(lower)) {
    return subCats.find(s => s.slug === 'solaires-autobronzants') ?? null;
  }
  // Soins — Nettoyants
  if (/cleanser|face wash|cleansing|foam wash/.test(lower)) {
    return subCats.find(s => s.slug === 'nettoyants') ?? null;
  }
  // Soins — Démaquillants
  if (/remover|micellar|cleansing oil|cotton.*towel|makeup remov/.test(lower)) {
    return subCats.find(s => s.slug === 'demaquillants') ?? null;
  }
  // Soins — Exfoliants
  if (/exfoli|scrub|peel|aha|bha|acid.*peel/.test(lower)) {
    return subCats.find(s => s.slug === 'exfoliants') ?? null;
  }
  // Soins — Lèvres
  if (/lip balm|lip care|lip mask|lip sleeping|lip repair/.test(lower)) {
    return subCats.find(s => s.slug === 'soins-levres') ?? null;
  }
  // Soins — Masques
  if (/mask|masque|sheet mask|peel off mask/.test(lower)) {
    return subCats.find(s => s.slug === 'masques-visage') ?? null;
  }
  // Soins — Mains & Corps
  if (/body|hand cream|body lotion|body cream|hand care|foot|shower|bath/.test(lower)) {
    return subCats.find(s => s.slug === 'mains-corps') ?? null;
  }
  // Soins — Sérums (before hydratants — more specific)
  if (/serum|sérum|essence|ampoule|elixir/.test(lower)) {
    return subCats.find(s => s.slug === 'serums') ?? null;
  }
  // Soins — Hydratants (fallback for creams/moisturizers)
  if (/cream|crème|moistur|hydrat|retinol|collagen|vitamin|nourish/.test(lower)) {
    return subCats.find(s => s.slug === 'hydratants') ?? null;
  }

  return null;
}

// ============================================================================
// Gemini AI: Categorize product
// ============================================================================

async function geminiCategorize(title: string, subCats: SubCatRow[]): Promise<SubCatRow | null> {
  try {
    const slugList = subCats.map(s => `${s.slug} (${s.name})`).join(', ');
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Produit cosmétique: "${title}"
Sous-catégories disponibles: ${slugList}
Quelle sous-catégorie correspond le mieux ? Réponds UNIQUEMENT avec le slug, rien d'autre.`,
    });
    const slug = (result.text ?? '').trim();
    return subCats.find(s => s.slug === slug) ?? null;
  } catch { return null; }
}

// ============================================================================
// Gemini AI: Score image for product-alone quality
// ============================================================================

async function findBestImage(imageUrls: string[]): Promise<{ url: string; score: number } | null> {
  if (!imageUrls.length) return null;
  let bestUrl = '';
  let bestScore = 0;

  for (const url of imageUrls.slice(0, 6)) {
    try {
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
      const b64 = Buffer.from(resp.data).toString('base64');
      const mime = resp.headers['content-type'] || 'image/jpeg';

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { data: b64, mimeType: mime } },
          { text: `Score 0-100 for luxury e-commerce. HIGH 80+: Single product, clean bg, no text. MEDIUM 50-79: Product visible but text/busy bg. LOW 0-49: Multiple products, infographic. Reply JSON: {"score":NUMBER}` },
        ],
      });
      const match = (result.text ?? '').match(/"score"\s*:\s*(\d+)/);
      const score = match ? parseInt(match[1]!) : 0;
      if (score > bestScore) { bestScore = score; bestUrl = url; }
      if (score >= 85) break;
    } catch { /* skip */ }
  }
  return bestScore >= 40 ? { url: bestUrl, score: bestScore } : null;
}

// ============================================================================
// Imagen AI: Generate luxury product image
// ============================================================================

const BACKGROUNDS: Record<string, string[]> = {
  'hydratants-serums': ['white marble with rose petals, soft morning light', 'light grey stone with water droplets, zen spa'],
  'soins-yeux': ['clean white ceramic tray on beige linen', 'pink silk fabric, soft diffused lighting'],
  'solaires-autobronzants': ['sandy beach texture with soft golden light', 'white towel on warm stone surface'],
  'demaquillants': ['clean white bathroom counter, minimalist', 'light grey marble with cotton pads'],
  'masques-visage': ['spa-like bamboo tray with eucalyptus', 'white ceramic on soft linen'],
  'mains-corps': ['warm wooden surface with lavender sprigs', 'white marble with soft pink towel'],
  'maquillage-visage': ['black marble with gold accents, dramatic lighting', 'rose gold tray, luxury counter'],
  'maquillage-yeux': ['dark slate with gold leaf, editorial beauty', 'sleek black surface, spotlight'],
  'maquillage-levres': ['velvet dark surface with rose petals', 'marble with gold veins, beauty counter'],
  'parfums': ['dark wood with silk fabric, warm amber light', 'black marble with gold accents, perfumery'],
  'default': ['clean white marble, soft natural lighting'],
};

async function generateLuxuryImage(imgUrl: string, name: string, catSlug: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const resp = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
    const b64 = Buffer.from(resp.data).toString('base64');
    const mime = resp.headers['content-type'] || 'image/jpeg';
    const bgs = BACKGROUNDS[catSlug] ?? BACKGROUNDS['default']!;
    const bg = bgs[Math.floor(Math.random() * bgs.length)]!;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        { inlineData: { data: b64, mimeType: mime } },
        { text: `You are a luxury beauty brand product photographer.

TASK: Extract ONLY the physical product (bottle, tube, jar, box, palette) from this image and place it on: ${bg}

STRICT RULES:
- Show ONLY the product container/packaging — NO human faces, NO hands, NO body parts, NO mannequins
- Remove ALL text overlays, promotional banners, watermarks, infographics
- Product must be centered, well-lit, sharp, professional
- Background must be clean and luxurious
- Square 1:1 aspect ratio for e-commerce
- High-end beauty brand editorial quality
- If the original shows a person using the product, extract JUST the product bottle/tube itself

Generate the image.` },
      ],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    });

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return { b64: part.inlineData.data, mime: part.inlineData.mimeType || 'image/png' };
      }
    }
    return null;
  } catch (err) {
    console.log(`    [Imagen] ${err instanceof Error ? err.message.slice(0, 60) : 'Error'}`);
    return null;
  }
}

function saveImage(productId: string, b64: string, mime: string, suffix: string): string | null {
  try {
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const filename = `${productId}-${suffix}.${ext}`;
    fs.writeFileSync(path.join(PRODUCTS_DIR, filename), Buffer.from(b64, 'base64'));
    return `/products/${filename}`;
  } catch { return null; }
}

// ============================================================================
// Gemini AI: Detect variants from product title
// ============================================================================

interface DetectedVariant {
  name: string;
  nameFR: string;
  priceFactor: number;
  type: 'quantity' | 'color' | 'volume' | 'shade' | 'none';
}

async function detectVariants(title: string, basePrice: number): Promise<DetectedVariant[]> {
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Product: "${title}"

Detect variants from the title. Look for:
- Quantities: "1/2/3/5pcs" → quantity variants
- Colors: "19 colors" or "8 colors" → color variants (generate realistic cosmetic color names in French)
- Volumes: "30ml/50ml/100ml" → volume variants

Reply JSON ONLY:
{"type":"quantity|color|volume|none","variants":[{"name":"English","nameFR":"French","priceFactor":1.0}]}

Rules:
- For colors: use realistic French cosmetic names (Rose Nude, Rouge Passion, Corail Velours, Beige Satin...)
- For quantities: priceFactor proportional (2 pcs = 1.8x, 3 pcs = 2.5x, etc.)
- For volumes: priceFactor proportional (50ml = 1.5x of 30ml, etc.)
- Max 6 variants
- If no variants detected: {"type":"none","variants":[]}`,
    });

    const text = (result.text ?? '').replace(/```json?\n?|\n?```/g, '').trim();
    const json = JSON.parse(text);

    if (json.type === 'none' || !json.variants?.length) return [];

    return json.variants.slice(0, 6).map((v: any) => ({
      name: v.name ?? '',
      nameFR: v.nameFR ?? v.name ?? '',
      priceFactor: v.priceFactor ?? 1,
      type: json.type,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Gemini AI: French luxury name + description
// ============================================================================

async function generateFrenchContent(
  originalTitle: string,
  categoryName: string,
  imageUrl?: string,
): Promise<{ name: string; description: string; benefits: string[] }> {
  try {
    const contents: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    // Add product image for better analysis
    if (imageUrl) {
      try {
        const resp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
        contents.push({
          inlineData: {
            data: Buffer.from(resp.data).toString('base64'),
            mimeType: resp.headers['content-type'] || 'image/jpeg',
          },
        });
      } catch { /* no image, text only */ }
    }

    contents.push({
      text: `Tu es directeur marketing de la marque de beauté luxe "Hayoss".

Produit: "${originalTitle}"
Catégorie: ${categoryName}

Génère en JSON:
{
  "name": "MARQUE + Nom du produit en français (max 50 chars). TOUJOURS commencer par la marque. NE JAMAIS mettre Hayoss. Exemples: 'KAYALI Eau de Parfum Vanille', 'BIOAQUA Sérum Vitamine C', 'LAIKOU Crème Hydratante Sakura', 'POPFEEL Palette Yeux 40 Couleurs'",
  "description": "Description FR 3-4 phrases luxe. Détailler: bienfaits principaux, ingrédients clés (déduits du titre), texture/sensation, résultat attendu. Ton professionnel sophistiqué. JAMAIS mentionner AliExpress/Chine.",
  "benefits": ["Bienfait 1", "Bienfait 2", "Bienfait 3"]
}

Réponds UNIQUEMENT le JSON.`,
    });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    const text = (result.text ?? '').replace(/```json?\n?|\n?```/g, '').trim();
    const json = JSON.parse(text);
    return {
      name: json.name?.slice(0, 60) ?? originalTitle.slice(0, 60),
      description: json.description ?? '',
      benefits: json.benefits ?? [],
    };
  } catch {
    return { name: originalTitle.slice(0, 60), description: '', benefits: [] };
  }
}

// ============================================================================
// Search products on AliExpress
// ============================================================================

interface AffiliateProduct {
  product_id?: number;
  product_title?: string;
  product_main_image_url?: string;
  product_small_image_urls?: { string?: string[] };
  target_sale_price?: string;
  target_original_price?: string;
  evaluate_rate?: string;
  first_level_category_id?: number;
  first_level_category_name?: string;
  second_level_category_id?: number;
  second_level_category_name?: string;
  shop_id?: number;
  lastest_volume?: number;
  ship_to_days?: string;
  discount?: string;
  product_detail_url?: string;
}

async function searchProducts(keywords: string, pageSize = 20): Promise<AffiliateProduct[]> {
  const result = await aliexpressCall<{
    products?: { product?: AffiliateProduct[] };
    total_record_count?: number;
  }>('aliexpress.affiliate.product.query', {
    keywords,
    target_currency: 'EUR',
    target_language: 'EN',
    ship_to_country: 'FR',
    page_size: String(Math.min(pageSize, 50)),
    sort: 'LAST_VOLUME_DESC',
  });
  return result.products?.product ?? [];
}

async function searchHotProducts(categoryIds?: string, pageSize = 20): Promise<AffiliateProduct[]> {
  try {
    const params: Record<string, string> = {
      target_currency: 'EUR',
      target_language: 'EN',
      ship_to_country: 'FR',
      page_size: String(Math.min(pageSize, 50)),
    };
    if (categoryIds) params.category_ids = categoryIds;

    const result = await aliexpressCall<{
      products?: { product?: AffiliateProduct[] };
    }>('aliexpress.affiliate.hotproduct.query', params);
    return result.products?.product ?? [];
  } catch (err) {
    console.log(`  [Hot Products] ${err instanceof Error ? err.message.slice(0, 60) : 'Error'}`);
    return [];
  }
}

async function getProductDetail(productId: string): Promise<AffiliateProduct | null> {
  try {
    const result = await aliexpressCall<{
      products?: { product?: AffiliateProduct[] };
    }>('aliexpress.affiliate.productdetail.get', {
      product_ids: productId,
      target_currency: 'EUR',
      target_language: 'EN',
      ship_to_country: 'FR',
    });
    return result.products?.product?.[0] ?? null;
  } catch { return null; }
}

// ============================================================================
// Import a single product (FULL PIPELINE)
// ============================================================================

async function importProduct(
  raw: AffiliateProduct,
  subCats: SubCatRow[],
): Promise<{ status: 'imported' | 'updated' | 'skipped' | 'failed'; name: string; reason?: string }> {
  const aliId = String(raw.product_id ?? '');
  const title = raw.product_title ?? '';
  if (!aliId || !title) return { status: 'skipped', name: title, reason: 'Missing ID or title' };

  const price = parseFloat(raw.target_sale_price ?? '0');
  if (price <= 0) return { status: 'skipped', name: title, reason: 'No price' };

  // REJECT men's products
  const titleLower = title.toLowerCase();
  if (/\bmen\b|\bmen'?s\b|\bhombre\b|\bmasculin|\bbeard\b|\bgrooming\b/.test(titleLower)) {
    return { status: 'skipped', name: title, reason: 'Men product rejected' };
  }

  // ── 1. DÉDOUBLONNAGE ──────────────────────────────────────────────
  const existing = await prisma.product.findUnique({ where: { aliexpressId: aliId } });
  if (existing) {
    const existingCost = Number(existing.costPrice);
    if (price < existingCost) {
      // Price dropped → update only the source URL
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          costPrice: price,
          sellingPrice: Math.max(price * PRICE_MULTIPLIER, price / (1 - MIN_MARGIN)),
          aliexpressUrl: raw.product_detail_url ?? existing.aliexpressUrl,
        },
      });
      return { status: 'updated', name: existing.name ?? title, reason: `Price ${existingCost}→${price}€` };
    }
    return { status: 'skipped', name: title, reason: 'Already exists' };
  }

  // Check by similar name
  const nameExists = await prisma.product.findFirst({ where: { originalName: title } });
  if (nameExists) return { status: 'skipped', name: title, reason: 'Similar product exists' };

  // ── 2. CATÉGORISATION ─────────────────────────────────────────────
  const aliCatName = raw.second_level_category_name ?? raw.first_level_category_name ?? '';
  let subCat = mapToSubCategory(aliCatName, title, subCats);

  if (!subCat) {
    console.log(`    Asking Gemini for category...`);
    subCat = await geminiCategorize(title, subCats);
  }

  if (!subCat) {
    // Default to first subcategory of soins
    subCat = subCats.find(s => s.slug === 'hydratants-serums') ?? subCats[0]!;
  }
  console.log(`    Category: ${subCat.name} (${subCat.slug})`);

  // ── 3. IMAGES — TOUJOURS GÉNÉRER AVEC IMAGEN AI ────────────────
  // On ne sauve JAMAIS une image AliExpress directement.
  // Imagen prend la meilleure image source et génère le produit seul sur fond luxe.
  const allImages: string[] = [];
  if (raw.product_main_image_url) allImages.push(raw.product_main_image_url);
  if (raw.product_small_image_urls?.string) allImages.push(...raw.product_small_image_urls.string);

  let savedImage: string | null = null;

  if (allImages.length > 0) {
    // Trouver la meilleure image source pour Imagen (celle avec le produit le plus visible)
    console.log(`    Finding best source image from ${allImages.length} images...`);
    const best = await findBestImage(allImages);
    const sourceUrl = best?.url ?? allImages[0]!;
    console.log(`    Source image score: ${best?.score ?? 0}/100`);

    // TOUJOURS générer avec Imagen AI — produit seul sur fond luxe
    console.log(`    Generating luxury image with Imagen AI...`);
    const gen = await generateLuxuryImage(sourceUrl, title, subCat.slug);
    if (gen) {
      savedImage = saveImage(aliId, gen.b64, gen.mime, 'luxe');
      console.log(`    ✓ Luxury image generated`);
    } else {
      // Retry with a different source image
      if (allImages.length > 1) {
        console.log(`    Retrying with different source...`);
        const altUrl = allImages[1]!;
        const gen2 = await generateLuxuryImage(altUrl, title, subCat.slug);
        if (gen2) {
          savedImage = saveImage(aliId, gen2.b64, gen2.mime, 'luxe');
          console.log(`    ✓ Luxury image generated (retry)`);
        }
      }
      if (!savedImage) {
        console.log(`    ✗ Imagen failed — product skipped (no raw AliExpress images allowed)`);
      }
    }
  }

  if (!savedImage) return { status: 'failed', name: title, reason: 'No image' };

  // ── 4. DS API — DETAILS COMPLETS (variantes, description, stock) ──
  let dsVariants: Array<{ name: string; price: number; stock: number; image: string | null; skuId: string }> = [];
  let dsDescription = '';
  let dsSpecs = '';

  try {
    const dsToken = await getDSToken();
    if (dsToken) {
      console.log(`    Fetching DS details...`);
      const dsData = await fetchDSProduct(dsToken, aliId);
      if (dsData) {
        // Extract variants from DS SKUs
        const skus = dsData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o ?? [];
        for (const sku of skus) {
          const props = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o ?? [];
          // sku_property_value = real name (wine red, 30ml), definition_name = code (SS32-06)
          const variantName = props.map((p: any) => {
            const realName = p.sku_property_value;
            const propName = p.sku_property_name; // "Color", "NET WT", etc.
            return realName || p.property_value_definition_name || '';
          }).filter(Boolean).join(' / ');
          if (variantName) {
            const skuImg = props.find((p: any) => p.sku_image)?.sku_image ?? null;
            dsVariants.push({
              name: variantName,
              price: parseFloat(sku.offer_sale_price ?? sku.sku_price ?? '0'),
              stock: sku.sku_available_stock ?? sku.ipm_sku_stock ?? 100,
              image: skuImg,
              skuId: sku.sku_id ?? sku.id ?? '',
            });
          }
        }
        // Extract description
        dsDescription = (dsData.ae_item_base_info_dto?.detail ?? '').replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
        const props = dsData.ae_item_properties?.ae_item_property ?? [];
        dsSpecs = props.map((p: any) => `${p.attr_name}: ${p.attr_value}`).join('\n');

        if (dsVariants.length > 0) console.log(`    ✓ DS: ${dsVariants.length} variants`);
        if (dsDescription.length > 20) console.log(`    ✓ DS: description (${dsDescription.length} chars)`);
      }
    }
  } catch { /* DS API optional */ }

  // ── 5. VARIANTES (DS API prioritaire, sinon Gemini detection) ────
  let useGeminiVariants = true;
  let variants: DetectedVariant[] = [];

  if (dsVariants.length > 0) {
    console.log(`    ✓ ${dsVariants.length} DS variants: ${dsVariants.map(v => v.name).join(', ').slice(0, 80)}`);
    useGeminiVariants = false;
  } else {
    console.log(`    Detecting variants with Gemini...`);
    variants = await detectVariants(title, price);
    if (variants.length > 0) {
      console.log(`    ✓ ${variants.length} Gemini variants: ${variants.map(v => v.nameFR).join(', ')}`);
    }
  }

  // ── 5. NOM + DESCRIPTION FR (avec marque) ─────────────────────────
  // Extract brand from title (first word that looks like a brand)
  const brandMatch = title.match(/^([A-Z]{2,}[A-Za-z]*)/);
  const brand = brandMatch ? brandMatch[1] : '';

  console.log(`    Generating French content...`);
  const content = await generateFrenchContent(title, subCat.name, allImages[0]);
  console.log(`    ✓ "${content.name}"`);

  // ── 6. PRIX ───────────────────────────────────────────────────────
  const sellingPrice = Math.max(
    Math.ceil(price * PRICE_MULTIPLIER * 100) / 100,
    Math.ceil(price / (1 - MIN_MARGIN) * 100) / 100
  );

  // ── 7. SAUVEGARDE DB ──────────────────────────────────────────────
  const slug = content.name.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  const shipDays = parseInt(raw.ship_to_days ?? '20', 10);

  // Build description HTML with brand + DS details (kept raw, not rewritten)
  const brandLine = brand ? `<p class="text-sm text-neutral-500 mb-2">Par <strong>${brand}</strong></p>` : '';
  const benefitsHtml = content.benefits.length > 0 ? `<ul class="mt-3 space-y-1">${content.benefits.map(b => `<li>✦ ${b}</li>`).join('')}</ul>` : '';
  const specsHtml = dsSpecs ? `<div class="mt-4 pt-4 border-t border-neutral-100"><h4 class="font-medium text-sm mb-2">Caractéristiques</h4><p class="text-sm text-neutral-600 whitespace-pre-line">${dsSpecs}</p></div>` : '';
  const descHtml = `${brandLine}<p>${content.description}</p>${benefitsHtml}${specsHtml}`;

  try {
    const product = await prisma.product.create({
      data: {
        aliexpressId: aliId,
        aliexpressUrl: raw.product_detail_url ?? `https://www.aliexpress.com/item/${aliId}.html`,
        name: content.name,
        originalName: title,
        originalDescription: dsDescription || null,
        categoryId: subCat.id,
        images: [savedImage],
        basePrice: price,
        costPrice: price,
        sellingPrice,
        currency: 'EUR',
        weight: 0.3,
        stock: 100,
        rating: Math.min(parseFloat(raw.evaluate_rate ?? '0') / 20, 5),
        orderVolume: raw.lastest_volume ?? 0,
        supplierId: String(raw.shop_id ?? 'hayoss'),
        supplierName: brand || 'Beauté',
        shippingTimeMin: Math.max(shipDays - 5, 7),
        shippingTimeMax: shipDays,
        importScore: 70,
        isActive: true,
        isFeatured: (raw.lastest_volume ?? 0) > 500,
        lastSyncAt: new Date(),
        translations: {
          create: [
            {
              locale: 'fr',
              name: content.name,
              slug: `${slug}-${aliId.slice(-6)}`,
              description: content.description,
              descriptionHtml: descHtml,
              benefits: content.benefits,
              metaTitle: content.name.slice(0, 60),
              metaDescription: content.description.slice(0, 155),
              metaKeywords: content.name.split(' ').filter(w => w.length > 3),
            },
          ],
        },
        // Create variants: DS API variants first, fallback to Gemini-detected
        variants: dsVariants.length > 0 ? {
          create: dsVariants.map((v, i) => ({
            aliexpressSku: v.skuId || `${aliId}-V${i}`,
            name: v.name,
            sku: v.skuId || `${aliId}-V${i}`,
            price: Math.max(Math.ceil(v.price * PRICE_MULTIPLIER * 100) / 100, Math.ceil(v.price / (1 - MIN_MARGIN) * 100) / 100),
            currency: 'EUR',
            stock: v.stock,
            attributes: { source: 'ds_api' } as object,
            image: v.image,
            isActive: true,
          })),
        } : variants.length > 0 ? {
          create: variants.map((v, i) => ({
            aliexpressSku: `${aliId}-V${i}`,
            name: v.nameFR,
            sku: `${aliId}-V${i}`,
            price: Math.ceil(sellingPrice * v.priceFactor * 100) / 100,
            currency: 'EUR',
            stock: 100,
            attributes: { type: v.type, source: 'gemini' } as object,
            isActive: true,
          })),
        } : undefined,
      },
    });

    return { status: 'imported', name: content.name };
  } catch (err) {
    return { status: 'failed', name: title, reason: err instanceof Error ? err.message.slice(0, 50) : 'DB error' };
  }
}

// ============================================================================
// IMPORT SEARCHES BY CATEGORY
// ============================================================================

const DEFAULT_SEARCHES = [
  // ══════════════════════════════════════════════════
  // SOINS — Hydratants
  { keywords: 'face cream moisturizer hydrating women', category: 'soins' },
  { keywords: 'night cream anti aging collagen women', category: 'soins' },
  // SOINS — Sérums
  { keywords: 'hyaluronic acid serum face women', category: 'soins' },
  { keywords: 'vitamin c brightening serum face', category: 'soins' },
  { keywords: 'retinol anti aging serum face', category: 'soins' },
  // SOINS — Nettoyants
  { keywords: 'facial cleanser gentle foam wash women', category: 'soins' },
  // SOINS — Soins des Yeux
  { keywords: 'eye cream anti wrinkle dark circles women', category: 'soins' },
  // SOINS — Solaires
  { keywords: 'sunscreen face spf50 protection lightweight', category: 'soins' },
  // SOINS — Démaquillants
  { keywords: 'makeup remover micellar water cleansing oil', category: 'soins' },
  // SOINS — Exfoliants
  { keywords: 'face exfoliator scrub peeling gel women', category: 'soins' },
  { keywords: 'aha bha exfoliating toner peel face', category: 'soins' },
  // SOINS — Soins des Lèvres
  { keywords: 'lip balm moisturizing repair care women', category: 'soins' },
  { keywords: 'lip mask sleeping collagen repair women', category: 'soins' },
  // SOINS — Masques
  { keywords: 'face mask sheet moisturizing collagen women', category: 'soins' },
  // SOINS — Mains & Corps
  { keywords: 'body lotion moisturizer cream women', category: 'soins' },
  { keywords: 'hand cream shea butter moisturizing', category: 'soins' },
  // ══════════════════════════════════════════════════
  // MAQUILLAGE — Fond de Teint
  { keywords: 'liquid foundation full coverage natural women', category: 'maquillage' },
  { keywords: 'bb cream cc cream tinted moisturizer women', category: 'maquillage' },
  // MAQUILLAGE — Anti-Cernes
  { keywords: 'concealer liquid full coverage dark circles women', category: 'maquillage' },
  // MAQUILLAGE — Poudre
  { keywords: 'face powder setting powder compact women', category: 'maquillage' },
  { keywords: 'translucent powder loose setting makeup', category: 'maquillage' },
  // MAQUILLAGE — Blush & Bronzer
  { keywords: 'blush powder cheek natural glow women', category: 'maquillage' },
  { keywords: 'bronzer highlighter contour powder palette', category: 'maquillage' },
  // MAQUILLAGE — Mascara & Eyeliner
  { keywords: 'mascara waterproof volume lengthening women', category: 'maquillage' },
  { keywords: 'eyeliner liquid waterproof precision women', category: 'maquillage' },
  // MAQUILLAGE — Fards à Paupières
  { keywords: 'eyeshadow palette shimmer matte neutral women', category: 'maquillage' },
  { keywords: 'eyeshadow palette nude warm tones women', category: 'maquillage' },
  // MAQUILLAGE — Lèvres
  { keywords: 'lipstick matte velvet long lasting women', category: 'maquillage' },
  { keywords: 'lip gloss moisturizing shine plumping women', category: 'maquillage' },
  // ══════════════════════════════════════════════════
  // PARFUMS
  { keywords: 'perfume women eau de parfum long lasting', category: 'parfums' },
  { keywords: 'women floral fruity perfume luxury', category: 'parfums' },
];

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const useHot = args.includes('--hot');
  const kwIndex = args.indexOf('--keywords');
  const customKeywords = kwIndex >= 0 ? args[kwIndex + 1] : null;
  const catIndex = args.indexOf('--category');
  const filterCategory = catIndex >= 0 ? args[catIndex + 1] : null;

  console.log('============================================================');
  console.log('  HAYOSS - Import Produits (Pipeline Complet)');
  console.log('  AliExpress → Gemini Vision → Imagen AI → DB');
  console.log('============================================================\n');

  const subCats = await loadSubCategories();
  console.log(`Sous-catégories: ${subCats.map(s => s.name).join(', ')}\n`);

  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const searches = customKeywords
    ? [{ keywords: customKeywords, category: filterCategory ?? 'all' }]
    : DEFAULT_SEARCHES.filter(s => !filterCategory || s.category === filterCategory);

  for (const search of searches) {
    console.log(`\n── ${search.keywords} ──`);

    let products: AffiliateProduct[] = [];

    if (useHot) {
      console.log('  Using Hot Products API...');
      products = await searchHotProducts('66', 10);
    } else {
      products = await searchProducts(search.keywords, 10);
    }

    console.log(`  Found ${products.length} products\n`);

    for (const raw of products) {
      const title = (raw.product_title ?? '').slice(0, 55);
      console.log(`  → ${title}`);

      const result = await importProduct(raw, subCats);

      switch (result.status) {
        case 'imported': console.log(`    ✓ IMPORTED: ${result.name}`); totalImported++; break;
        case 'updated': console.log(`    ↻ UPDATED: ${result.reason}`); totalUpdated++; break;
        case 'skipped': console.log(`    - SKIPPED: ${result.reason}`); totalSkipped++; break;
        case 'failed': console.log(`    ✗ FAILED: ${result.reason}`); totalFailed++; break;
      }
      console.log('');

      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Summary
  const total = await prisma.product.count();
  const byCategory = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
    SELECT c.name, count(p.id) FROM products p
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.name ORDER BY count DESC`;

  console.log('\n============================================================');
  console.log('  RÉSULTAT');
  console.log('============================================================');
  console.log(`  Importés: ${totalImported} | Mis à jour: ${totalUpdated}`);
  console.log(`  Ignorés: ${totalSkipped} | Échoués: ${totalFailed}`);
  console.log(`  Total en DB: ${total} produits`);
  console.log('\n  Par catégorie:');
  for (const row of byCategory) {
    console.log(`    ${row.name}: ${row.count}`);
  }
  console.log('============================================================');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
