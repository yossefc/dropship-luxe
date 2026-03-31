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
  },
  {
    id: 'best-sellers',
    name: 'Best Sellers',
    href: '/collections?sort=best-sellers',
    featured: true,
  },
  {
    id: 'soins',
    name: 'Soins',
    href: '/collections/soins',
    subcategories: [
      { name: 'Hydratants', href: '/collections/soins?sub=hydratants' },
      { name: 'Sérums', href: '/collections/soins?sub=serums' },
      { name: 'Nettoyants', href: '/collections/soins?sub=nettoyants' },
      { name: 'Soins des Yeux', href: '/collections/soins?sub=soins-yeux' },
      { name: 'Solaires & Autobronzants', href: '/collections/soins?sub=solaires-autobronzants' },
      { name: 'Démaquillants', href: '/collections/soins?sub=demaquillants' },
      { name: 'Exfoliants', href: '/collections/soins?sub=exfoliants' },
      { name: 'Soins des Lèvres', href: '/collections/soins?sub=soins-levres' },
      { name: 'Masques pour le Visage', href: '/collections/soins?sub=masques-visage' },
      { name: 'Soins des Mains et du Corps', href: '/collections/soins?sub=mains-corps' },
    ],
  },
  {
    id: 'maquillage',
    name: 'Maquillage',
    href: '/collections/maquillage',
    subcategories: [
      { name: 'Fond de Teint', href: '/collections/maquillage?sub=fond-de-teint' },
      { name: 'Anti-Cernes', href: '/collections/maquillage?sub=anti-cernes' },
      { name: 'Poudre', href: '/collections/maquillage?sub=poudre' },
      { name: 'Blush & Bronzer', href: '/collections/maquillage?sub=blush-bronzer' },
      { name: 'Mascara & Eyeliner', href: '/collections/maquillage?sub=maquillage-yeux' },
      { name: 'Fards à Paupières', href: '/collections/maquillage?sub=maquillage-visage' },
      { name: 'Lèvres', href: '/collections/maquillage?sub=maquillage-levres' },
    ],
  },
  {
    id: 'parfums',
    name: 'Parfums',
    href: '/collections/parfums',
  },
  {
    id: 'coffrets',
    name: 'Coffrets',
    href: '/collections?tag=coffrets',
  },
  {
    id: 'offres',
    name: 'Offres',
    href: '/collections?tag=offres',
    featured: true,
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
