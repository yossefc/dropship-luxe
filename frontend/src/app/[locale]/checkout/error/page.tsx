'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  XCircle,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  ShieldX
} from 'lucide-react';

// ============================================================================
// Error Page Content (wrapped in Suspense)
// ============================================================================

function CheckoutErrorContent(): JSX.Element {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('errMsg') ?? searchParams.get('error');
  const errorCode = searchParams.get('CCode') ?? searchParams.get('code');

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <header className="bg-primary-800 text-neutral-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-2xl md:text-3xl text-center block">
            Hayoss
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-8 bg-error/10 rounded-full flex items-center justify-center"
          >
            <XCircle className="w-14 h-14 text-error" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-3xl md:text-4xl text-primary-800 mb-4"
          >
            Paiement non effectué
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-neutral-600 mb-8"
          >
            Votre paiement n'a pas pu être traité. Votre compte n'a pas été débité.
          </motion.p>

          {/* Error Details Card */}
          {(errorMessage || errorCode) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-luxury p-6 mb-8 text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <ShieldX className="w-5 h-5 text-error" />
                <span className="font-accent text-sm uppercase tracking-wider text-neutral-500">
                  Détails de l'erreur
                </span>
              </div>

              {errorCode && (
                <p className="text-sm text-neutral-600 mb-2">
                  <span className="font-semibold">Code:</span> {errorCode}
                </p>
              )}

              {errorMessage && (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold">Message:</span> {errorMessage}
                </p>
              )}
            </motion.div>
          )}

          {/* Possible Reasons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-neutral-100 rounded-xl p-6 mb-8 text-left"
          >
            <h2 className="font-display text-lg text-primary-800 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-accent-gold" />
              Causes possibles
            </h2>

            <ul className="space-y-3 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>La transaction a été refusée par votre banque</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Les informations de carte sont incorrectes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Fonds insuffisants sur le compte</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>La session de paiement a expiré</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Le paiement a été annulé</span>
              </li>
            </ul>
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
              <Link href="/checkout">
                <RefreshCw className="w-5 h-5 mr-2" />
                Réessayer le paiement
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
            >
              <Link href="/">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour à la boutique
              </Link>
            </Button>
          </motion.div>

          {/* Support Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 p-6 bg-accent-champagne/30 rounded-xl"
          >
            <p className="text-sm text-neutral-600">
              Besoin d'aide ? Contactez notre service client à{' '}
              <a href="mailto:contact@hayoss.com" className="text-accent-gold font-semibold hover:underline">
                contact@hayoss.com
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Export with Suspense Boundary
// ============================================================================

export default function CheckoutErrorPage(): JSX.Element {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    }>
      <CheckoutErrorContent />
    </Suspense>
  );
}
