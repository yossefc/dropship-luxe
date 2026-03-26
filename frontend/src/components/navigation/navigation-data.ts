// ============================================================================
// MEGA MENU NAVIGATION DATA
// ============================================================================
// Structure de navigation avec catégories et sous-catégories
// Design: Luxe Minimaliste
// ============================================================================

export interface SubCategory {
  name: string;
  href: string;
  description?: string;
}

export interface NavCategory {
  id: string;
  name: string;
  href: string;
  featured?: boolean;
  image?: {
    src: string;
    alt: string;
  };
  subcategories?: SubCategory[];
}

// ============================================================================
// NAVIGATION CATEGORIES DATA
// ============================================================================

export const navigationCategories: NavCategory[] = [
  {
    id: 'nouveautes',
    name: 'Nouveautés',
    href: '/collections',
    featured: true,
    image: {
      src: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=500&fit=crop',
      alt: 'Nouveautés beauté',
    },
  },
  {
    id: 'soins',
    name: 'Soins Visage',
    href: '/collections/skincare',
    image: {
      src: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop',
      alt: 'Soins visage',
    },
    subcategories: [
      {
        name: 'Sérums & Essences',
        href: '/collections/skincare?sub=serums',
        description: 'Concentrés actifs haute performance',
      },
      {
        name: 'Crèmes Hydratantes',
        href: '/collections/skincare?sub=moisturizers',
        description: 'Hydratation luxueuse jour et nuit',
      },
      {
        name: 'Masques Visage',
        href: '/collections/skincare?sub=masks',
        description: 'Soins intensifs et rituels cocooning',
      },
      {
        name: 'Nettoyants',
        href: '/collections/skincare?sub=cleansers',
        description: 'Double nettoyage et pureté',
      },
      {
        name: 'Contour des Yeux',
        href: '/collections/skincare?sub=eye-care',
        description: 'Regard sublimé et défatigué',
      },
      {
        name: 'Protection Solaire',
        href: '/collections/skincare?sub=sun-protection',
        description: 'Bouclier anti-UV invisible',
      },
    ],
  },
  {
    id: 'maquillage',
    name: 'Maquillage',
    href: '/collections/makeup',
    image: {
      src: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=500&fit=crop',
      alt: 'Maquillage professionnel',
    },
    subcategories: [
      {
        name: 'Teint & Complexion',
        href: '/collections/makeup?sub=face-makeup',
        description: 'Fonds de teint, poudres et correcteurs',
      },
      {
        name: 'Yeux',
        href: '/collections/makeup?sub=eye-makeup',
        description: 'Mascaras, fards et eye-liners',
      },
      {
        name: 'Lèvres',
        href: '/collections/makeup?sub=lip-makeup',
        description: 'Rouges à lèvres et gloss',
      },
      {
        name: 'Joues',
        href: '/collections/makeup?sub=cheek-makeup',
        description: 'Blush et enlumineurs',
      },
      {
        name: 'Pinceaux & Accessoires',
        href: '/collections/makeup?sub=makeup-brushes',
        description: 'Outils de précision',
      },
    ],
  },
  {
    id: 'corps',
    name: 'Soins Corps',
    href: '/collections/body-care',
    image: {
      src: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=400&h=500&fit=crop',
      alt: 'Soins du corps',
    },
    subcategories: [
      {
        name: 'Hydratants Corps',
        href: '/collections/body-care?sub=body-moisturizers',
        description: 'Nutrition intense et peau veloutée',
      },
      {
        name: 'Gommages',
        href: '/collections/body-care?sub=body-scrubs',
        description: 'Peau lisse et éclatante',
      },
      {
        name: 'Bain & Douche',
        href: '/collections/body-care?sub=bath-shower',
        description: 'Moment de détente absolue',
      },
      {
        name: 'Soin des Mains',
        href: '/collections/body-care?sub=hand-care',
        description: 'Mains douces et soignées',
      },
    ],
  },
  {
    id: 'outils',
    name: 'Outils Beauté',
    href: '/collections/beauty-tools',
    image: {
      src: 'https://images.unsplash.com/photo-1581182800629-7d90925ad072?w=400&h=500&fit=crop',
      alt: 'Outils et accessoires beauté',
    },
    subcategories: [
      {
        name: 'Massage Visage',
        href: '/collections/beauty-tools?sub=facial-massage',
        description: 'Gua Sha, rouleaux de jade',
      },
      {
        name: 'Appareils LED',
        href: '/collections/beauty-tools?sub=led-devices',
        description: 'Thérapie lumière professionnelle',
      },
      {
        name: 'Nettoyage',
        href: '/collections/beauty-tools?sub=cleansing-devices',
        description: 'Brosses et appareils nettoyants',
      },
    ],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getCategoryById(id: string): NavCategory | undefined {
  return navigationCategories.find((cat) => cat.id === id);
}

export function getCategoriesWithSubcategories(): NavCategory[] {
  return navigationCategories.filter((cat) => cat.subcategories && cat.subcategories.length > 0);
}

export function getFeaturedCategories(): NavCategory[] {
  return navigationCategories.filter((cat) => cat.featured);
}
