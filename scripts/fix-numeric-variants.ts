#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function main() {
  const variants = await prisma.productVariant.findMany({
    where: { image: { not: null } },
    include: { product: true },
  });

  const numericVariants = variants.filter(v => /^\d+$/.test(v.name.trim()));
  console.log(`${numericVariants.length} variants with numeric names to fix\n`);

  let fixed = 0;
  for (const v of numericVariants) {
    try {
      const resp = await axios.get(v.image!, { responseType: 'arraybuffer', timeout: 8000 });
      const b64 = Buffer.from(resp.data).toString('base64');
      const mime = resp.headers['content-type'] || 'image/jpeg';

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { data: b64, mimeType: mime } },
          { text: 'This is a cosmetic product variant. What color/shade is it? Reply ONLY the French color name (Rose, Rouge, Corail, Nude, Beige, Brun, Pêche, Bordeaux, Mauve, Prune, Caramel, Terre Cuite, Abricot, Framboise, Fuchsia, Sable, Miel, Cuivre). Max 2 words.' },
        ],
      });

      const colorName = (result.text ?? '').trim().replace(/^["']|["']$/g, '').replace(/\./g, '');
      if (colorName.length > 1 && colorName.length < 25 && !/^\d+$/.test(colorName)) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { name: colorName },
        });
        console.log(`  ${v.name} → ${colorName} (${v.product.name?.slice(0, 35)})`);
        fixed++;
      }
    } catch { /* skip */ }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nFixed ${fixed} variants`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
