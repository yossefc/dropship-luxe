'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronLeft, ChevronDown } from 'lucide-react';
import { ProductGallery, type ProductImage } from '@/components/product/product-gallery';
import { ProductInfo, type ProductData } from '@/components/product/product-info';
import { MobileStickyCart } from '@/components/product/mobile-sticky-cart';
import { ProductCard, type ProductCardData } from '@/components/home/product-card';
import { useCartStore } from '@/lib/store/cart-store';
import { cn } from '@/lib/utils';

// Mock product data
const mockProduct: ProductData = {
  id: 'serum-eclat-vitamine-c',
  brand: 'La Maison',
  name: 'Sérum Éclat Vitamine C',
  subtitle: 'Un concentré de luminosité pour un teint éclatant. Formulé avec 15% de Vitamine C pure et de l\'acide hyaluronique.',
  price: 89,
  originalPrice: 119,
  currency: 'EUR',
  rating: 4.8,
  reviewCount: 127,
  colors: [
    { id: 'original', name: 'Original', hex: '#F5E6D3', available: true },
    { id: 'rose', name: 'Rosé', hex: '#E8D5D5', available: true },
    { id: 'gold', name: 'Gold Edition', hex: '#D4AF37', available: false },
  ],
  sizes: [
    { id: '15ml', label: '15ml', available: true },
    { id: '30ml', label: '30ml', available: true },
    { id: '50ml', label: '50ml', available: true },
  ],
  stock: 3,
  badges: ['bestseller'],
};

const mockImages: ProductImage[] = [
  { id: '1', src: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1200&h=1600&fit=crop', alt: 'Sérum Éclat Vitamine C - Vue principale' },
  { id: '2', src: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=1200&h=1600&fit=crop', alt: 'Sérum Éclat Vitamine C - Texture' },
  { id: '3', src: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1200&h=1600&fit=crop', alt: 'Sérum Éclat Vitamine C - Packaging' },
  { id: '4', src: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=1200&h=1600&fit=crop', alt: 'Sérum Éclat Vitamine C - Ambiance' },
];

const relatedProducts: ProductCardData[] = [
  {
    id: '2',
    slug: 'creme-nuit-regenerante',
    name: 'Crème Nuit Régénérante',
    brand: 'La Maison',
    price: 125,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
  },
  {
    id: '3',
    slug: 'huile-precieuse-rose',
    name: 'Huile Précieuse à la Rose',
    brand: 'Fleur de Luxe',
    price: 145,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=800&fit=crop',
  },
  {
    id: '4',
    slug: 'masque-hydratant-intense',
    name: 'Masque Hydratant Intense',
    brand: 'Aqua Pure',
    price: 68,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
  },
];

export default function ProductPage(): JSX.Element {
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { addItem, openCart } = useCartStore();

  useEffect(() => {
    const handleScroll = (): void => {
      setShowMobileCart(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToCart = (data: { colorId: string; sizeId: string; quantity: number }): void => {
    const color = mockProduct.colors.find((c) => c.id === data.colorId);
    const size = mockProduct.sizes.find((s) => s.id === data.sizeId);

    addItem({
      productId: mockProduct.id,
      name: mockProduct.name,
      brand: mockProduct.brand,
      image: mockImages[0]?.src ?? '',
      price: mockProduct.price,
      color: color?.name,
      size: size?.label,
    });
  };

  return (
    <main className="min-h-screen pb-20 lg:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </Link>
          </div>

          <Link href="/" className="font-display text-2xl tracking-wide">
            Dropship Luxe
          </Link>

          <button
            onClick={openCart}
            className="relative w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* PDP Main */}
      <div className="pt-16 lg:grid lg:grid-cols-2">
        {/* Gallery */}
        <ProductGallery images={mockImages} productName={mockProduct.name} />

        {/* Info */}
        <ProductInfo product={mockProduct} onAddToCart={handleAddToCart} />
      </div>

      {/* Mobile Sticky Cart */}
      <MobileStickyCart
        price={mockProduct.price}
        currency={mockProduct.currency}
        canAdd={selectedColor != null && selectedSize != null && mockProduct.stock > 0}
        isLoading={false}
        onAddToCart={() => {
          if (selectedColor != null && selectedSize != null) {
            handleAddToCart({ colorId: selectedColor, sizeId: selectedSize, quantity: 1 });
          }
        }}
        isVisible={showMobileCart}
      />

      {/* Product Details Accordion */}
      <section className="max-w-4xl mx-auto px-6 py-section">
        <Accordion title="Description">
          <div className="prose prose-neutral max-w-none">
            <p>
              Notre Sérum Éclat Vitamine C est un concentré de luminosité formulé avec 15% de Vitamine C pure stabilisée
              et de l'acide hyaluronique. Il cible les taches pigmentaires, le teint terne et les premiers signes de l'âge.
            </p>
            <p>
              Sa texture légère et non grasse pénètre rapidement pour révéler un teint plus lumineux et uniforme dès
              les premières applications. Convient à tous les types de peau.
            </p>
          </div>
        </Accordion>

        <Accordion title="Ingrédients (INCI)">
          <p className="text-xs text-neutral-500 leading-loose tracking-wide">
            AQUA, <strong className="text-neutral-700">ASCORBIC ACID</strong>, PROPANEDIOL, GLYCERIN,
            <strong className="text-neutral-700">SODIUM HYALURONATE</strong>, PHENOXYETHANOL, ETHYLHEXYLGLYCERIN,
            TOCOPHEROL, CITRIC ACID, SODIUM HYDROXIDE.
          </p>
        </Accordion>

        <Accordion title="Conseils d'utilisation">
          <ul className="list-disc list-inside space-y-2 text-neutral-600">
            <li>Appliquer matin et/ou soir sur une peau propre et sèche.</li>
            <li>Déposer quelques gouttes sur le visage et le cou.</li>
            <li>Masser délicatement jusqu'à absorption complète.</li>
            <li>Suivre avec votre crème hydratante habituelle.</li>
            <li>Utiliser une protection solaire le matin.</li>
          </ul>
        </Accordion>

        <Accordion title="Livraison & Retours">
          <div className="space-y-4 text-neutral-600">
            <p>
              <strong className="text-primary-800">Livraison offerte</strong> dès 50€ d'achat en France métropolitaine.
            </p>
            <p>
              <strong className="text-primary-800">Retours gratuits</strong> sous 30 jours. Les articles doivent être
              retournés dans leur emballage d'origine, non ouverts.
            </p>
          </div>
        </Accordion>
      </section>

      {/* Related Products */}
      <section className="py-section bg-neutral-100">
        <div className="max-w-[1440px] mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-light text-center mb-12"
          >
            Vous aimerez aussi
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {relatedProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* Accordion Component */
interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, children, defaultOpen = false }: AccordionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="font-accent text-base font-medium text-primary-800">
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-neutral-500" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <div className="pb-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
