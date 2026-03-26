// ============================================================================
// DROPSHIP LUXE - Architecture du Catalogue
// ============================================================================
// Sourcing exclusif AliExpress - Produits best-sellers premium
// Conformité cosmétique : Aucune promesse médicale
// ============================================================================

export interface ProductSuggestion {
  nameEN: string;
  nameFR: string;
  aliexpressKeywords: string[];
  priceRange: { min: number; max: number };
  margin: 'high' | 'medium' | 'excellent';
  luxeAppeal: number; // 1-10
}

export interface SubCategory {
  id: string;
  slug: string;
  nameEN: string;
  nameFR: string;
  description: string;
  icon?: string;
  productSuggestions: ProductSuggestion[];
}

export interface Category {
  id: string;
  slug: string;
  nameEN: string;
  nameFR: string;
  description: string;
  heroImage: string;
  accentColor: string;
  subCategories: SubCategory[];
}

// ============================================================================
// CATÉGORIE 1: SOINS DU VISAGE (SKINCARE)
// ============================================================================

export const skincareCategory: Category = {
  id: 'skincare',
  slug: 'soins-visage',
  nameEN: 'Skincare',
  nameFR: 'Soins du Visage',
  description: 'Rituels de beauté pour une peau radieuse',
  heroImage: '/images/categories/skincare-hero.jpg',
  accentColor: '#E8D5C4', // Warm nude
  subCategories: [
    {
      id: 'serums',
      slug: 'serums',
      nameEN: 'Serums & Essences',
      nameFR: 'Sérums & Essences',
      description: 'Concentrés actifs haute performance',
      productSuggestions: [
        {
          nameEN: 'Hyaluronic Acid Serum',
          nameFR: 'Sérum Acide Hyaluronique',
          aliexpressKeywords: ['hyaluronic acid serum', 'moisturizing serum face'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Vitamin C Brightening Serum',
          nameFR: 'Sérum Éclat Vitamine C',
          aliexpressKeywords: ['vitamin c serum', 'brightening serum face'],
          priceRange: { min: 3, max: 10 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Niacinamide Pore Refining Serum',
          nameFR: 'Sérum Niacinamide Pores Affinés',
          aliexpressKeywords: ['niacinamide serum', 'pore minimizer serum'],
          priceRange: { min: 2, max: 7 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Retinol Night Renewal Serum',
          nameFR: 'Sérum Nuit Rétinol Régénérant',
          aliexpressKeywords: ['retinol serum', 'anti aging serum'],
          priceRange: { min: 3, max: 12 },
          margin: 'high',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Snail Mucin Repair Essence',
          nameFR: 'Essence Réparatrice Mucine d\'Escargot',
          aliexpressKeywords: ['snail mucin essence', 'snail serum korean'],
          priceRange: { min: 4, max: 15 },
          margin: 'high',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'moisturizers',
      slug: 'cremes-hydratantes',
      nameEN: 'Moisturizers',
      nameFR: 'Crèmes Hydratantes',
      description: 'Hydratation luxueuse jour et nuit',
      productSuggestions: [
        {
          nameEN: 'Ceramide Barrier Repair Cream',
          nameFR: 'Crème Barrière Céramides',
          aliexpressKeywords: ['ceramide cream', 'barrier repair cream'],
          priceRange: { min: 5, max: 15 },
          margin: 'high',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Collagen Firming Day Cream',
          nameFR: 'Crème Jour Collagène Fermeté',
          aliexpressKeywords: ['collagen cream face', 'firming cream'],
          priceRange: { min: 4, max: 12 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Rice Water Glow Cream',
          nameFR: 'Crème Éclat Eau de Riz',
          aliexpressKeywords: ['rice cream korean', 'brightening cream'],
          priceRange: { min: 3, max: 10 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
      ],
    },
    {
      id: 'masks',
      slug: 'masques',
      nameEN: 'Face Masks',
      nameFR: 'Masques Visage',
      description: 'Soins intensifs et rituels cocooning',
      productSuggestions: [
        {
          nameEN: 'Hydrogel Eye Patches Gold',
          nameFR: 'Patchs Yeux Hydrogel Or 24K',
          aliexpressKeywords: ['gold eye patches', 'hydrogel eye mask', '24k gold eye patch'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Collagen Sheet Masks (10 pack)',
          nameFR: 'Masques Tissu Collagène (lot de 10)',
          aliexpressKeywords: ['sheet mask korean', 'collagen mask face'],
          priceRange: { min: 3, max: 10 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Kaolin Clay Purifying Mask',
          nameFR: 'Masque Purifiant Argile Kaolin',
          aliexpressKeywords: ['clay mask face', 'purifying mask'],
          priceRange: { min: 3, max: 8 },
          margin: 'high',
          luxeAppeal: 7,
        },
        {
          nameEN: 'Overnight Sleeping Mask',
          nameFR: 'Masque de Nuit Réparateur',
          aliexpressKeywords: ['sleeping mask korean', 'overnight mask'],
          priceRange: { min: 4, max: 12 },
          margin: 'high',
          luxeAppeal: 9,
        },
      ],
    },
    {
      id: 'cleansers',
      slug: 'nettoyants',
      nameEN: 'Cleansers',
      nameFR: 'Nettoyants',
      description: 'Double nettoyage et pureté',
      productSuggestions: [
        {
          nameEN: 'Oil Cleanser Makeup Remover',
          nameFR: 'Huile Démaquillante',
          aliexpressKeywords: ['oil cleanser', 'makeup remover oil'],
          priceRange: { min: 3, max: 10 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Foam Cleanser Amino Acid',
          nameFR: 'Mousse Nettoyante Amino-Acides',
          aliexpressKeywords: ['amino acid cleanser', 'foam cleanser gentle'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Micellar Cleansing Water',
          nameFR: 'Eau Micellaire Démaquillante',
          aliexpressKeywords: ['micellar water', 'cleansing water face'],
          priceRange: { min: 2, max: 6 },
          margin: 'high',
          luxeAppeal: 7,
        },
      ],
    },
    {
      id: 'toners',
      slug: 'lotions-toniques',
      nameEN: 'Toners & Mists',
      nameFR: 'Lotions & Brumes',
      description: 'Préparation et fraîcheur',
      productSuggestions: [
        {
          nameEN: 'Rose Water Hydrating Toner',
          nameFR: 'Lotion Tonique Eau de Rose',
          aliexpressKeywords: ['rose water toner', 'hydrating toner'],
          priceRange: { min: 2, max: 7 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'AHA/BHA Exfoliating Toner',
          nameFR: 'Lotion Exfoliante AHA/BHA',
          aliexpressKeywords: ['aha bha toner', 'exfoliating toner'],
          priceRange: { min: 3, max: 10 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Centella Calming Mist',
          nameFR: 'Brume Apaisante Centella',
          aliexpressKeywords: ['centella mist', 'face mist spray'],
          priceRange: { min: 2, max: 6 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'eye-care',
      slug: 'contour-yeux',
      nameEN: 'Eye Care',
      nameFR: 'Contour des Yeux',
      description: 'Regard sublimé et défatigué',
      productSuggestions: [
        {
          nameEN: 'Peptide Eye Cream',
          nameFR: 'Crème Contour Yeux Peptides',
          aliexpressKeywords: ['eye cream peptide', 'anti wrinkle eye cream'],
          priceRange: { min: 3, max: 12 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Caffeine Eye Serum Roller',
          nameFR: 'Sérum Yeux Caféine Roll-on',
          aliexpressKeywords: ['eye serum roller', 'caffeine eye serum'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'lip-care',
      slug: 'soin-levres',
      nameEN: 'Lip Care',
      nameFR: 'Soin des Lèvres',
      description: 'Lèvres douces et repulpées',
      productSuggestions: [
        {
          nameEN: 'Collagen Lip Sleeping Mask',
          nameFR: 'Masque Nuit Lèvres Collagène',
          aliexpressKeywords: ['lip sleeping mask', 'lip mask collagen'],
          priceRange: { min: 2, max: 6 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Honey Lip Balm Set',
          nameFR: 'Set Baumes à Lèvres Miel',
          aliexpressKeywords: ['lip balm set', 'honey lip balm'],
          priceRange: { min: 2, max: 5 },
          margin: 'excellent',
          luxeAppeal: 7,
        },
      ],
    },
    {
      id: 'sun-protection',
      slug: 'protection-solaire',
      nameEN: 'Sun Protection',
      nameFR: 'Protection Solaire',
      description: 'Bouclier anti-UV invisible',
      productSuggestions: [
        {
          nameEN: 'SPF50+ Lightweight Sunscreen',
          nameFR: 'Écran Solaire SPF50+ Texture Légère',
          aliexpressKeywords: ['sunscreen spf50', 'korean sunscreen'],
          priceRange: { min: 4, max: 12 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'UV Protection Stick SPF50',
          nameFR: 'Stick Solaire SPF50',
          aliexpressKeywords: ['sunscreen stick', 'sun stick spf50'],
          priceRange: { min: 3, max: 8 },
          margin: 'high',
          luxeAppeal: 8,
        },
      ],
    },
  ],
};

// ============================================================================
// CATÉGORIE 2: MAQUILLAGE (MAKEUP)
// ============================================================================

export const makeupCategory: Category = {
  id: 'makeup',
  slug: 'maquillage',
  nameEN: 'Makeup',
  nameFR: 'Maquillage',
  description: 'L\'art de sublimer votre beauté naturelle',
  heroImage: '/images/categories/makeup-hero.jpg',
  accentColor: '#C4A484', // Caramel
  subCategories: [
    {
      id: 'face-makeup',
      slug: 'teint',
      nameEN: 'Face & Complexion',
      nameFR: 'Teint & Complexion',
      description: 'Base parfaite et teint lumineux',
      productSuggestions: [
        {
          nameEN: 'Velvet Matte Foundation',
          nameFR: 'Fond de Teint Velours Mat',
          aliexpressKeywords: ['matte foundation', 'velvet foundation'],
          priceRange: { min: 3, max: 12 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Liquid Concealer Full Coverage',
          nameFR: 'Correcteur Liquide Haute Couvrance',
          aliexpressKeywords: ['liquid concealer', 'full coverage concealer'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Setting Powder Translucent',
          nameFR: 'Poudre Fixatrice Translucide',
          aliexpressKeywords: ['setting powder', 'translucent powder'],
          priceRange: { min: 2, max: 7 },
          margin: 'excellent',
          luxeAppeal: 7,
        },
        {
          nameEN: 'Cream Contour Palette',
          nameFR: 'Palette Contouring Crème',
          aliexpressKeywords: ['contour palette', 'cream contour'],
          priceRange: { min: 3, max: 10 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Liquid Highlighter Drops',
          nameFR: 'Enlumineur Liquide Gouttes',
          aliexpressKeywords: ['liquid highlighter', 'glow drops'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
      ],
    },
    {
      id: 'eye-makeup',
      slug: 'yeux',
      nameEN: 'Eyes',
      nameFR: 'Yeux',
      description: 'Regard intense et captivant',
      productSuggestions: [
        {
          nameEN: 'Eyeshadow Palette 12 Shades Nude',
          nameFR: 'Palette Fards à Paupières 12 Teintes Nude',
          aliexpressKeywords: ['eyeshadow palette nude', '12 color eyeshadow'],
          priceRange: { min: 4, max: 15 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Waterproof Eyeliner Pen',
          nameFR: 'Eyeliner Feutre Waterproof',
          aliexpressKeywords: ['waterproof eyeliner', 'eyeliner pen'],
          priceRange: { min: 1, max: 5 },
          margin: 'excellent',
          luxeAppeal: 7,
        },
        {
          nameEN: 'Volume Mascara Fiber',
          nameFR: 'Mascara Volume Fibres',
          aliexpressKeywords: ['fiber mascara', 'volume mascara'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Eyebrow Pencil Microblading',
          nameFR: 'Crayon Sourcils Microblading',
          aliexpressKeywords: ['eyebrow pencil', 'microblading pencil'],
          priceRange: { min: 1, max: 5 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Magnetic Eyelashes Kit',
          nameFR: 'Kit Faux-Cils Magnétiques',
          aliexpressKeywords: ['magnetic eyelashes', 'magnetic lashes kit'],
          priceRange: { min: 3, max: 12 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Individual Cluster Lashes',
          nameFR: 'Faux-Cils Individuels en Bouquets',
          aliexpressKeywords: ['cluster lashes', 'individual lashes'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'lip-makeup',
      slug: 'levres',
      nameEN: 'Lips',
      nameFR: 'Lèvres',
      description: 'Couleurs vibrantes et formules longue tenue',
      productSuggestions: [
        {
          nameEN: 'Velvet Matte Lipstick',
          nameFR: 'Rouge à Lèvres Velours Mat',
          aliexpressKeywords: ['matte lipstick', 'velvet lipstick'],
          priceRange: { min: 1, max: 6 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Lip Tint Water Stain',
          nameFR: 'Teinture Lèvres Effet Naturel',
          aliexpressKeywords: ['lip tint', 'lip stain water'],
          priceRange: { min: 1, max: 5 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Lip Gloss Plumping',
          nameFR: 'Gloss Repulpant',
          aliexpressKeywords: ['lip gloss', 'plumping lip gloss'],
          priceRange: { min: 1, max: 5 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Lip Liner Pencil Set',
          nameFR: 'Set Crayons Contour Lèvres',
          aliexpressKeywords: ['lip liner set', 'lip pencil'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 7,
        },
      ],
    },
    {
      id: 'cheek-makeup',
      slug: 'joues',
      nameEN: 'Cheeks',
      nameFR: 'Joues',
      description: 'Éclat naturel et bonne mine',
      productSuggestions: [
        {
          nameEN: 'Cream Blush Stick',
          nameFR: 'Blush Crème en Stick',
          aliexpressKeywords: ['cream blush stick', 'blush stick'],
          priceRange: { min: 2, max: 7 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Baked Highlighter Powder',
          nameFR: 'Enlumineur Poudre Marbrée',
          aliexpressKeywords: ['baked highlighter', 'highlighter powder'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Blush Palette 6 Shades',
          nameFR: 'Palette Blush 6 Teintes',
          aliexpressKeywords: ['blush palette', '6 color blush'],
          priceRange: { min: 3, max: 10 },
          margin: 'high',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'makeup-brushes',
      slug: 'pinceaux',
      nameEN: 'Brushes & Tools',
      nameFR: 'Pinceaux & Accessoires',
      description: 'Outils de précision pour artistes',
      productSuggestions: [
        {
          nameEN: 'Makeup Brush Set 15 Pcs Rose Gold',
          nameFR: 'Set 15 Pinceaux Maquillage Or Rose',
          aliexpressKeywords: ['makeup brush set rose gold', '15 pcs brush set'],
          priceRange: { min: 5, max: 20 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Kabuki Foundation Brush',
          nameFR: 'Pinceau Kabuki Fond de Teint',
          aliexpressKeywords: ['kabuki brush', 'foundation brush'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Beauty Blender Sponge Set',
          nameFR: 'Set Éponges Teint',
          aliexpressKeywords: ['beauty sponge', 'makeup sponge set'],
          priceRange: { min: 1, max: 5 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Eyelash Curler Rose Gold',
          nameFR: 'Recourbe-Cils Or Rose',
          aliexpressKeywords: ['eyelash curler', 'rose gold curler'],
          priceRange: { min: 2, max: 6 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
      ],
    },
  ],
};

// ============================================================================
// CATÉGORIE 3: SOINS DU CORPS (BODY CARE)
// ============================================================================

export const bodyCareCategory: Category = {
  id: 'body-care',
  slug: 'soins-corps',
  nameEN: 'Body Care',
  nameFR: 'Soins du Corps',
  description: 'Rituel complet pour une peau soyeuse',
  heroImage: '/images/categories/body-hero.jpg',
  accentColor: '#D4C4B0', // Sand
  subCategories: [
    {
      id: 'body-moisturizers',
      slug: 'hydratants-corps',
      nameEN: 'Body Moisturizers',
      nameFR: 'Hydratants Corps',
      description: 'Nutrition intense et peau veloutée',
      productSuggestions: [
        {
          nameEN: 'Shea Butter Body Cream',
          nameFR: 'Crème Corps Beurre de Karité',
          aliexpressKeywords: ['shea butter body cream', 'body moisturizer'],
          priceRange: { min: 3, max: 10 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Body Oil Nourishing',
          nameFR: 'Huile Corps Nourrissante',
          aliexpressKeywords: ['body oil', 'nourishing body oil'],
          priceRange: { min: 3, max: 12 },
          margin: 'high',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Firming Body Lotion',
          nameFR: 'Lait Corps Raffermissant',
          aliexpressKeywords: ['firming body lotion', 'body lotion'],
          priceRange: { min: 3, max: 10 },
          margin: 'high',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'body-scrubs',
      slug: 'gommages',
      nameEN: 'Body Scrubs & Exfoliants',
      nameFR: 'Gommages & Exfoliants',
      description: 'Peau lisse et éclatante',
      productSuggestions: [
        {
          nameEN: 'Coffee Body Scrub',
          nameFR: 'Gommage Corps au Café',
          aliexpressKeywords: ['coffee body scrub', 'coffee scrub'],
          priceRange: { min: 3, max: 10 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Sugar Scrub Rose',
          nameFR: 'Gommage Sucre à la Rose',
          aliexpressKeywords: ['sugar scrub', 'rose body scrub'],
          priceRange: { min: 3, max: 8 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Exfoliating Glove Silk',
          nameFR: 'Gant Exfoliant Soie',
          aliexpressKeywords: ['exfoliating glove', 'silk mitt'],
          priceRange: { min: 2, max: 6 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'bath-shower',
      slug: 'bain-douche',
      nameEN: 'Bath & Shower',
      nameFR: 'Bain & Douche',
      description: 'Moment de détente absolue',
      productSuggestions: [
        {
          nameEN: 'Bath Bombs Gift Set',
          nameFR: 'Coffret Bombes de Bain',
          aliexpressKeywords: ['bath bombs set', 'bath bomb gift'],
          priceRange: { min: 4, max: 15 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Shower Gel Aromatherapy',
          nameFR: 'Gel Douche Aromathérapie',
          aliexpressKeywords: ['shower gel', 'aromatherapy shower'],
          priceRange: { min: 2, max: 8 },
          margin: 'high',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Bath Salts Lavender',
          nameFR: 'Sels de Bain Lavande',
          aliexpressKeywords: ['bath salts', 'lavender bath salt'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
      ],
    },
    {
      id: 'hand-care',
      slug: 'soin-mains',
      nameEN: 'Hand Care',
      nameFR: 'Soin des Mains',
      description: 'Mains douces et soignées',
      productSuggestions: [
        {
          nameEN: 'Hand Cream Set Mini',
          nameFR: 'Coffret Mini Crèmes Mains',
          aliexpressKeywords: ['hand cream set', 'mini hand cream'],
          priceRange: { min: 3, max: 10 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Cuticle Oil Pen',
          nameFR: 'Stylo Huile Cuticules',
          aliexpressKeywords: ['cuticle oil pen', 'nail oil'],
          priceRange: { min: 1, max: 4 },
          margin: 'excellent',
          luxeAppeal: 7,
        },
      ],
    },
    {
      id: 'foot-care',
      slug: 'soin-pieds',
      nameEN: 'Foot Care',
      nameFR: 'Soin des Pieds',
      description: 'Pieds doux et réparés',
      productSuggestions: [
        {
          nameEN: 'Foot Peel Mask',
          nameFR: 'Masque Peeling Pieds',
          aliexpressKeywords: ['foot peel mask', 'exfoliating foot mask'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Heel Repair Cream',
          nameFR: 'Crème Réparatrice Talons',
          aliexpressKeywords: ['heel cream', 'foot cream repair'],
          priceRange: { min: 2, max: 6 },
          margin: 'high',
          luxeAppeal: 7,
        },
      ],
    },
  ],
};

// ============================================================================
// CATÉGORIE 4: OUTILS DE BEAUTÉ (BEAUTY DEVICES)
// ============================================================================

export const beautyToolsCategory: Category = {
  id: 'beauty-tools',
  slug: 'outils-beaute',
  nameEN: 'Beauty Tools & Devices',
  nameFR: 'Outils & Accessoires Beauté',
  description: 'Technologie et rituels ancestraux',
  heroImage: '/images/categories/tools-hero.jpg',
  accentColor: '#B8A99A', // Taupe
  subCategories: [
    {
      id: 'facial-massage',
      slug: 'massage-visage',
      nameEN: 'Facial Massage Tools',
      nameFR: 'Outils Massage Visage',
      description: 'Lifting naturel et relaxation',
      productSuggestions: [
        {
          nameEN: 'Rose Quartz Gua Sha',
          nameFR: 'Gua Sha Quartz Rose',
          aliexpressKeywords: ['gua sha rose quartz', 'gua sha stone'],
          priceRange: { min: 2, max: 10 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Jade Roller Face Massager',
          nameFR: 'Rouleau de Jade Massage Visage',
          aliexpressKeywords: ['jade roller', 'face roller jade'],
          priceRange: { min: 2, max: 10 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Ice Roller Facial',
          nameFR: 'Rouleau Cryo Visage',
          aliexpressKeywords: ['ice roller face', 'cooling face roller'],
          priceRange: { min: 2, max: 8 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Obsidian Gua Sha',
          nameFR: 'Gua Sha Obsidienne',
          aliexpressKeywords: ['obsidian gua sha', 'black gua sha'],
          priceRange: { min: 2, max: 10 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Amethyst Facial Roller',
          nameFR: 'Rouleau Améthyste Visage',
          aliexpressKeywords: ['amethyst roller', 'purple jade roller'],
          priceRange: { min: 3, max: 12 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
      ],
    },
    {
      id: 'led-devices',
      slug: 'appareils-led',
      nameEN: 'LED Light Therapy',
      nameFR: 'Thérapie Lumière LED',
      description: 'Technologie professionnelle à domicile',
      productSuggestions: [
        {
          nameEN: 'LED Face Mask 7 Colors',
          nameFR: 'Masque LED Visage 7 Couleurs',
          aliexpressKeywords: ['led face mask', '7 color led mask'],
          priceRange: { min: 10, max: 40 },
          margin: 'excellent',
          luxeAppeal: 10,
        },
        {
          nameEN: 'Red Light Therapy Wand',
          nameFR: 'Baguette Lumière Rouge',
          aliexpressKeywords: ['red light therapy', 'led beauty wand'],
          priceRange: { min: 5, max: 20 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
        {
          nameEN: 'LED Neck Mask Anti-Aging',
          nameFR: 'Masque LED Cou Anti-Âge',
          aliexpressKeywords: ['led neck mask', 'neck light therapy'],
          priceRange: { min: 8, max: 30 },
          margin: 'high',
          luxeAppeal: 9,
        },
      ],
    },
    {
      id: 'cleansing-devices',
      slug: 'appareils-nettoyage',
      nameEN: 'Cleansing Devices',
      nameFR: 'Appareils Nettoyants',
      description: 'Nettoyage en profondeur',
      productSuggestions: [
        {
          nameEN: 'Silicone Face Cleansing Brush',
          nameFR: 'Brosse Nettoyante Silicone Visage',
          aliexpressKeywords: ['silicone face brush', 'face cleansing brush'],
          priceRange: { min: 3, max: 15 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Blackhead Remover Vacuum',
          nameFR: 'Aspirateur Points Noirs',
          aliexpressKeywords: ['blackhead vacuum', 'pore vacuum'],
          priceRange: { min: 5, max: 20 },
          margin: 'high',
          luxeAppeal: 7,
        },
        {
          nameEN: 'Ultrasonic Skin Scrubber',
          nameFR: 'Spatule Ultrasonique Visage',
          aliexpressKeywords: ['skin scrubber', 'ultrasonic spatula'],
          priceRange: { min: 5, max: 20 },
          margin: 'high',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'microcurrent',
      slug: 'microcourant',
      nameEN: 'Microcurrent & Lifting',
      nameFR: 'Microcourant & Lifting',
      description: 'Tonification et fermeté',
      productSuggestions: [
        {
          nameEN: 'Microcurrent Face Lift Device',
          nameFR: 'Appareil Microcourant Lifting',
          aliexpressKeywords: ['microcurrent device', 'face lift device'],
          priceRange: { min: 10, max: 40 },
          margin: 'high',
          luxeAppeal: 9,
        },
        {
          nameEN: 'EMS Face Massager',
          nameFR: 'Masseur EMS Visage',
          aliexpressKeywords: ['ems face massager', 'face toning device'],
          priceRange: { min: 8, max: 30 },
          margin: 'high',
          luxeAppeal: 8,
        },
      ],
    },
    {
      id: 'hair-removal',
      slug: 'epilation',
      nameEN: 'Hair Removal',
      nameFR: 'Épilation',
      description: 'Peau lisse longue durée',
      productSuggestions: [
        {
          nameEN: 'IPL Hair Removal Device',
          nameFR: 'Appareil IPL Épilation',
          aliexpressKeywords: ['ipl hair removal', 'laser hair removal home'],
          priceRange: { min: 20, max: 80 },
          margin: 'high',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Facial Hair Remover Electric',
          nameFR: 'Épilateur Visage Électrique',
          aliexpressKeywords: ['facial hair remover', 'face epilator'],
          priceRange: { min: 3, max: 15 },
          margin: 'excellent',
          luxeAppeal: 7,
        },
      ],
    },
    {
      id: 'storage-organization',
      slug: 'rangement',
      nameEN: 'Storage & Organization',
      nameFR: 'Rangement & Organisation',
      description: 'Organisez votre vanity',
      productSuggestions: [
        {
          nameEN: 'Acrylic Makeup Organizer',
          nameFR: 'Organisateur Maquillage Acrylique',
          aliexpressKeywords: ['makeup organizer acrylic', 'cosmetic organizer'],
          priceRange: { min: 5, max: 25 },
          margin: 'high',
          luxeAppeal: 9,
        },
        {
          nameEN: 'Rotating Lipstick Holder',
          nameFR: 'Présentoir Rotatif Rouges à Lèvres',
          aliexpressKeywords: ['lipstick holder', 'rotating makeup holder'],
          priceRange: { min: 3, max: 15 },
          margin: 'excellent',
          luxeAppeal: 8,
        },
        {
          nameEN: 'Travel Makeup Bag Luxury',
          nameFR: 'Trousse de Voyage Luxe',
          aliexpressKeywords: ['makeup bag travel', 'cosmetic bag'],
          priceRange: { min: 4, max: 15 },
          margin: 'excellent',
          luxeAppeal: 9,
        },
      ],
    },
  ],
};

// ============================================================================
// EXPORT - CATALOGUE COMPLET
// ============================================================================

export const fullCatalog: Category[] = [
  skincareCategory,
  makeupCategory,
  bodyCareCategory,
  beautyToolsCategory,
];

// Helper pour obtenir toutes les sous-catégories
export function getAllSubCategories(): SubCategory[] {
  return fullCatalog.flatMap(cat => cat.subCategories);
}

// Helper pour obtenir une catégorie par slug
export function getCategoryBySlug(slug: string): Category | undefined {
  return fullCatalog.find(cat => cat.slug === slug);
}

// Helper pour obtenir une sous-catégorie par slug
export function getSubCategoryBySlug(slug: string): SubCategory | undefined {
  return getAllSubCategories().find(sub => sub.slug === slug);
}

// Statistiques du catalogue
export const catalogStats = {
  totalCategories: fullCatalog.length,
  totalSubCategories: getAllSubCategories().length,
  totalProductSuggestions: getAllSubCategories().reduce(
    (acc, sub) => acc + sub.productSuggestions.length,
    0
  ),
};
