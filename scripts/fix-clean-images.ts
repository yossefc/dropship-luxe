#!/usr/bin/env tsx
// Fix products with -clean.jpg images → regenerate with Imagen AI
// Does NOT delete anything, only updates images

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const PRODUCTS_DIR = path.join(process.cwd(), 'frontend', 'public', 'products');

const BACKGROUNDS: Record<string, string> = {
  'parfums': 'dark polished wood with silk fabric, warm amber lighting, luxury perfumery',
  'maquillage': 'sleek black marble with gold accents, dramatic studio lighting',
  'soins': 'white marble with rose petals, soft morning light, minimalist spa',
  'default': 'clean white marble surface, soft natural lighting',
};

async function main() {
  const products = await prisma.product.findMany({
    where: {
      images: { has: '' }, // Prisma doesn't support LIKE on arrays easily
    },
    include: { category: { include: { parent: true } } },
  });

  // Manual filter for -clean images
  const cleanProducts = await prisma.$queryRaw<Array<{ id: string; name: string; original_name: string; aliexpress_id: string; images: string[] }>>`
    SELECT id, name, original_name, aliexpress_id, images FROM products WHERE images[1] LIKE '%-clean.%'`;

  console.log(`Found ${cleanProducts.length} products with clean (mannequin) images to fix\n`);

  for (const p of cleanProducts) {
    console.log(`→ ${p.name}`);

    // Get the original AliExpress image URL from the product detail
    const detail = await getProductImages(p.aliexpress_id);
    if (!detail) {
      console.log(`  ✗ No source images found\n`);
      continue;
    }

    // Detect category for background
    const lower = (p.original_name ?? '').toLowerCase();
    let bg = BACKGROUNDS['default']!;
    if (/perfum|cologne|fragranc|eau de/.test(lower)) bg = BACKGROUNDS['parfums']!;
    else if (/lipstick|mascara|eyeshadow|foundation|blush|makeup/.test(lower)) bg = BACKGROUNDS['maquillage']!;
    else bg = BACKGROUNDS['soins']!;

    // Generate with Imagen
    console.log(`  Generating luxury image...`);
    try {
      const resp = await axios.get(detail, { responseType: 'arraybuffer', timeout: 10000 });
      const b64 = Buffer.from(resp.data).toString('base64');
      const mime = resp.headers['content-type'] || 'image/jpeg';

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [
          { inlineData: { data: b64, mimeType: mime } },
          { text: `Professional product photography: Extract ONLY the physical product (bottle, tube, jar, box) from this image and place it on ${bg}. NO human faces, NO hands, NO mannequins. Product centered, well-lit, square 1:1. Generate the image.` },
        ],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const parts = result.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const ext = (part.inlineData.mimeType || 'image/png').includes('png') ? 'png' : 'jpg';
          const filename = `${p.aliexpress_id}-luxe.${ext}`;
          fs.writeFileSync(path.join(PRODUCTS_DIR, filename), Buffer.from(part.inlineData.data, 'base64'));

          await prisma.product.update({
            where: { id: p.id },
            data: { images: [`/products/${filename}`] },
          });
          console.log(`  ✓ Fixed: /products/${filename}\n`);
          break;
        }
      }
    } catch (err) {
      console.log(`  ✗ Imagen failed: ${err instanceof Error ? err.message.slice(0, 60) : 'Error'}\n`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('Done!');
  await prisma.$disconnect();
}

async function getProductImages(aliId: string): Promise<string | null> {
  try {
    const crypto = await import('crypto');
    const params: Record<string, string> = {
      method: 'aliexpress.affiliate.productdetail.get',
      app_key: process.env.ALIEXPRESS_APP_KEY!,
      timestamp: Date.now().toString(),
      sign_method: 'hmac',
      v: '2.0',
      simplify: 'true',
      product_ids: aliId,
      target_currency: 'EUR',
      target_language: 'EN',
      ship_to_country: 'FR',
    };

    const sorted = Object.entries(params).filter(([k, v]) => k !== 'sign' && v).sort(([a], [b]) => a.localeCompare(b));
    let base = '';
    for (const [k, v] of sorted) base += k + v;
    params.sign = crypto.createHmac('md5', process.env.ALIEXPRESS_APP_SECRET!).update(base, 'utf8').digest('hex').toUpperCase();

    const resp = await axios.post('https://api-sg.aliexpress.com/sync', new URLSearchParams(params).toString());
    const product = resp.data?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product?.[0];
    return product?.product_main_image_url ?? null;
  } catch { return null; }
}

main().catch(e => { console.error(e); process.exit(1); });
