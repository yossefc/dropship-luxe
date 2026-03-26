// ============================================================================
// DROPSHIP LUXE - Design System & UI/UX Guidelines
// ============================================================================
// Palette: "Rose Gold Romance" avec touches "Obsidian Elegance"
// Typography: Serif élégante pour titres, Sans-serif épurée pour corps
// Spacing: Wide spacing pour respiration et luxe
// ============================================================================

// ============================================================================
// PALETTE DE COULEURS - "ROSE GOLD ROMANCE"
// ============================================================================

export const colors = {
  // Couleurs primaires
  primary: {
    roseGold: '#B76E79',        // Rose gold signature
    roseGoldLight: '#D4A5AD',   // Version claire
    roseGoldDark: '#8B4D57',    // Version foncée
  },

  // Couleurs secondaires
  secondary: {
    obsidian: '#1A1A1A',        // Noir profond élégant
    charcoal: '#2D2D2D',        // Gris charbon
    champagne: '#F7E7CE',       // Champagne doré
    pearl: '#F8F6F3',           // Blanc nacré
  },

  // Accents
  accent: {
    gold: '#C9A962',            // Or luxueux
    goldLight: '#E8D5A3',       // Or clair
    bronze: '#A67C52',          // Bronze chaud
    blush: '#F5E1DA',           // Rose blush
  },

  // Neutres
  neutral: {
    50: '#FAFAF9',              // Presque blanc
    100: '#F5F4F2',             // Crème
    200: '#E8E6E3',             // Gris très clair
    300: '#D4D2CF',             // Gris clair
    400: '#A8A5A0',             // Gris moyen
    500: '#787570',             // Gris
    600: '#5C5955',             // Gris foncé
    700: '#403E3B',             // Gris très foncé
    800: '#262523',             // Presque noir
    900: '#1A1918',             // Noir
  },

  // États
  state: {
    success: '#4A7C59',         // Vert sauge
    warning: '#C9A962',         // Or (réutilisé)
    error: '#A65252',           // Rouge bordeaux doux
    info: '#5B7C99',            // Bleu gris
  },

  // Dégradés
  gradients: {
    roseGoldShimmer: 'linear-gradient(135deg, #B76E79 0%, #D4A5AD 50%, #E8D5A3 100%)',
    obsidianGlow: 'linear-gradient(180deg, #1A1A1A 0%, #2D2D2D 100%)',
    pearlLuster: 'linear-gradient(180deg, #FAFAF9 0%, #F5F4F2 100%)',
    goldHighlight: 'linear-gradient(90deg, #C9A962 0%, #E8D5A3 100%)',
  },
} as const;

// ============================================================================
// TYPOGRAPHIE
// ============================================================================

export const typography = {
  // Famille de polices
  fonts: {
    display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    heading: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
    body: '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    accent: '"Montserrat", "Inter", sans-serif',
  },

  // Tailles (avec clamp pour responsive)
  sizes: {
    // Titres Display
    display1: 'clamp(3rem, 6vw, 5rem)',      // 48-80px
    display2: 'clamp(2.5rem, 5vw, 4rem)',    // 40-64px

    // Titres
    h1: 'clamp(2rem, 4vw, 3rem)',            // 32-48px
    h2: 'clamp(1.75rem, 3vw, 2.5rem)',       // 28-40px
    h3: 'clamp(1.5rem, 2.5vw, 2rem)',        // 24-32px
    h4: 'clamp(1.25rem, 2vw, 1.5rem)',       // 20-24px
    h5: 'clamp(1.125rem, 1.5vw, 1.25rem)',   // 18-20px
    h6: '1rem',                               // 16px

    // Corps
    bodyLarge: '1.125rem',                    // 18px
    body: '1rem',                             // 16px
    bodySmall: '0.875rem',                    // 14px

    // Éléments
    caption: '0.75rem',                       // 12px
    overline: '0.75rem',                      // 12px - lettres espacées
    button: '0.875rem',                       // 14px
  },

  // Poids
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Interlignage
  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Espacement lettres
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    widest: '0.2em',
  },
} as const;

// ============================================================================
// ESPACEMENT (Wide Spacing pour luxe)
// ============================================================================

export const spacing = {
  // Base unit: 4px
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px

  // Sections (Wide spacing luxueux)
  section: {
    xs: '3rem',      // 48px
    sm: '4rem',      // 64px
    md: '6rem',      // 96px
    lg: '8rem',      // 128px
    xl: '10rem',     // 160px
  },

  // Gaps pour grilles
  grid: {
    xs: '0.75rem',   // 12px
    sm: '1rem',      // 16px
    md: '1.5rem',    // 24px
    lg: '2rem',      // 32px
    xl: '3rem',      // 48px
  },
} as const;

// ============================================================================
// BENTO GRID SPECIFICATIONS
// ============================================================================

export const bentoGrid = {
  // Configurations de layout
  layouts: {
    // Page d'accueil Hero
    hero: {
      columns: 'repeat(12, 1fr)',
      rows: 'repeat(3, minmax(200px, 1fr))',
      gap: '1.5rem',
      areas: `
        "featured featured featured featured featured featured featured featured side side side side"
        "featured featured featured featured featured featured featured featured side side side side"
        "small1 small1 small1 small2 small2 small2 text text text text text text"
      `,
    },

    // Grille catégories
    categories: {
      columns: 'repeat(12, 1fr)',
      rows: 'repeat(2, minmax(250px, 1fr))',
      gap: '1.5rem',
      areas: `
        "cat1 cat1 cat1 cat2 cat2 cat2 cat3 cat3 cat3 cat4 cat4 cat4"
        "promo promo promo promo promo promo promo promo banner banner banner banner"
      `,
    },

    // Grille produits
    products: {
      columns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '2rem',
    },

    // Grille asymétrique créative
    creative: {
      columns: 'repeat(6, 1fr)',
      rows: 'repeat(4, minmax(180px, 1fr))',
      gap: '1rem',
      areas: `
        "large large large medium medium medium"
        "large large large medium medium medium"
        "small1 small1 small2 small2 tall tall"
        "text text text text tall tall"
      `,
    },
  },

  // Tailles des cellules
  cellSizes: {
    small: { minHeight: '180px', maxHeight: '250px' },
    medium: { minHeight: '280px', maxHeight: '400px' },
    large: { minHeight: '400px', maxHeight: '600px' },
    tall: { minHeight: '380px', maxHeight: '500px' },
    wide: { minHeight: '200px', maxHeight: '300px' },
  },

  // Styles des cellules
  cellStyles: {
    image: {
      borderRadius: '0.5rem',
      overflow: 'hidden',
      position: 'relative',
    },
    text: {
      borderRadius: '0.5rem',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    video: {
      borderRadius: '0.5rem',
      overflow: 'hidden',
    },
  },
} as const;

// ============================================================================
// COMPOSANTS - FICHE PRODUIT (PDP)
// ============================================================================

export const productPage = {
  // Structure layout
  layout: {
    desktop: {
      imageSection: '55%',
      infoSection: '45%',
      gap: '4rem',
      maxWidth: '1440px',
      padding: '2rem',
    },
    mobile: {
      imageSection: '100%',
      infoSection: '100%',
      gap: '2rem',
      padding: '1rem',
    },
  },

  // Galerie images
  imageGallery: {
    mainImage: {
      aspectRatio: '4/5',
      borderRadius: '0.5rem',
      background: colors.neutral[100],
    },
    thumbnails: {
      size: '80px',
      gap: '0.75rem',
      borderRadius: '0.25rem',
      activeRing: `2px solid ${colors.primary.roseGold}`,
    },
    zoom: {
      scale: 2,
      transition: 'transform 0.3s ease',
    },
  },

  // Sélecteurs de variantes
  variants: {
    // Pastilles de couleur (Swatches)
    colorSwatches: {
      size: '32px',
      borderRadius: '50%',
      border: '2px solid transparent',
      activeBorder: `2px solid ${colors.primary.roseGold}`,
      hoverScale: 1.1,
      gap: '0.75rem',
    },
    // Sélecteur de taille
    sizeSelector: {
      minWidth: '48px',
      height: '40px',
      borderRadius: '0.25rem',
      border: `1px solid ${colors.neutral[300]}`,
      activeBorder: `2px solid ${colors.secondary.obsidian}`,
      activeBackground: colors.secondary.obsidian,
      activeColor: colors.secondary.pearl,
    },
  },

  // Accordéon informations
  accordion: {
    trigger: {
      padding: '1.25rem 0',
      borderBottom: `1px solid ${colors.neutral[200]}`,
      fontFamily: typography.fonts.accent,
      fontSize: typography.sizes.bodySmall,
      fontWeight: typography.weights.semibold,
      letterSpacing: typography.letterSpacing.wider,
      textTransform: 'uppercase',
    },
    content: {
      padding: '1rem 0 1.5rem',
      fontFamily: typography.fonts.body,
      fontSize: typography.sizes.body,
      lineHeight: typography.lineHeights.relaxed,
      color: colors.neutral[600],
    },
    sections: [
      { id: 'description', label: 'Description', defaultOpen: true },
      { id: 'ingredients', label: 'Composition INCI', defaultOpen: false },
      { id: 'usage', label: 'Conseils d\'utilisation', defaultOpen: false },
      { id: 'shipping', label: 'Livraison & Retours', defaultOpen: false },
    ],
  },

  // Bouton d'achat
  addToCart: {
    height: '56px',
    borderRadius: '0.25rem',
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    background: colors.secondary.obsidian,
    hoverBackground: colors.neutral[800],
    color: colors.secondary.pearl,
  },

  // Prix
  pricing: {
    current: {
      fontFamily: typography.fonts.display,
      fontSize: 'clamp(1.5rem, 3vw, 2rem)',
      fontWeight: typography.weights.regular,
      color: colors.secondary.obsidian,
    },
    original: {
      fontFamily: typography.fonts.body,
      fontSize: typography.sizes.body,
      color: colors.neutral[400],
      textDecoration: 'line-through',
    },
    discount: {
      fontFamily: typography.fonts.accent,
      fontSize: typography.sizes.caption,
      fontWeight: typography.weights.semibold,
      color: colors.state.error,
      background: `${colors.state.error}15`,
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
    },
  },
} as const;

// ============================================================================
// ANIMATIONS & TRANSITIONS
// ============================================================================

export const animations = {
  // Durées
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },

  // Easings
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Hover effects
  hover: {
    lift: 'translateY(-4px)',
    scale: 'scale(1.02)',
    glow: `0 10px 30px -10px ${colors.primary.roseGold}40`,
  },

  // Page transitions
  page: {
    fadeIn: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5 },
    },
    stagger: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { staggerChildren: 0.1 },
    },
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

  // Shadows luxueux
  luxe: {
    soft: '0 8px 32px -8px rgba(183, 110, 121, 0.15)',
    card: '0 4px 24px -4px rgba(0, 0, 0, 0.08)',
    elevated: '0 16px 48px -12px rgba(0, 0, 0, 0.12)',
    gold: `0 8px 24px -8px ${colors.accent.gold}40`,
  },
} as const;

// Export du design system complet
export const designSystem = {
  colors,
  typography,
  spacing,
  bentoGrid,
  productPage,
  animations,
  breakpoints,
  shadows,
} as const;
