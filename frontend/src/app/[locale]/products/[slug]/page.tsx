import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale, localeSeoConfig } from '@/i18n/config';
import { ProductPageClient } from './product-page-client';

// ============================================================================
// Types
// ============================================================================

interface ProductPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

interface ProductTranslation {
  name: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  benefits: string[];
  ingredients?: string;
  howToUse?: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface ProductData {
  id: string;
  sku: string;
  images: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  rating: number;
  reviewCount: number;
  brand: string;
  category: string;
  shades?: Array<{
    id: string;
    name: string;
    color: string;
    available: boolean;
  }>;
  sizes?: Array<{
    id: string;
    label: string;
    price?: number;
    available: boolean;
  }>;
  translation: ProductTranslation;
}

// ============================================================================
// Data Fetching (Mock - Replace with actual API call)
// ============================================================================

async function getProductBySlug(locale: string, slug: string): Promise<ProductData | null> {
  // TODO: Replace with actual API call to fetch product with translation
  // Example: const res = await fetch(`${API_URL}/products/${slug}?locale=${locale}`);

  // Mock data for demonstration
  const mockProducts: Record<string, ProductData> = {
    'serum-eclat-vitamine-c': {
      id: '1',
      sku: 'SKN-VIT-001',
      images: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=1000&fit=crop',
        'https://images.unsplash.com/photo-1617897903246-719242758050?w=800&h=1000&fit=crop',
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=1000&fit=crop',
        'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=1000&fit=crop',
      ],
      price: 89,
      originalPrice: 119,
      currency: 'EUR',
      stock: 12,
      rating: 4.8,
      reviewCount: 127,
      brand: 'La Maison',
      category: 'Skincare',
      shades: [
        { id: 'natural', name: 'Naturel', color: '#F5DEB3', available: true },
        { id: 'golden', name: 'Doré', color: '#DAA520', available: true },
        { id: 'bronze', name: 'Bronze', color: '#CD853F', available: true },
        { id: 'deep', name: 'Intense', color: '#8B4513', available: false },
      ],
      sizes: [
        { id: '30ml', label: '30ml', available: true },
        { id: '50ml', label: '50ml', price: 129, available: true },
        { id: '100ml', label: '100ml', price: 199, available: false },
      ],
      translation: getTranslationByLocale(locale as Locale, 'serum'),
    },
  };

  // Try to find by slug
  return mockProducts[slug] ?? null;
}

function getTranslationByLocale(locale: Locale, productType: string): ProductTranslation {
  const translations: Record<Locale, ProductTranslation> = {
    fr: {
      name: 'Sérum Éclat Vitamine C',
      slug: 'serum-eclat-vitamine-c',
      description: 'Un concentré de lumière pure. Notre Sérum Éclat à la Vitamine C stabilisée illumine instantanément le teint tout en agissant en profondeur pour révéler une peau transformée jour après jour.',
      descriptionHtml: `<p>Un concentré de lumière pure. Notre <strong>Sérum Éclat à la Vitamine C stabilisée</strong> illumine instantanément le teint tout en agissant en profondeur pour révéler une peau transformée jour après jour.</p>
<p>Formulé avec 15% de Vitamine C pure encapsulée et enrichi en Acide Hyaluronique, ce sérum d'exception offre une triple action :</p>
<ul>
<li>Éclat immédiat et teint unifié</li>
<li>Protection antioxydante avancée</li>
<li>Stimulation du collagène naturel</li>
</ul>
<p>Sa texture légère et soyeuse pénètre instantanément, laissant la peau veloutée et prête à recevoir vos soins.</p>`,
      benefits: [
        'Illumine le teint dès la première application',
        'Réduit visiblement les taches pigmentaires',
        'Booste la production de collagène',
        'Protection antioxydante 24h',
      ],
      ingredients: 'Aqua, Ascorbic Acid (15%), Sodium Hyaluronate, Glycerin, Propanediol, Niacinamide, Ferulic Acid, Tocopherol, Rosa Damascena Flower Water, Panthenol, Allantoin, Xanthan Gum, Citric Acid, Sodium Benzoate, Potassium Sorbate.',
      howToUse: `Matin et/ou soir, sur peau propre et sèche.

1. Prélever 3-4 gouttes dans le creux de la main
2. Réchauffer délicatement entre les paumes
3. Appliquer en pressant légèrement sur le visage et le cou
4. Éviter le contour des yeux
5. Poursuivre avec votre crème hydratante

Pour des résultats optimaux, utiliser pendant 8 semaines minimum.`,
      metaTitle: 'Sérum Éclat Vitamine C 15% | Soin Anti-Taches Luxe',
      metaDescription: 'Découvrez notre Sérum Éclat Vitamine C. 15% de Vitamine C pure pour un teint lumineux et unifié. Formule luxe, résultats visibles dès 2 semaines.',
      metaKeywords: ['sérum vitamine c', 'soin anti-taches', 'éclat teint', 'skincare luxe', 'anti-âge'],
    },
    en: {
      name: 'Radiance Vitamin C Serum',
      slug: 'radiance-vitamin-c-serum',
      description: 'A pure concentrate of light. Our Radiance Serum with stabilised Vitamin C instantly illuminates the complexion while working deep to reveal transformed skin day after day.',
      descriptionHtml: `<p>A pure concentrate of light. Our <strong>Radiance Serum with stabilised Vitamin C</strong> instantly illuminates the complexion while working deep to reveal transformed skin day after day.</p>
<p>Formulated with 15% encapsulated pure Vitamin C and enriched with Hyaluronic Acid, this exceptional serum offers triple action:</p>
<ul>
<li>Immediate radiance and even tone</li>
<li>Advanced antioxidant protection</li>
<li>Natural collagen stimulation</li>
</ul>
<p>Its light, silky texture absorbs instantly, leaving skin velvety and ready for your next skincare step.</p>`,
      benefits: [
        'Illuminates complexion from first use',
        'Visibly reduces dark spots',
        'Boosts collagen production',
        '24h antioxidant protection',
      ],
      ingredients: 'Aqua, Ascorbic Acid (15%), Sodium Hyaluronate, Glycerin, Propanediol, Niacinamide, Ferulic Acid, Tocopherol, Rosa Damascena Flower Water, Panthenol, Allantoin, Xanthan Gum, Citric Acid, Sodium Benzoate, Potassium Sorbate.',
      howToUse: `Morning and/or evening, on clean, dry skin.

1. Dispense 3-4 drops into the palm
2. Gently warm between palms
3. Press lightly onto face and neck
4. Avoid the eye contour
5. Follow with your moisturiser

For optimal results, use for a minimum of 8 weeks.`,
      metaTitle: 'Radiance Vitamin C Serum 15% | Luxury Dark Spot Treatment',
      metaDescription: 'Discover our Radiance Vitamin C Serum. 15% pure Vitamin C for a luminous, even complexion. Luxury formula, visible results in 2 weeks.',
      metaKeywords: ['vitamin c serum', 'dark spot treatment', 'radiant skin', 'luxury skincare', 'anti-aging'],
    },
    es: {
      name: 'Sérum Luminosidad Vitamina C',
      slug: 'serum-luminosidad-vitamina-c',
      description: 'Un concentrado de luz pura. Nuestro Sérum Luminosidad con Vitamina C estabilizada ilumina instantáneamente el rostro mientras actúa en profundidad para revelar una piel transformada día tras día.',
      descriptionHtml: `<p>Un concentrado de luz pura. Nuestro <strong>Sérum Luminosidad con Vitamina C estabilizada</strong> ilumina instantáneamente el rostro mientras actúa en profundidad para revelar una piel transformada día tras día.</p>`,
      benefits: [
        'Ilumina el rostro desde la primera aplicación',
        'Reduce visiblemente las manchas',
        'Estimula la producción de colágeno',
        'Protección antioxidante 24h',
      ],
      ingredients: 'Aqua, Ascorbic Acid (15%), Sodium Hyaluronate, Glycerin, Propanediol, Niacinamide, Ferulic Acid, Tocopherol, Rosa Damascena Flower Water, Panthenol, Allantoin.',
      howToUse: 'Mañana y/o noche, sobre piel limpia y seca. Aplicar 3-4 gotas presionando suavemente.',
      metaTitle: 'Sérum Luminosidad Vitamina C 15% | Tratamiento Anti-Manchas Lujo',
      metaDescription: 'Descubre nuestro Sérum Luminosidad Vitamina C. 15% de Vitamina C pura para un rostro luminoso y uniforme.',
      metaKeywords: ['sérum vitamina c', 'tratamiento anti-manchas', 'luminosidad', 'skincare lujo'],
    },
    it: {
      name: 'Siero Luminosità Vitamina C',
      slug: 'siero-luminosita-vitamina-c',
      description: 'Un concentrato di luce pura. Il nostro Siero Luminosità con Vitamina C stabilizzata illumina istantaneamente il viso mentre agisce in profondità per rivelare una pelle trasformata giorno dopo giorno.',
      descriptionHtml: `<p>Un concentrato di luce pura. Il nostro <strong>Siero Luminosità con Vitamina C stabilizzata</strong> illumina istantaneamente il viso.</p>`,
      benefits: [
        'Illumina il viso dalla prima applicazione',
        'Riduce visibilmente le macchie',
        'Stimola la produzione di collagene',
        'Protezione antiossidante 24h',
      ],
      ingredients: 'Aqua, Ascorbic Acid (15%), Sodium Hyaluronate, Glycerin, Propanediol, Niacinamide.',
      howToUse: 'Mattina e/o sera, su pelle pulita e asciutta. Applicare 3-4 gocce premendo delicatamente.',
      metaTitle: 'Siero Luminosità Vitamina C 15% | Trattamento Anti-Macchie Lusso',
      metaDescription: 'Scopri il nostro Siero Luminosità Vitamina C. 15% di Vitamina C pura per un viso luminoso e uniforme.',
      metaKeywords: ['siero vitamina c', 'trattamento anti-macchie', 'luminosità', 'skincare lusso'],
    },
    de: {
      name: 'Strahlkraft Vitamin C Serum',
      slug: 'strahlkraft-vitamin-c-serum',
      description: 'Ein reines Lichtkonzentrat. Unser Strahlkraft-Serum mit stabilisiertem Vitamin C erhellt sofort den Teint und wirkt tief, um Tag für Tag eine transformierte Haut zu enthüllen.',
      descriptionHtml: `<p>Ein reines Lichtkonzentrat. Unser <strong>Strahlkraft-Serum mit stabilisiertem Vitamin C</strong> erhellt sofort den Teint.</p>`,
      benefits: [
        'Erhellt den Teint ab der ersten Anwendung',
        'Reduziert sichtbar Pigmentflecken',
        'Fördert die Kollagenproduktion',
        '24h Antioxidantien-Schutz',
      ],
      ingredients: 'Aqua, Ascorbic Acid (15%), Sodium Hyaluronate, Glycerin, Propanediol, Niacinamide.',
      howToUse: 'Morgens und/oder abends auf saubere, trockene Haut auftragen. 3-4 Tropfen sanft eindrücken.',
      metaTitle: 'Strahlkraft Vitamin C Serum 15% | Luxus Anti-Pigmentflecken',
      metaDescription: 'Entdecken Sie unser Strahlkraft Vitamin C Serum. 15% reines Vitamin C für einen strahlenden, ebenmäßigen Teint.',
      metaKeywords: ['vitamin c serum', 'anti-pigmentflecken', 'strahlende haut', 'luxus hautpflege'],
    },
  };

  return translations[locale];
}

// ============================================================================
// SEO Metadata Generation
// ============================================================================

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const product = await getProductBySlug(locale, slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const seoConfig = localeSeoConfig[locale as Locale];
  const { translation } = product;

  return {
    title: translation.metaTitle,
    description: translation.metaDescription,
    keywords: translation.metaKeywords,
    openGraph: {
      title: translation.metaTitle,
      description: translation.metaDescription,
      type: 'website',
      locale: seoConfig.hreflang,
      images: product.images.slice(0, 4).map((img, i) => ({
        url: img,
        width: 800,
        height: 1000,
        alt: `${translation.name} - ${i + 1}`,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title: translation.metaTitle,
      description: translation.metaDescription,
      images: [product.images[0]],
    },
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [
          localeSeoConfig[l].hreflang,
          `/${l}/products/${getTranslationByLocale(l, 'serum').slug}`,
        ])
      ),
    },
    other: {
      'product:price:amount': product.price.toString(),
      'product:price:currency': seoConfig.currency,
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
    },
  };
}

// ============================================================================
// Static Params Generation
// ============================================================================

export function generateStaticParams() {
  // Generate all locale + slug combinations for static generation
  const slugs = ['serum-eclat-vitamine-c', 'radiance-vitamin-c-serum', 'serum-luminosidad-vitamina-c', 'siero-luminosita-vitamina-c', 'strahlkraft-vitamin-c-serum'];

  return locales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug,
    }))
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Fetch product data
  const product = await getProductBySlug(locale, slug);

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={product} />;
}
