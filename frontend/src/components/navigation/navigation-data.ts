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
    href: '/new-arrivals',
    featured: true,
    image: {
      src: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=500&fit=crop',
      alt: 'Nouveautés beauté',
    },
  },
  {
    id: 'best-sellers',
    name: 'Best Sellers',
    href: '/collections?sort=best-sellers',
    featured: true,
    image: {
      src: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=500&fit=crop',
      alt: 'Nos best sellers',
    },
  },
  {
    id: 'soins',
    name: 'Soins',
    href: '/collections/soins',
    image: {
      src: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop',
      alt: 'Soins visage et corps',
    },
    subcategories: [
      {
        name: 'Hydratants & Sérums',
        href: '/collections/soins?sub=hydratants-serums',
        description: 'Sérums, crèmes et essences hydratantes',
      },
      {
        name: 'Soins des Yeux',
        href: '/collections/soins?sub=soins-yeux',
        description: 'Contour des yeux et regard sublimé',
      },
      {
        name: 'Solaires & Autobronzants',
        href: '/collections/soins?sub=solaires-autobronzants',
        description: 'Protection UV et teint doré',
      },
      {
        name: 'Démaquillants',
        href: '/collections/soins?sub=demaquillants',
        description: 'Nettoyage en douceur',
      },
      {
        name: 'Masques pour le Visage',
        href: '/collections/soins?sub=masques-visage',
        description: 'Soins intensifs et rituels cocooning',
      },
      {
        name: 'Soins des Mains et du Corps',
        href: '/collections/soins?sub=mains-corps',
        description: 'Hydratation et nutrition du corps',
      },
    ],
  },
  {
    id: 'maquillage',
    name: 'Maquillage',
    href: '/collections/maquillage',
    image: {
      src: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=500&fit=crop',
      alt: 'Maquillage professionnel',
    },
    subcategories: [
      {
        name: 'Visage',
        href: '/collections/maquillage?sub=visage',
        description: 'Fonds de teint, poudres et correcteurs',
      },
      {
        name: 'Yeux',
        href: '/collections/maquillage?sub=yeux',
        description: 'Mascaras, fards et eye-liners',
      },
      {
        name: 'Lèvres',
        href: '/collections/maquillage?sub=levres',
        description: 'Rouges à lèvres, gloss et crayons',
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
