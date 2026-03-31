#!/usr/bin/env tsx
// ============================================================================
// Enrich product descriptions from DS API → Gemini rewrites in French luxe
// Updates existing products, does NOT delete anything
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const DS_SECRET = process.env.ALIEXPRESS_DS_APP_SECRET || 'IlvnsV9KYL91OVSp0s0bLuI9fZNFFXWO';

async function getToken(): Promise<string> {
  const cred = await prisma.aliExpressCredential.findFirst({ where: { isActive: true } });
  if (!cred) throw new Error('No OAuth token');
  const key = CryptoJS.enc.Hex.parse(process.env.ENCRYPTION_KEY!);
  const combined = CryptoJS.enc.Base64.parse(cred.accessTokenEncrypted);
  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const enc = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);
  const dec = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext: enc }), key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return dec.toString(CryptoJS.enc.Utf8);
}

async function getDSDescription(token: string, productId: string): Promise<{ description: string; specs: string } | null> {
  try {
    const params: Record<string, string> = {
      method: 'aliexpress.ds.product.get', app_key: '530400', session: token,
      timestamp: Date.now().toString(), sign_method: 'hmac', v: '2.0', simplify: 'true',
      product_id: productId, ship_to_country: 'FR', target_currency: 'EUR', target_language: 'EN',
    };
    const sorted = Object.entries(params).filter(([k, v]) => k !== 'sign' && v).sort(([a], [b]) => a.localeCompare(b));
    let base = '';
    for (const [k, v] of sorted) base += k + v;
    params.sign = crypto.createHmac('md5', DS_SECRET).update(base, 'utf8').digest('hex').toUpperCase();

    const resp = await axios.post('https://api-sg.aliexpress.com/sync', new URLSearchParams(params).toString(), { timeout: 15000 });
    const r = resp.data?.aliexpress_ds_product_get_response?.result;
    if (!r) return null;

    const rawDesc = (r.ae_item_base_info_dto?.detail ?? '').replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    const props = r.ae_item_properties?.ae_item_property ?? [];
    const specs = props.map((p: any) => `${p.attr_name}: ${p.attr_value}`).join('\n');

    return { description: rawDesc, specs };
  } catch {
    return null;
  }
}

/** Extract details from DS description — keep raw, no Gemini rewrite */
function extractDetails(rawDesc: string): { ingredients: string | null; howToUse: string | null; specs: string | null } {
  let ingredients: string | null = null;
  let howToUse: string | null = null;
  let specs: string | null = null;

  // Extract ingredients section
  const ingredMatch = rawDesc.match(/(?:ingredients?|composition|INCI|formula)[:\s]*(.*?)(?:HOW TO|how to|STEP|step|COMMENT|SPECIFICATION|$)/is);
  if (ingredMatch?.[1] && ingredMatch[1].length > 10) {
    ingredients = ingredMatch[1].trim();
  }

  // Extract how to use section
  const howToMatch = rawDesc.match(/(?:HOW TO USE|how to use|Application|STEP|Usage)[:\s]*(.*?)(?:COMMENT|Note|SPECIFICATION|TIP|$)/is);
  if (howToMatch?.[1] && howToMatch[1].length > 10) {
    howToUse = howToMatch[1].replace(/Step\s*(\d)/gi, 'Étape $1').trim();
  }

  // Extract specifications
  const specMatch = rawDesc.match(/(?:SPECIFICATION|Specifications?)[:\s]*(.*?)(?:ADVANTAGE|HOW TO|$)/is);
  if (specMatch?.[1] && specMatch[1].length > 10) {
    specs = specMatch[1].trim();
  }

  return { ingredients, howToUse, specs };
}

async function main() {
  console.log('============================================================');
  console.log('  ENRICH DESCRIPTIONS: DS API → Gemini FR Luxe');
  console.log('============================================================\n');

  const token = await getToken();

  const products = await prisma.product.findMany({
    include: { translations: { where: { locale: 'fr' } }, category: true },
    orderBy: { createdAt: 'asc' },
  });

  // Process products without ingredients/howToUse (missing DS details)
  const toProcess = products.filter(p => {
    const tr = p.translations[0];
    return !tr?.ingredients || !tr?.howToUse;
  });

  console.log(`${toProcess.length} products need description enrichment (out of ${products.length} total)\n`);

  let enriched = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i]!;
    console.log(`[${i + 1}/${toProcess.length}] ${(p.name ?? '').slice(0, 50)}`);

    const dsData = await getDSDescription(token, p.aliexpressId);
    if (!dsData || dsData.description.length < 20) {
      console.log(`  - No DS description available\n`);
      continue;
    }

    console.log(`  DS desc: ${dsData.description.slice(0, 60)}...`);

    // Extract details RAW from DS description (no Gemini rewrite)
    const details = extractDetails(dsData.description);

    // Update translation with raw DS details
    const frTr = p.translations[0];
    if (frTr) {
      const updateFields: Record<string, any> = {};
      if (details.ingredients) updateFields.ingredients = details.ingredients;
      if (details.howToUse) updateFields.howToUse = details.howToUse;

      // Add specs to descriptionHtml if not already there
      if (details.specs && !frTr.descriptionHtml?.includes('Caractéristiques')) {
        updateFields.descriptionHtml = (frTr.descriptionHtml ?? '') +
          `<div class="mt-4 pt-4 border-t border-neutral-100"><h4 class="font-medium text-sm mb-2">Caractéristiques</h4><p class="text-sm text-neutral-600">${details.specs}</p></div>`;
      }

      if (Object.keys(updateFields).length > 0) {
        await prisma.productTranslation.update({
          where: { id: frTr.id },
          data: updateFields,
        });
      }
    }

    // Save original DS description
    await prisma.product.update({
      where: { id: p.id },
      data: { originalDescription: dsData.description.slice(0, 2000) },
    });

    enriched++;
    console.log(`  ✓ ingredients: ${details.ingredients ? 'yes' : 'no'} | howToUse: ${details.howToUse ? 'yes' : 'no'} | specs: ${details.specs ? 'yes' : 'no'}\n`);

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('============================================================');
  console.log(`  DONE: ${enriched} descriptions enriched`);
  console.log('============================================================');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
