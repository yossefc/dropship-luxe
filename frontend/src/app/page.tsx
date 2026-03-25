'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { BentoContainer, BentoImageCell, BentoTextCell } from '@/components/home/bento-grid';
import { ProductCard, type ProductCardData } from '@/components/home/product-card';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart-store';

// Mock data
const featuredProducts: ProductCardData[] = [
  {
    id: '1',
    slug: 'serum-eclat-vitamine-c',
    name: 'Sérum Éclat Vitamine C',
    brand: 'La Maison',
    price: 89,
    originalPrice: 119,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
    hoverImage: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&h=800&fit=crop',
    badge: 'bestseller',
    rating: 4.8,
  },
  {
    id: '2',
    slug: 'creme-nuit-regenerante',
    name: 'Crème Nuit Régénérante',
    brand: 'La Maison',
    price: 125,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
    badge: 'new',
    rating: 4.9,
  },
  {
    id: '3',
    slug: 'huile-precieuse-rose',
    name: 'Huile Précieuse à la Rose',
    brand: 'Fleur de Luxe',
    price: 145,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=800&fit=crop',
    rating: 4.7,
  },
  {
    id: '4',
    slug: 'masque-hydratant-intense',
    name: 'Masque Hydratant Intense',
    brand: 'Aqua Pure',
    price: 68,
    originalPrice: 85,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
    badge: 'sale',
    rating: 4.6,
  },
];

export default function HomePage(): JSX.Element {
  const { openCart } = useCartStore();

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-wide">
            Dropship Luxe
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/collections" className="text-sm font-accent font-medium tracking-wide hover:text-accent-gold transition-colors">
              Collections
            </Link>
            <Link href="/skincare" className="text-sm font-accent font-medium tracking-wide hover:text-accent-gold transition-colors">
              Skincare
            </Link>
            <Link href="/makeup" className="text-sm font-accent font-medium tracking-wide hover:text-accent-gold transition-colors">
              Maquillage
            </Link>
          </div>

          <button
            onClick={openCart}
            className="relative w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <BentoContainer layout="hero" className="min-h-[70vh]">
          <BentoImageCell
            src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1600&fit=crop"
            alt="Collection Printemps"
            title="Collection Printemps"
            subtitle="Nouvelle Collection"
            href="/collections/spring"
            span="featured"
            priority
          />
          <BentoImageCell
            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=800&fit=crop"
            alt="Skincare"
            title="Skincare"
            href="/skincare"
          />
          <BentoTextCell
            title="La beauté authentique"
            description="Découvrez des formules d'exception, créées pour sublimer votre beauté naturelle."
            overline="Notre philosophie"
            cta={{ label: 'En savoir plus', href: '/about' }}
            variant="dark"
          />
        </BentoContainer>
      </section>

      {/* Featured Products */}
      <section className="py-section">
        <div className="max-w-[1440px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-overline">Sélection</span>
            <h2 className="font-display text-4xl md:text-5xl font-light mt-3">
              Nos Best-sellers
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onAddToCart={(p) => {
                  useCartStore.getState().addItem({
                    productId: p.id,
                    name: p.name,
                    brand: p.brand,
                    image: p.image,
                    price: p.price,
                  });
                }}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="secondary" size="lg" asChild>
              <Link href="/collections">
                Voir toute la collection
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Bento */}
      <section className="py-section bg-neutral-100">
        <BentoContainer layout="featured">
          <BentoImageCell
            src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=1200&fit=crop"
            alt="Soins Visage"
            title="Soins Visage"
            subtitle="Éclat & Jeunesse"
            href="/skincare/face"
            span="featured"
          />
          <BentoImageCell
            src="https://images.unsplash.com/photo-1571875257727-256c39da42af?w=600&h=400&fit=crop"
            alt="Maquillage"
            title="Maquillage"
            href="/makeup"
          />
          <BentoTextCell
            title="Livraison offerte"
            description="Dès 50€ d'achat, profitez de la livraison offerte en France métropolitaine."
            variant="gold"
            align="center"
          />
          <BentoImageCell
            src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=400&fit=crop"
            alt="Parfums"
            title="Parfums"
            href="/fragrances"
          />
        </BentoContainer>
      </section>

      {/* Newsletter */}
      <section className="py-section bg-secondary-navy text-neutral-100">
        <div className="max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-light mb-4">
              Rejoignez le cercle
            </h2>
            <p className="text-neutral-400 mb-8">
              Recevez en avant-première nos nouveautés et offres exclusives.
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 px-5 py-4 bg-white/10 border border-white/20 rounded-md text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-accent-gold"
              />
              <Button variant="gold" size="lg">
                S'inscrire
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-200">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="font-display text-xl">
              Dropship Luxe
            </Link>
            <p className="text-sm text-neutral-500">
              © 2024 Dropship Luxe. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
