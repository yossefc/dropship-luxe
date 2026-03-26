'use client';

// ============================================================================
// REGISTRATION PAGE - Création de compte Hayoss
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// REGISTRATION PAGE COMPONENT
// ============================================================================

export default function RegisterPage() {
  const locale = useLocale();
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      // Register user
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      // Auto sign in after registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but login failed, redirect to login
        router.push(`/${locale}/account/login?registered=true`);
      } else {
        router.push(`/${locale}/account`);
        router.refresh();
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: `/${locale}/account` });
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const labels = ['Faible', 'Moyen', 'Bon', 'Excellent'];
    return { strength, label: labels[strength - 1] || '' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#B76E79] to-[#D4A5AD] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

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

            <div className="w-20 h-20 mx-auto mb-8 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            <h2 className="font-serif text-3xl text-white mb-4">
              Rejoignez-nous
            </h2>
            <p className="text-white/80 max-w-sm">
              Créez votre compte pour accéder à des offres exclusives,
              suivre vos commandes et bien plus encore.
            </p>

            {/* Benefits List */}
            <div className="mt-10 text-left space-y-4">
              {[
                'Suivi de vos commandes en temps réel',
                'Offres et promotions exclusives',
                'Historique de vos achats',
                'Gestion simplifiée de vos adresses',
              ].map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 text-white/90"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span className="text-sm">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md py-8"
        >
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden block text-center mb-8">
            <span className="font-serif text-3xl text-[#1A1A1A]">Hayoss</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <h1 className="font-serif text-3xl text-[#1A1A1A] mb-2">
              Créer un compte
            </h1>
            <p className="text-neutral-500 mb-8">
              Inscrivez-vous pour commencer
            </p>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Prénom
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-[#F8F7F5] border border-neutral-200 rounded-lg text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79] transition-all"
                      placeholder="Marie"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#F8F7F5] border border-neutral-200 rounded-lg text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79] transition-all"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-[#F8F7F5] border border-neutral-200 rounded-lg text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79] transition-all"
                    placeholder="vous@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full pl-12 pr-4 py-3 bg-[#F8F7F5] border border-neutral-200 rounded-lg text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79] transition-all"
                    placeholder="Min. 8 caractères"
                  />
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.strength
                              ? passwordStrength.strength <= 1
                                ? 'bg-red-400'
                                : passwordStrength.strength === 2
                                ? 'bg-yellow-400'
                                : passwordStrength.strength === 3
                                ? 'bg-green-400'
                                : 'bg-green-500'
                              : 'bg-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Force : {passwordStrength.label || 'Trop court'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-[#F8F7F5] border border-neutral-200 rounded-lg text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79] transition-all"
                    placeholder="Répétez le mot de passe"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="w-4 h-4 mt-1 text-[#B76E79] border-neutral-300 rounded focus:ring-[#B76E79]"
                />
                <label htmlFor="terms" className="text-sm text-neutral-600">
                  J'accepte les{' '}
                  <Link href={`/${locale}/cgv`} className="text-[#B76E79] hover:underline">
                    Conditions Générales de Vente
                  </Link>{' '}
                  et la{' '}
                  <Link href={`/${locale}/privacy`} className="text-[#B76E79] hover:underline">
                    Politique de Confidentialité
                  </Link>
                </label>
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
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Créer mon compte
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-neutral-500">ou</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-neutral-200 rounded-lg text-[#1A1A1A] font-medium hover:bg-neutral-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              S'inscrire avec Google
            </button>

            {/* Login Link */}
            <p className="text-center text-neutral-600 mt-6">
              Déjà un compte ?{' '}
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
