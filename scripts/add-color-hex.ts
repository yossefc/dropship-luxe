#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colorHexMap: Record<string, string | null> = {
  'rose': '#FF69B4', 'rose clair': '#FFB6C1', 'rose vif': '#FF1493', 'rose rouge': '#E8475B',
  'rose pâle': '#FFD1DC', 'rose saumon': '#FF9999', 'rose poudré': '#E8B4B8',
  'rouge': '#CC0000', 'rouge vin': '#722F37', 'rouge foncé': '#8B0000', 'rouge brique': '#CB4154',
  'corail': '#FF7F50', 'pêche': '#FFDAB9', 'abricot': '#FBCEB1',
  'nude': '#E3BC9A', 'beige': '#D4B896', 'sable': '#C2B280', 'crème': '#FFFDD0',
  'caramel': '#C68E17', 'miel': '#DAA520', 'ivoire': '#FFFFF0', 'champagne': '#F7E7CE',
  'brun': '#8B4513', 'chocolat': '#7B3F00', 'terre cuite': '#CC6633', 'cuivre': '#B87333',
  'mauve': '#E0B0FF', 'prune': '#660033', 'violet': '#8B008B', 'fuchsia': '#FF00FF',
  'framboise': '#C72C48', 'bordeaux': '#6D071A', 'berry': '#8E4585', 'cerise': '#DE3163',
  'noir': '#1A1A1A', 'blanc': '#FFFFFF',
  'bleu': '#4169E1', 'bleu ciel': '#87CEEB', 'marine': '#000080',
  'doré': '#DAA520', 'argenté': '#C0C0C0', 'or rose': '#B76E79',
  'multicolore': '#FF69B4', 'transparent': '#F0F0F0',
  'joy': '#E8967A', 'happy': '#D4856B', 'bliss': '#C9918A', 'hope': '#B5736C',
  'love': '#D4627A', 'faith': '#C97B8B', 'grace': '#E8A5A0', 'virtue': '#D49690',
  'lucky': '#C9857F', 'grateful': '#B5857D', 'believe': '#D4736F', 'encourage': '#C98780',
  'truth': '#B56862', 'worth': '#C97570', 'alive': '#D4625A', 'thriving': '#C9756E',
  'cheer': '#E88070', 'neutral': '#C9B5A5', 'apricot': '#FBCEB1',
  'wine red': '#722F37', 'light pink': '#FFB6C1', 'black': '#1A1A1A', 'white': '#FFFFFF',
  'sky blue': '#87CEEB', 'mixed color': '#FF69B4', 'chocolate': '#7B3F00',
  'natural': '#F5DEB3', 'coffee': '#6F4E37', 'red': '#CC0000', 'pink': '#FF69B4',
  'orange': '#FF6600', 'brown': '#8B4513', 'gold': '#DAA520', 'silver': '#C0C0C0',
  'blue': '#4169E1', 'purple': '#8B008B', 'green': '#228B22', 'yellow': '#FFD700',
};

async function main() {
  const variants = await prisma.productVariant.findMany();
  let added = 0;

  for (const v of variants) {
    const lower = v.name.toLowerCase().trim();
    const hex = colorHexMap[lower];
    const attrs = (typeof v.attributes === 'object' && v.attributes !== null) ? { ...(v.attributes as Record<string, unknown>) } : {};

    if (hex && !(attrs as any).colorHex) {
      attrs.colorHex = hex;
      attrs.isColor = true;
      await prisma.productVariant.update({ where: { id: v.id }, data: { attributes: attrs } });
      added++;
    }
  }

  console.log(`Added colorHex to ${added} variants`);

  // Count
  const all = await prisma.productVariant.findMany();
  const withHex = all.filter(v => {
    const a = v.attributes as Record<string, unknown> | null;
    return a?.colorHex;
  });
  console.log(`With color: ${withHex.length} | Without: ${all.length - withHex.length}`);
  console.log('Without:', all.filter(v => !(v.attributes as any)?.colorHex).slice(0, 10).map(v => v.name).join(', '));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
