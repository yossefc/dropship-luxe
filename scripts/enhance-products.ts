#!/usr/bin/env tsx
// ============================================================================
// Enhance Products: AI Images + French Luxury Names
// ============================================================================
// Uses @google/genai SDK with gemini-2.5-flash-image for image generation
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const PRODUCTS_DIR = path.join(process.cwd(), 'frontend', 'public', 'products');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY required');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================================
// Luxury backgrounds by category
// ============================================================================

const LUXURY_BACKGROUNDS: Record<string, string[]> = {
  skincare: [
    'elegant white marble surface with soft morning light, minimalist luxury spa',
    'light grey stone with water droplets, zen spa atmosphere',
    'clean white ceramic tray on beige linen, eucalyptus leaves',
  ],
  makeup: [
    'sleek black marble surface with gold accents, dramatic studio lighting',
    'rose gold tray on dark slate, luxury cosmetics brand',
    'white marble with gold veins, professional beauty counter',
  ],
  perfume: [
    'dark polished wood with silk fabric, warm amber lighting',
    'black marble with gold leaf accents, luxury perfumery',
    'blush satin fabric with crystal elements, romantic elegant mood',
  ],
  default: [
    'clean white marble surface, soft natural lighting, minimalist luxury',
  ],
};

function getBackground(category: string): string {
  const bgs = LUXURY_BACKGROUNDS[category] ?? LUXURY_BACKGROUNDS['default']!;
  return bgs[Math.floor(Math.random() * bgs.length)]!;
}

function detectCategory(name: string): string {
  const l = name.toLowerCase();
  if (/perfum|fragranc|cologne|eau de|parfum|body mist/.test(l)) return 'perfume';
  if (/lipstick|lip|mascara|eyeshadow|foundation|concealer|blush|highlighter|eyeliner|makeup|powder/.test(l)) return 'makeup';
  return 'skincare';
}

// ============================================================================
// Gemini Vision: Score each image for product-alone quality
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
          { text: `Score this product image 0-100 for luxury e-commerce.
HIGH 80-100: Single product alone, clean background, no text overlay, professional.
MEDIUM 50-79: Single product but some text or busy background.
LOW 0-49: Multiple products, infographic, lifestyle, heavy text.
Reply ONLY JSON: {"score":NUMBER}` },
        ],
      });

      const text = result.text ?? '';
      const match = text.match(/\{[^}]*"score"\s*:\s*(\d+)/);
      const score = match ? parseInt(match[1]!) : 0;

      if (score > bestScore) { bestScore = score; bestUrl = url; }
      if (score >= 85) break;
    } catch { /* skip */ }
  }

  return bestScore >= 40 ? { url: bestUrl, score: bestScore } : null;
}

// ============================================================================
// Imagen: Generate luxury product image
// ============================================================================

async function generateLuxuryImage(
  originalUrl: string,
  productName: string,
  category: string
): Promise<{ b64: string; mime: string } | null> {
  try {
    const resp = await axios.get(originalUrl, { responseType: 'arraybuffer', timeout: 10000 });
    const b64 = Buffer.from(resp.data).toString('base64');
    const mime = resp.headers['content-type'] || 'image/jpeg';
    const bg = getBackground(category);

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        { inlineData: { data: b64, mimeType: mime } },
        { text: `Professional product photography: Place this exact product on ${bg}.
Keep the product clearly visible and centered. Luxurious lighting, no text, no watermarks.
Square 1:1 ratio, high-end beauty brand aesthetic. Generate the image.` },
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return { b64: part.inlineData.data, mime: part.inlineData.mimeType || 'image/png' };
      }
    }
    return null;
  } catch (err) {
    console.log(`    [Imagen] Error: ${err instanceof Error ? err.message.slice(0, 80) : 'Unknown'}`);
    return null;
  }
}

// ============================================================================
// Gemini: French luxury name
// ============================================================================

async function generateName(originalName: string, category: string): Promise<string> {
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tu es directeur marketing d'une marque de beauté luxe "Hayoss".

Produit: "${originalName}"
Catégorie: ${category}

Crée un nom FRANÇAIS luxueux. Règles:
- PARFUM: garde le nom/marque du parfum (KAYALI, AZZARO, etc) + description poétique
- MAQUILLAGE: nom évocateur (ex: "Palette Regard de Soie", "Rouge Velours Éternel")
- SOIN: nom descriptif luxe (ex: "Sérum Éclat Vitamine C", "Crème Régénérante Collagène")
- Max 50 caractères
- JAMAIS mentionner AliExpress/Chine
- Ne PAS mettre "Hayoss" dans le nom

Réponds UNIQUEMENT le nom, rien d'autre.`,
    });

    const name = (result.text ?? '').trim().replace(/^["']|["']$/g, '');
    return (name.length > 3 && name.length < 80) ? name : originalName.slice(0, 60);
  } catch {
    return originalName.slice(0, 60);
  }
}

// ============================================================================
// Save image
// ============================================================================

function saveImg(productId: string, b64: string, mime: string, suffix: string): string | null {
  try {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const filename = `${productId}-${suffix}.${ext}`;
    fs.writeFileSync(path.join(PRODUCTS_DIR, filename), Buffer.from(b64, 'base64'));
    return `/products/${filename}`;
  } catch { return null; }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('============================================================');
  console.log('  ENHANCE PRODUCTS: AI Images + French Names');
  console.log('  Model: gemini-2.5-flash-image (image gen)');
  console.log('  Model: gemini-2.5-flash (analysis + names)');
  console.log('============================================================\n');

  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

  const products = await prisma.product.findMany({
    include: { translations: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${products.length} products\n`);

  let imageFixed = 0;
  let nameFixed = 0;
  let imageFailed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    const hasAI = p.images.some(img => img.startsWith('/products/'));
    const aliImgs = p.images.filter(img => img.startsWith('http'));
    const category = detectCategory(p.originalName ?? p.name ?? '');

    console.log(`[${i + 1}/${products.length}] ${(p.name ?? '').slice(0, 55)}`);

    // Skip if already has local image
    if (hasAI) {
      console.log(`  ✓ Already has AI image, skipping\n`);
      continue;
    }

    if (aliImgs.length === 0) {
      console.log(`  ✗ No images at all, skipping\n`);
      continue;
    }

    // STEP 1: Find clean product image
    let newImage: string | null = null;
    console.log(`  Analyzing ${aliImgs.length} images...`);
    const best = await findBestImage(aliImgs);

    if (best && best.score >= 60) {
      // Download and save clean image
      try {
        const r = await axios.get(best.url, { responseType: 'arraybuffer', timeout: 10000 });
        newImage = saveImg(p.aliexpressId, Buffer.from(r.data).toString('base64'), r.headers['content-type'] || 'image/jpeg', 'clean');
        console.log(`  ✓ Clean image saved (score ${best.score}): ${newImage}`);
        imageFixed++;
      } catch {
        console.log(`  ✗ Download failed`);
      }
    }

    if (!newImage) {
      // STEP 2: Generate with Imagen AI
      console.log(`  No clean image (best: ${best?.score ?? 0}). Generating luxury image...`);
      const candidate = best?.url ?? aliImgs[0]!;
      const gen = await generateLuxuryImage(candidate, p.name ?? '', category);
      if (gen) {
        newImage = saveImg(p.aliexpressId, gen.b64, gen.mime, 'luxe');
        console.log(`  ✓ Luxury image generated: ${newImage}`);
        imageFixed++;
      } else {
        console.log(`  ✗ Image generation failed`);
        imageFailed++;
      }
    }

    // STEP 3: French luxury name
    const newName = await generateName(p.originalName ?? p.name ?? '', category);
    const nameChanged = newName !== (p.name ?? '');

    if (nameChanged) {
      console.log(`  ✓ Name: "${(p.name ?? '').slice(0, 35)}" → "${newName.slice(0, 35)}"`);
      nameFixed++;
    }

    // Update DB
    const updateData: Record<string, unknown> = {};
    if (newImage) updateData.images = [newImage];
    if (nameChanged) updateData.name = newName;

    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({ where: { id: p.id }, data: updateData });

      if (nameChanged) {
        const frTr = p.translations.find(t => t.locale === 'fr');
        if (frTr) {
          await prisma.productTranslation.update({
            where: { id: frTr.id },
            data: { name: newName, metaTitle: newName.slice(0, 60) },
          });
        }
      }
    }

    console.log('');
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('============================================================');
  console.log('  DONE');
  console.log(`  Images fixed: ${imageFixed} | Failed: ${imageFailed}`);
  console.log(`  Names updated: ${nameFixed}`);
  console.log('============================================================');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
