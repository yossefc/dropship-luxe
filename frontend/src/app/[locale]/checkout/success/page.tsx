'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useCartStore } from '@/lib/store/cart-store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  CheckCircle2,
  Package,
  Mail,
  Truck,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

// ============================================================================
// Success Page Component
// ============================================================================

export default function CheckoutSuccessPage(): JSX.Element {
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const { clearCart } = useCartStore();

  const [orderDetails, setOrderDetails] = useState<{
    orderNumber: string;
    email: string;
    total: string;
    transactionId: string;
  } | null>(null);

  // Extract order details from URL params (set by Hyp callback)
  useEffect(() => {
    const orderId = searchParams.get('order') || searchParams.get('Order');
    const transactionId = searchParams.get('Id') || searchParams.get('id');
    const amount = searchParams.get('Amount');

    if (orderId) {
      setOrderDetails({
        orderNumber: orderId,
        email: '', // Will be fetched from session/localStorage if needed
        total: amount ? (parseInt(amount) / 100).toFixed(2) : '',
        transactionId: transactionId || '',
      });

      // Clear the cart after successful payment
      clearCart();
    }
  }, [searchParams, clearCart]);

  const orderNumber = orderDetails?.orderNumber || 'DL-' + Date.now().toString(36).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <header className="bg-primary-800 text-neutral-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-2xl md:text-3xl text-center block">
            Dropship Luxe
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-8 bg-success/10 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="w-14 h-14 text-success" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-3xl md:text-4xl text-primary-800 mb-4"
          >
            {t('confirmation.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-neutral-600 mb-8"
          >
            {t('confirmation.thankYou')}
          </motion.p>

          {/* Order Number Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-luxury p-8 mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-accent-gold" />
              <span className="font-accent text-sm uppercase tracking-wider text-neutral-500">
                {t('confirmation.orderNumber')}
              </span>
            </div>

            <p className="font-display text-3xl text-primary-800 mb-6">
              {orderNumber}
            </p>

            {/* Order Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-neutral-200">
              <div className="text-center">
                <Mail className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                <p className="text-sm text-neutral-500">Confirmation envoyée</p>
                <p className="font-semibold text-primary-800">Par email</p>
              </div>

              <div className="text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                <p className="text-sm text-neutral-500">Préparation</p>
                <p className="font-semibold text-primary-800">1-2 jours ouvrés</p>
              </div>

              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                <p className="text-sm text-neutral-500">Livraison estimée</p>
                <p className="font-semibold text-primary-800">5-7 jours ouvrés</p>
              </div>
            </div>
          </motion.div>

          {/* What's Next Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-accent-champagne/30 rounded-xl p-8 mb-8"
          >
            <h2 className="font-display text-xl text-primary-800 mb-4">
              Prochaines étapes
            </h2>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-primary-800">Email de confirmation</p>
                  <p className="text-sm text-neutral-600">
                    Vous recevrez un email de confirmation avec les détails de votre commande.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-primary-800">Préparation</p>
                  <p className="text-sm text-neutral-600">
                    Notre équipe prépare votre commande avec le plus grand soin.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-primary-800">Expédition & Suivi</p>
                  <p className="text-sm text-neutral-600">
                    Vous recevrez un email avec votre numéro de suivi dès l'expédition.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              asChild
              variant="primary"
              size="lg"
            >
              <Link href="/">
                Continuer mes achats
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
            >
              <Link href="/contact">
                Besoin d'aide ?
              </Link>
            </Button>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex items-center justify-center gap-2 text-sm text-neutral-500"
          >
            <ShieldCheck className="w-5 h-5 text-success" />
            <span>Transaction sécurisée - Paiement vérifié</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-primary-800 text-neutral-300 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            Des questions ? Contactez-nous à{' '}
            <a href="mailto:support@dropship-luxe.com" className="text-accent-gold hover:underline">
              support@dropship-luxe.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
