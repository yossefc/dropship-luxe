'use client';

// ============================================================================
// FORGOT PASSWORD PAGE - Réinitialisation du mot de passe
// ============================================================================

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubmitted(true);
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="font-serif text-3xl text-[#1A1A1A] mb-4">
              Email envoyé !
            </h1>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Si un compte existe avec l'adresse <strong className="text-[#1A1A1A]">{email}</strong>,
              vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
            </p>

            <div className="space-y-4">
              <Link
                href={`/${locale}/account/login`}
                className="block w-full py-3.5 bg-[#1A1A1A] text-white rounded-lg font-medium hover:bg-[#B76E79] transition-colors text-center"
              >
                Retour à la connexion
              </Link>

              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="text-sm text-[#B76E79] hover:underline"
              >
                Utiliser une autre adresse email
              </button>
            </div>

            <p className="mt-8 text-sm text-neutral-500">
              Vous n'avez pas reçu l'email ? Vérifiez vos spams ou{' '}
              <Link href="/contact" className="text-[#B76E79] hover:underline">
                contactez-nous
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#B76E79]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Link href="/" className="block mb-12">
              <span className="font-serif text-5xl text-white">Hayoss</span>
            </Link>

            <div className="w-20 h-20 mx-auto mb-8 bg-white/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#D4AF37]" />
            </div>

            <h2 className="font-serif text-3xl text-white mb-4">
              Pas de panique !
            </h2>
            <p className="text-neutral-400 max-w-sm">
              Nous vous envoyons un lien sécurisé pour créer
              un nouveau mot de passe en quelques secondes.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden block text-center mb-8">
            <span className="font-serif text-3xl text-[#1A1A1A]">Hayoss</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            {/* Back to Login */}
            <Link
              href={`/${locale}/account/login`}
              className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1A1A1A] mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>

            <h1 className="font-serif text-3xl text-[#1A1A1A] mb-2">
              Mot de passe oublié ?
            </h1>
            <p className="text-neutral-500 mb-8">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F8F7F5] border border-neutral-200 rounded-lg text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79] transition-all"
                    placeholder="vous@example.com"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Envoyer le lien
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>

            {/* Help Text */}
            <p className="text-center text-sm text-neutral-500 mt-8">
              Vous vous souvenez de votre mot de passe ?{' '}
              <Link
                href={`/${locale}/account/login`}
                className="text-[#B76E79] font-medium hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
