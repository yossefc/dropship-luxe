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
    href: '/collections/nouveautes',
    featured: true,
    image: {
      src: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=500&fit=crop',
      alt: 'Nouveautés beauté',
    },
  },
  {
    id: 'bestseller',
    name: 'Best Sellers',
    href: '/collections/bestseller',
    featured: true,
    image: {
      src: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=400&h=500&fit=crop',
      alt: 'Produits best-sellers',
    },
  },
  {
    id: 'soins',
    name: 'Soins',
    href: '/collections/skincare',
    image: {
      src: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop',
      alt: 'Soins visage et corps',
    },
    subcategories: [
      {
        name: 'Hydratants et sérums',
        href: '/collections/skincare/hydratants-serums',
        description: 'Sérums et crèmes hydratantes premium',
      },
      {
        name: 'Soins des yeux',
        href: '/collections/skincare/soins-yeux',
        description: 'Contours des yeux et soins ciblés',
      },
      {
        name: 'Solaires et autobronzants',
        href: '/collections/skincare/solaires-autobronzants',
        description: 'Protection solaire et teint doré',
      },
      {
        name: 'Démaquillants',
        href: '/collections/skincare/demaquillants',
        description: 'Nettoyants et démaquillants doux',
      },
      {
        name: 'Masques pour le visage',
        href: '/collections/skincare/masques-visage',
        description: 'Masques hydratants et purifiants',
      },
      {
        name: 'Soins des mains et du corps',
        href: '/collections/skincare/mains-corps',
        description: 'Crèmes et soins corporels luxueux',
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
        name: 'Visage',
        href: '/collections/makeup/visage',
        description: 'Fonds de teint, poudres et blush',
      },
      {
        name: 'Yeux',
        href: '/collections/makeup/yeux',
        description: 'Mascaras, fards et eye-liners',
      },
      {
        name: 'Lèvres',
        href: '/collections/makeup/levres',
        description: 'Rouges à lèvres et gloss',
      },
    ],
  },
  {
    id: 'parfums',
    name: 'Parfums',
    href: '/collections/parfums',
    image: {
      src: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop',
      alt: 'Parfums de luxe',
    },
  },
  {
    id: 'hommes',
    name: 'Soins pour hommes',
    href: '/collections/hommes',
    image: {
      src: 'https://images.unsplash.com/photo-1581182800629-7d90925ad072?w=400&h=500&fit=crop',
      alt: 'Soins masculins',
    },
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
