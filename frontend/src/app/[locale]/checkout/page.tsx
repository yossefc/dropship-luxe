'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/lib/store/cart-store';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Package,
  Sparkles,
  Lock
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  apartment: string;
  city: string;
  postalCode: string;
  country: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  days: string;
}

type CheckoutStep = 'information' | 'shipping' | 'payment';

// ============================================================================
// Shipping Methods Configuration
// ============================================================================

const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'standard', name: 'Standard', description: 'Livraison standard', price: 4.95, days: '5-7 jours' },
  { id: 'express', name: 'Express', description: 'Livraison express', price: 9.95, days: '2-3 jours' },
  { id: 'overnight', name: 'Express 24h', description: 'Livraison le lendemain', price: 14.95, days: '24h' },
];

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'ES', name: 'Espagne' },
];

// ============================================================================
// Checkout Page Component
// ============================================================================

export default function CheckoutPage(): JSX.Element {
  const t = useTranslations('checkout');
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();

  // State
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('information');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    apartment: '',
    city: '',
    postalCode: '',
    country: 'FR',
  });

  const [selectedShipping, setSelectedShipping] = useState<string>('standard');
  const [saveAddress, setSaveAddress] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/');
    }
  }, [items, router]);

  // Calculate totals
  const subtotal = getTotalPrice();
  const shippingMethod = SHIPPING_METHODS.find(m => m.id === selectedShipping);
  const shippingCost = shippingMethod?.price ?? 0;
  const total = subtotal + shippingCost;

  // Form validation
  const isInformationValid =
    address.firstName.trim() !== '' &&
    address.lastName.trim() !== '' &&
    address.email.includes('@') &&
    address.street.trim() !== '' &&
    address.city.trim() !== '' &&
    address.postalCode.trim() !== '';

  // Handle step navigation
  const goToStep = (step: CheckoutStep) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle form submission
  const handleSubmitOrder = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare order data
      const orderData = {
        customer: {
          email: address.email,
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone,
        },
        shippingAddress: {
          firstName: address.firstName,
          lastName: address.lastName,
          street: address.street,
          apartment: address.apartment,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          color: item.color,
          size: item.size,
        })),
        shippingMethod: selectedShipping,
        shippingCost,
        subtotal,
        total,
        currency: 'EUR',
      };

      // Call API to create order and get payment URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Redirect to Hyp payment page
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Votre panier est vide</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-primary-800 text-neutral-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl md:text-3xl text-center">
            Hayoss
          </h1>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-neutral-200 py-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {(['information', 'shipping', 'payment'] as const).map((step, index) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => {
                    if (step === 'information' || (step === 'shipping' && isInformationValid)) {
                      goToStep(step);
                    }
                  }}
                  className={`flex items-center gap-2 transition-colors ${
                    currentStep === step
                      ? 'text-primary-800'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === step
                      ? 'bg-primary-800 text-white'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="hidden md:inline font-accent text-sm uppercase tracking-wider">
                    {t(`steps.${step}`)}
                  </span>
                </button>
                {index < 2 && (
                  <ChevronRight className="w-5 h-5 text-neutral-300 mx-2 md:mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Left Column - Form */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">

              {/* Step 1: Information */}
              {currentStep === 'information' && (
                <motion.div
                  key="information"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  {/* Contact Section */}
                  <section className="bg-white rounded-lg shadow-luxury p-6 md:p-8">
                    <h2 className="font-display text-2xl text-primary-800 mb-6 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-accent-gold" />
                      {t('contact.title')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('shipping.firstName')} *
                        </label>
                        <input
                          type="text"
                          value={address.firstName}
                          onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                          placeholder="Marie"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('shipping.lastName')} *
                        </label>
                        <input
                          type="text"
                          value={address.lastName}
                          onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                          placeholder="Dupont"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('contact.email')} *
                        </label>
                        <input
                          type="email"
                          value={address.email}
                          onChange={(e) => setAddress({ ...address, email: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                          placeholder="marie@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('contact.phone')}
                        </label>
                        <input
                          type="tel"
                          value={address.phone}
                          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Shipping Address Section */}
                  <section className="bg-white rounded-lg shadow-luxury p-6 md:p-8">
                    <h2 className="font-display text-2xl text-primary-800 mb-6 flex items-center gap-3">
                      <Truck className="w-5 h-5 text-accent-gold" />
                      {t('shipping.title')}
                    </h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('shipping.address')} *
                        </label>
                        <input
                          type="text"
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                          placeholder="123 Rue de la Paix"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('shipping.apartment')}
                        </label>
                        <input
                          type="text"
                          value={address.apartment}
                          onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                          placeholder="Apt 4B, Étage 2"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                            {t('shipping.postalCode')} *
                          </label>
                          <input
                            type="text"
                            value={address.postalCode}
                            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                            placeholder="75001"
                          />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                            {t('shipping.city')} *
                          </label>
                          <input
                            type="text"
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all"
                            placeholder="Paris"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-accent uppercase tracking-wider text-neutral-600 mb-2">
                          {t('shipping.country')} *
                        </label>
                        <select
                          value={address.country}
                          onChange={(e) => setAddress({ ...address, country: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all bg-white"
                        >
                          {COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Continue Button */}
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => goToStep('shipping')}
                    disabled={!isInformationValid}
                    className="py-4"
                  >
                    {t('actions.continue')}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Shipping Method */}
              {currentStep === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <section className="bg-white rounded-lg shadow-luxury p-6 md:p-8">
                    <h2 className="font-display text-2xl text-primary-800 mb-6 flex items-center gap-3">
                      <Truck className="w-5 h-5 text-accent-gold" />
                      {t('shippingMethod.title')}
                    </h2>

                    <div className="space-y-4">
                      {SHIPPING_METHODS.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedShipping === method.id
                              ? 'border-accent-gold bg-accent-champagne/20'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="radio"
                              name="shipping"
                              value={method.id}
                              checked={selectedShipping === method.id}
                              onChange={(e) => setSelectedShipping(e.target.value)}
                              className="w-5 h-5 text-accent-gold focus:ring-accent-gold"
                            />
                            <div>
                              <p className="font-semibold text-primary-800">{method.name}</p>
                              <p className="text-sm text-neutral-500">{method.days}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-primary-800">
                            {method.price.toFixed(2)} EUR
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>

                  {/* Navigation Buttons */}
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => goToStep('information')}
                      className="flex-1"
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" />
                      {t('actions.back')}
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => goToStep('payment')}
                      className="flex-1"
                    >
                      {t('actions.continue')}
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <section className="bg-white rounded-lg shadow-luxury p-6 md:p-8">
                    <h2 className="font-display text-2xl text-primary-800 mb-6 flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-accent-gold" />
                      {t('payment.title')}
                    </h2>

                    <div className="text-center py-8">
                      <Lock className="w-12 h-12 mx-auto mb-4 text-accent-gold" />
                      <p className="text-neutral-600 mb-2">
                        Vous allez être redirigé vers notre plateforme de paiement sécurisée
                      </p>
                      <p className="text-sm text-neutral-500">
                        {t('payment.securePayment')}
                      </p>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-neutral-200">
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <ShieldCheck className="w-5 h-5 text-success" />
                        <span>SSL Sécurisé</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Lock className="w-5 h-5 text-success" />
                        <span>Paiement crypté</span>
                      </div>
                    </div>
                  </section>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-error/10 border border-error text-error rounded-lg p-4">
                      {error}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => goToStep('shipping')}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" />
                      {t('actions.back')}
                    </Button>
                    <Button
                      variant="gold"
                      size="lg"
                      onClick={handleSubmitOrder}
                      isLoading={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? t('actions.processing') : t('actions.placeOrder')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-lg shadow-luxury p-6 md:p-8 sticky top-8">
              <h2 className="font-display text-xl text-primary-800 mb-6">
                Récapitulatif
              </h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-800 text-white text-xs rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary-800 truncate">{item.name}</p>
                      <p className="text-sm text-neutral-500">{item.brand}</p>
                      {(item.color || item.size) && (
                        <p className="text-xs text-neutral-400">
                          {[item.color, item.size].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-primary-800 whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(2)} EUR
                    </p>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-neutral-200 my-6"></div>

              {/* Totals */}
              <div className="space-y-3">
                <div className="flex justify-between text-neutral-600">
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Livraison</span>
                  <span>
                    {shippingCost > 0 ? `${shippingCost.toFixed(2)} EUR` : 'Calculé à l\'étape suivante'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-neutral-200 my-6"></div>

              {/* Total */}
              <div className="flex justify-between items-baseline">
                <span className="font-display text-xl text-primary-800">Total</span>
                <span className="font-display text-2xl text-primary-800">
                  {total.toFixed(2)} EUR
                </span>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <div className="grid grid-cols-2 gap-4 text-center text-xs text-neutral-500">
                  <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-accent-gold" />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Truck className="w-6 h-6 text-accent-gold" />
                    <span>Livraison suivie</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
