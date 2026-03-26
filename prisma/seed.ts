import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with sample products...');

  // Create a category first
  const skincareCategory = await prisma.category.upsert({
    where: { slug: 'skincare' },
    update: {},
    create: {
      name: 'Skincare',
      slug: 'skincare',
      sortOrder: 1,
      isActive: true,
    },
  });

  const makeupCategory = await prisma.category.upsert({
    where: { slug: 'makeup' },
    update: {},
    create: {
      name: 'Makeup',
      slug: 'makeup',
      sortOrder: 2,
      isActive: true,
    },
  });

  const bodyCareCategory = await prisma.category.upsert({
    where: { slug: 'body-care' },
    update: {},
    create: {
      name: 'Body Care',
      slug: 'body-care',
      sortOrder: 3,
      isActive: true,
    },
  });

  const beautyToolsCategory = await prisma.category.upsert({
    where: { slug: 'beauty-tools' },
    update: {},
    create: {
      name: 'Beauty Tools',
      slug: 'beauty-tools',
      sortOrder: 4,
      isActive: true,
    },
  });

  console.log('Categories created:', {
    skincare: skincareCategory.id,
    makeup: makeupCategory.id,
    bodyCare: bodyCareCategory.id,
    beautyTools: beautyToolsCategory.id,
  });

  // Sample products data
  const productsData = [
    {
      aliexpressId: 'ALI001',
      name: 'Vitamin C Serum',
      originalName: 'Vitamin C Brightening Serum 30ml',
      basePrice: 15.99,
      costPrice: 12.99,
      sellingPrice: 89.00,
      currency: 'EUR',
      stock: 100,
      rating: 4.8,
      orderVolume: 5420,
      supplierId: 'SUP001',
      supplierName: 'BeautyLab Pro',
      shippingTimeMin: 7,
      shippingTimeMax: 14,
      importScore: 95,
      isFeatured: true,
      categoryId: skincareCategory.id,
      images: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
        'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&h=800&fit=crop',
      ],
      translations: {
        fr: {
          name: 'Sérum Éclat Vitamine C',
          slug: 'serum-eclat-vitamine-c',
          description: 'Un sérum puissant enrichi en vitamine C pure pour un teint lumineux et unifié.',
          descriptionHtml: '<p>Un sérum puissant enrichi en vitamine C pure pour un teint lumineux et unifié.</p><p>Formulé avec 15% de vitamine C stabilisée, ce sérum pénètre en profondeur pour stimuler la production de collagène et atténuer les taches pigmentaires.</p>',
          benefits: ['Illumine le teint', 'Réduit les taches', 'Anti-âge puissant', 'Hydratation intense'],
          ingredients: 'Aqua, Ascorbic Acid, Glycerin, Hyaluronic Acid, Niacinamide',
          howToUse: 'Appliquez quelques gouttes sur le visage et le cou après le nettoyage, matin et soir.',
          metaTitle: 'Sérum Vitamine C - Éclat & Anti-Âge | Hayoss',
          metaDescription: 'Découvrez notre sérum vitamine C premium pour un teint lumineux et rajeuni. Formule concentrée à 15%.',
          metaKeywords: ['sérum vitamine c', 'anti-âge', 'éclat', 'soin visage'],
        },
        en: {
          name: 'Radiance Vitamin C Serum',
          slug: 'radiance-vitamin-c-serum',
          description: 'A powerful serum enriched with pure vitamin C for a luminous and even complexion.',
          descriptionHtml: '<p>A powerful serum enriched with pure vitamin C for a luminous and even complexion.</p>',
          benefits: ['Brightens complexion', 'Reduces dark spots', 'Anti-aging', 'Intense hydration'],
          ingredients: 'Aqua, Ascorbic Acid, Glycerin, Hyaluronic Acid, Niacinamide',
          howToUse: 'Apply a few drops to face and neck after cleansing, morning and evening.',
          metaTitle: 'Vitamin C Serum - Radiance & Anti-Aging | Hayoss',
          metaDescription: 'Discover our premium vitamin C serum for a luminous and rejuvenated complexion.',
          metaKeywords: ['vitamin c serum', 'anti-aging', 'radiance', 'skincare'],
        },
      },
    },
    {
      aliexpressId: 'ALI002',
      name: 'Night Regenerating Cream',
      originalName: 'Night Repair Cream with Retinol',
      basePrice: 22.99,
      costPrice: 18.99,
      sellingPrice: 125.00,
      currency: 'EUR',
      stock: 75,
      rating: 4.9,
      orderVolume: 3210,
      supplierId: 'SUP001',
      supplierName: 'BeautyLab Pro',
      shippingTimeMin: 7,
      shippingTimeMax: 14,
      importScore: 92,
      isFeatured: true,
      categoryId: skincareCategory.id,
      images: [
        'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
        'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=800&fit=crop',
      ],
      translations: {
        fr: {
          name: 'Crème Nuit Régénérante',
          slug: 'creme-nuit-regenerante',
          description: 'Une crème de nuit luxueuse qui régénère la peau pendant votre sommeil.',
          descriptionHtml: '<p>Une crème de nuit luxueuse qui régénère la peau pendant votre sommeil.</p>',
          benefits: ['Régénération cellulaire', 'Anti-rides', 'Hydratation nocturne', 'Peau repulpée'],
          ingredients: 'Aqua, Retinol, Squalane, Ceramide NP, Peptides',
          howToUse: 'Appliquez généreusement sur le visage et le cou avant le coucher.',
          metaTitle: 'Crème Nuit Régénérante - Soin Anti-Âge | Hayoss',
          metaDescription: 'Crème de nuit premium au rétinol pour une peau régénérée au réveil.',
          metaKeywords: ['crème nuit', 'anti-rides', 'rétinol', 'régénérante'],
        },
        en: {
          name: 'Night Regenerating Cream',
          slug: 'night-regenerating-cream',
          description: 'A luxurious night cream that regenerates skin while you sleep.',
          descriptionHtml: '<p>A luxurious night cream that regenerates skin while you sleep.</p>',
          benefits: ['Cell regeneration', 'Anti-wrinkle', 'Night hydration', 'Plumped skin'],
          ingredients: 'Aqua, Retinol, Squalane, Ceramide NP, Peptides',
          howToUse: 'Apply generously to face and neck before bedtime.',
          metaTitle: 'Night Regenerating Cream - Anti-Aging Care | Hayoss',
          metaDescription: 'Premium night cream with retinol for regenerated skin in the morning.',
          metaKeywords: ['night cream', 'anti-wrinkle', 'retinol', 'regenerating'],
        },
      },
    },
    {
      aliexpressId: 'ALI003',
      name: 'Rosehip Face Oil',
      originalName: 'Organic Rosehip Seed Oil',
      basePrice: 12.99,
      costPrice: 9.99,
      sellingPrice: 75.00,
      currency: 'EUR',
      stock: 120,
      rating: 4.7,
      orderVolume: 2890,
      supplierId: 'SUP002',
      supplierName: 'NatureLux',
      shippingTimeMin: 10,
      shippingTimeMax: 18,
      importScore: 88,
      isFeatured: false,
      categoryId: skincareCategory.id,
      images: [
        'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=800&fit=crop',
        'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=800&fit=crop',
      ],
      translations: {
        fr: {
          name: 'Huile Visage Rose Musquée',
          slug: 'huile-visage-rose-musquee',
          description: 'Une huile précieuse de rose musquée bio pour nourrir et réparer la peau.',
          descriptionHtml: '<p>Une huile précieuse de rose musquée bio pour nourrir et réparer la peau.</p>',
          benefits: ['Nutrition intense', 'Cicatrisant', 'Anti-vergetures', 'Éclat naturel'],
          ingredients: 'Rosa Canina Seed Oil 100% Pure',
          howToUse: 'Massez quelques gouttes sur le visage propre, matin et/ou soir.',
          metaTitle: 'Huile Rose Musquée Bio - Soin Visage | Hayoss',
          metaDescription: 'Huile de rose musquée bio 100% pure pour une peau nourrie et éclatante.',
          metaKeywords: ['huile rose musquée', 'bio', 'soin visage', 'anti-cicatrice'],
        },
        en: {
          name: 'Rosehip Face Oil',
          slug: 'rosehip-face-oil',
          description: 'A precious organic rosehip oil to nourish and repair skin.',
          descriptionHtml: '<p>A precious organic rosehip oil to nourish and repair skin.</p>',
          benefits: ['Intense nourishment', 'Healing', 'Anti-stretch marks', 'Natural glow'],
          ingredients: 'Rosa Canina Seed Oil 100% Pure',
          howToUse: 'Massage a few drops onto clean face, morning and/or evening.',
          metaTitle: 'Organic Rosehip Oil - Face Care | Hayoss',
          metaDescription: '100% pure organic rosehip oil for nourished and glowing skin.',
          metaKeywords: ['rosehip oil', 'organic', 'face care', 'anti-scar'],
        },
      },
    },
    {
      aliexpressId: 'ALI004',
      name: 'Hydrating Aloe Mask',
      originalName: 'Aloe Vera Sleeping Mask',
      basePrice: 8.99,
      costPrice: 6.99,
      sellingPrice: 45.00,
      currency: 'EUR',
      stock: 200,
      rating: 4.6,
      orderVolume: 4100,
      supplierId: 'SUP002',
      supplierName: 'NatureLux',
      shippingTimeMin: 10,
      shippingTimeMax: 18,
      importScore: 85,
      isFeatured: true,
      categoryId: skincareCategory.id,
      images: [
        'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
      ],
      translations: {
        fr: {
          name: 'Masque Hydratant Aloe Vera',
          slug: 'masque-hydratant-aloe-vera',
          description: 'Un masque de nuit à l\'aloe vera pour une hydratation intense.',
          descriptionHtml: '<p>Un masque de nuit à l\'aloe vera pour une hydratation intense.</p>',
          benefits: ['Hydratation 24h', 'Apaisement', 'Peau douce', 'Non-comédogène'],
          ingredients: 'Aloe Barbadensis Leaf Juice, Glycerin, Hyaluronic Acid',
          howToUse: 'Appliquez en couche épaisse le soir et laissez agir toute la nuit.',
          metaTitle: 'Masque Hydratant Aloe Vera - Soin Nuit | Hayoss',
          metaDescription: 'Masque de nuit à l\'aloe vera pour une peau hydratée et apaisée.',
          metaKeywords: ['masque aloe vera', 'hydratant', 'masque nuit', 'peau sèche'],
        },
        en: {
          name: 'Hydrating Aloe Vera Mask',
          slug: 'hydrating-aloe-vera-mask',
          description: 'An aloe vera overnight mask for intense hydration.',
          descriptionHtml: '<p>An aloe vera overnight mask for intense hydration.</p>',
          benefits: ['24h hydration', 'Soothing', 'Soft skin', 'Non-comedogenic'],
          ingredients: 'Aloe Barbadensis Leaf Juice, Glycerin, Hyaluronic Acid',
          howToUse: 'Apply a thick layer in the evening and leave overnight.',
          metaTitle: 'Aloe Vera Hydrating Mask - Night Care | Hayoss',
          metaDescription: 'Aloe vera overnight mask for hydrated and soothed skin.',
          metaKeywords: ['aloe vera mask', 'hydrating', 'overnight mask', 'dry skin'],
        },
      },
    },
    {
      aliexpressId: 'ALI005',
      name: 'Eye Contour Cream',
      originalName: 'Anti-Aging Eye Cream with Peptides',
      basePrice: 18.99,
      costPrice: 14.99,
      sellingPrice: 98.00,
      currency: 'EUR',
      stock: 85,
      rating: 4.9,
      orderVolume: 2450,
      supplierId: 'SUP001',
      supplierName: 'BeautyLab Pro',
      shippingTimeMin: 7,
      shippingTimeMax: 14,
      importScore: 94,
      isFeatured: true,
      categoryId: skincareCategory.id,
      images: [
        'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&h=800&fit=crop',
      ],
      translations: {
        fr: {
          name: 'Crème Contour des Yeux',
          slug: 'creme-contour-yeux',
          description: 'Une crème contour des yeux aux peptides pour lisser rides et ridules.',
          descriptionHtml: '<p>Une crème contour des yeux aux peptides pour lisser rides et ridules.</p>',
          benefits: ['Anti-cernes', 'Anti-poches', 'Lissant', 'Raffermissant'],
          ingredients: 'Aqua, Palmitoyl Tripeptide-1, Caffeine, Vitamin K, Retinol',
          howToUse: 'Tapotez délicatement autour des yeux matin et soir.',
          metaTitle: 'Crème Contour Yeux - Anti-Rides | Hayoss',
          metaDescription: 'Crème contour des yeux premium aux peptides pour un regard rajeuni.',
          metaKeywords: ['contour yeux', 'anti-rides', 'anti-cernes', 'peptides'],
        },
        en: {
          name: 'Eye Contour Cream',
          slug: 'eye-contour-cream',
          description: 'A peptide eye contour cream to smooth wrinkles and fine lines.',
          descriptionHtml: '<p>A peptide eye contour cream to smooth wrinkles and fine lines.</p>',
          benefits: ['Dark circle reducer', 'Depuffing', 'Smoothing', 'Firming'],
          ingredients: 'Aqua, Palmitoyl Tripeptide-1, Caffeine, Vitamin K, Retinol',
          howToUse: 'Gently pat around the eyes morning and evening.',
          metaTitle: 'Eye Contour Cream - Anti-Wrinkle | Hayoss',
          metaDescription: 'Premium peptide eye contour cream for a rejuvenated look.',
          metaKeywords: ['eye contour', 'anti-wrinkle', 'dark circles', 'peptides'],
        },
      },
    },
    {
      aliexpressId: 'ALI006',
      name: 'Nourishing Lip Balm',
      originalName: 'Honey & Shea Butter Lip Balm',
      basePrice: 4.99,
      costPrice: 2.99,
      sellingPrice: 28.00,
      currency: 'EUR',
      stock: 300,
      rating: 4.8,
      orderVolume: 8900,
      supplierId: 'SUP002',
      supplierName: 'NatureLux',
      shippingTimeMin: 10,
      shippingTimeMax: 18,
      importScore: 91,
      isFeatured: false,
      categoryId: makeupCategory.id,
      images: [
        'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop',
      ],
      translations: {
        fr: {
          name: 'Baume Lèvres Nourrissant',
          slug: 'baume-levres-nourrissant',
          description: 'Un baume lèvres au miel et karité pour des lèvres douces et protégées.',
          descriptionHtml: '<p>Un baume lèvres au miel et karité pour des lèvres douces et protégées.</p>',
          benefits: ['Hydratation longue durée', 'Réparation', 'Protection', 'Douceur'],
          ingredients: 'Butyrospermum Parkii Butter, Mel, Cera Alba, Vitamin E',
          howToUse: 'Appliquez sur les lèvres aussi souvent que nécessaire.',
          metaTitle: 'Baume Lèvres Miel & Karité | Hayoss',
          metaDescription: 'Baume lèvres nourrissant au miel et karité pour des lèvres douces.',
          metaKeywords: ['baume lèvres', 'miel', 'karité', 'lèvres sèches'],
        },
        en: {
          name: 'Nourishing Lip Balm',
          slug: 'nourishing-lip-balm',
          description: 'A honey and shea butter lip balm for soft and protected lips.',
          descriptionHtml: '<p>A honey and shea butter lip balm for soft and protected lips.</p>',
          benefits: ['Long-lasting hydration', 'Repair', 'Protection', 'Softness'],
          ingredients: 'Butyrospermum Parkii Butter, Mel, Cera Alba, Vitamin E',
          howToUse: 'Apply to lips as often as needed.',
          metaTitle: 'Honey & Shea Butter Lip Balm | Hayoss',
          metaDescription: 'Nourishing lip balm with honey and shea butter for soft lips.',
          metaKeywords: ['lip balm', 'honey', 'shea butter', 'dry lips'],
        },
      },
    },
  ];

  // Create products with translations
  for (const productData of productsData) {
    const { translations, ...product } = productData;

    const createdProduct = await prisma.product.upsert({
      where: { aliexpressId: product.aliexpressId },
      update: {
        ...product,
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        rating: product.rating,
      },
      create: {
        ...product,
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        rating: product.rating,
      },
    });

    console.log(`Created product: ${createdProduct.name}`);

    // Create translations
    for (const [locale, trans] of Object.entries(translations)) {
      await prisma.productTranslation.upsert({
        where: {
          productId_locale: {
            productId: createdProduct.id,
            locale,
          },
        },
        update: {
          name: trans.name,
          slug: trans.slug,
          description: trans.description,
          descriptionHtml: trans.descriptionHtml,
          benefits: trans.benefits,
          ingredients: trans.ingredients,
          howToUse: trans.howToUse,
          metaTitle: trans.metaTitle,
          metaDescription: trans.metaDescription,
          metaKeywords: trans.metaKeywords,
        },
        create: {
          productId: createdProduct.id,
          locale,
          name: trans.name,
          slug: trans.slug,
          description: trans.description,
          descriptionHtml: trans.descriptionHtml,
          benefits: trans.benefits,
          ingredients: trans.ingredients,
          howToUse: trans.howToUse,
          metaTitle: trans.metaTitle,
          metaDescription: trans.metaDescription,
          metaKeywords: trans.metaKeywords,
        },
      });
      console.log(`  - Translation ${locale}: ${trans.name}`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
