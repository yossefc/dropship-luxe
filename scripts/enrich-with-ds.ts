#!/usr/bin/env tsx
// ============================================================================
// Enrich existing products with DS API data (variants, stock, descriptions)
// Does NOT delete or replace — only ADDS missing data
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();
const DS_KEY = process.env.ALIEXPRESS_DS_APP_KEY || '530400';
const DS_SECRET = process.env.ALIEXPRESS_DS_APP_SECRET || 'IlvnsV9KYL91OVSp0s0bLuI9fZNFFXWO';

async function getToken(): Promise<string> {
  const cred = await prisma.aliExpressCredential.findFirst({ where: { isActive: true } });
  if (!cred) throw new Error('No OAuth token found');
  const key = CryptoJS.enc.Hex.parse(process.env.ENCRYPTION_KEY!);
  const combined = CryptoJS.enc.Base64.parse(cred.accessTokenEncrypted);
  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const enc = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);
  const dec = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext: enc }), key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return dec.toString(CryptoJS.enc.Utf8);
}

function sign(params: Record<string, string>): string {
  const sorted = Object.entries(params).filter(([k, v]) => k !== 'sign' && v).sort(([a], [b]) => a.localeCompare(b));
  let base = '';
  for (const [k, v] of sorted) base += k + v;
  return crypto.createHmac('md5', DS_SECRET).update(base, 'utf8').digest('hex').toUpperCase();
}

async function getDSProduct(token: string, productId: string): Promise<any> {
  const params: Record<string, string> = {
    method: 'aliexpress.ds.product.get', app_key: DS_KEY, session: token,
    timestamp: Date.now().toString(), sign_method: 'hmac', v: '2.0', simplify: 'true',
    product_id: productId, ship_to_country: 'FR', target_currency: 'EUR', target_language: 'EN',
  };
  params.sign = sign(params);
  const resp = await axios.post('https://api-sg.aliexpress.com/sync', new URLSearchParams(params).toString(), { timeout: 15000 });
  return resp.data?.aliexpress_ds_product_get_response?.result;
}

async function main() {
  console.log('============================================================');
  console.log('  ENRICH PRODUCTS WITH DS API (variants, stock, details)');
  console.log('============================================================\n');

  const token = await getToken();
  console.log(`Token OK (${token.length} chars)\n`);

  const products = await prisma.product.findMany({
    include: { variants: true, translations: { where: { locale: 'fr' } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`${products.length} products to enrich\n`);

  let enriched = 0;
  let variantsAdded = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    console.log(`[${i + 1}/${products.length}] ${(p.name ?? '').slice(0, 50)}`);

    try {
      const ds = await getDSProduct(token, p.aliexpressId);
      if (!ds) {
        console.log(`  ✗ Not found on DS API\n`);
        failed++;
        continue;
      }

      const skus = ds.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o ?? [];
      const storeInfo = ds.ae_store_info;
      const packageInfo = ds.package_info_dto;

      // Update product with DS data
      const updateData: Record<string, any> = {};

      // Weight from package info
      if (packageInfo?.gross_weight) {
        updateData.weight = parseFloat(packageInfo.gross_weight);
      }
      if (packageInfo) {
        updateData.dimensions = {
          length: packageInfo.package_length ?? 0,
          width: packageInfo.package_width ?? 0,
          height: packageInfo.package_height ?? 0,
        };
      }

      // Real stock from SKUs
      if (skus.length > 0) {
        const totalStock = skus.reduce((sum: number, s: any) => sum + (s.sku_available_stock ?? s.ipm_sku_stock ?? 0), 0);
        updateData.stock = totalStock;
      }

      // Store rating
      if (storeInfo?.item_as_described_rating) {
        updateData.rating = parseFloat(storeInfo.item_as_described_rating);
      }

      await prisma.product.update({ where: { id: p.id }, data: updateData });

      // Add variants if product has none and DS has SKUs with properties
      if (p.variants.length === 0 && skus.length > 0) {
        const newVariants: any[] = [];

        for (const sku of skus) {
          const props = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o ?? [];
          if (props.length === 0) continue;

          const variantName = props
            .map((prop: any) => prop.sku_property_value || prop.property_value_definition_name)
            .join(' / ');

          if (!variantName) continue;

          const skuImage = props.find((prop: any) => prop.sku_image)?.sku_image ?? null;
          const skuPrice = parseFloat(sku.offer_sale_price ?? sku.sku_price ?? '0');
          const sellingPrice = Math.max(skuPrice * 2.5, skuPrice / 0.65);

          newVariants.push({
            productId: p.id,
            aliexpressSku: sku.sku_id ?? sku.id ?? `${p.aliexpressId}-${newVariants.length}`,
            name: variantName,
            sku: `${p.aliexpressId}-${sku.sku_id ?? newVariants.length}`,
            price: Math.ceil(sellingPrice * 100) / 100,
            currency: 'EUR',
            stock: sku.sku_available_stock ?? sku.ipm_sku_stock ?? 100,
            attributes: {
              properties: props.map((prop: any) => ({
                name: prop.sku_property_name,
                value: prop.sku_property_value || prop.property_value_definition_name,
              })),
            },
            image: skuImage,
            isActive: true,
          });
        }

        if (newVariants.length > 0) {
          await prisma.productVariant.createMany({ data: newVariants });
          variantsAdded += newVariants.length;
          console.log(`  ✓ ${newVariants.length} variants: ${newVariants.map(v => v.name).join(', ').slice(0, 80)}`);
        }
      } else if (p.variants.length > 0) {
        console.log(`  - Already has ${p.variants.length} variants`);
      }

      enriched++;
      console.log(`  ✓ Enriched (stock: ${updateData.stock ?? 'unchanged'}, weight: ${updateData.weight ?? 'unchanged'})\n`);
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message.slice(0, 60) : 'Unknown'}\n`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('============================================================');
  console.log(`  DONE: ${enriched} enriched, ${variantsAdded} variants added, ${failed} failed`);
  console.log('============================================================');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
