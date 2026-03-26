'use client';

// ============================================================================
// Contact - Formulaire de Contact
// ============================================================================
// Page de contact avec formulaire et informations
// ============================================================================

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function ContactPage() {
  const locale = useLocale();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    orderNumber: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const content = {
    fr: {
      title: 'Contactez-nous',
      subtitle: 'Notre équipe est à votre écoute',
      description: 'Une question sur votre commande, un produit ou notre service ? Nous sommes là pour vous aider.',
      form: {
        name: 'Nom complet',
        email: 'Adresse email',
        subject: 'Sujet',
        subjects: {
          order: 'Question sur ma commande',
          product: 'Question sur un produit',
          return: 'Retour / Remboursement',
          other: 'Autre demande',
        },
        orderNumber: 'Numéro de commande (optionnel)',
        message: 'Votre message',
        messagePlaceholder: 'Décrivez votre demande en détail...',
        submit: 'Envoyer le message',
        submitting: 'Envoi en cours...',
      },
      success: {
        title: 'Message envoyé !',
        description: 'Nous avons bien reçu votre message et vous répondrons sous 24 à 48 heures.',
        back: 'Retour à l\'accueil',
      },
      info: {
        email: 'Email',
        hours: 'Horaires',
        hoursValue: 'Lun - Ven : 9h - 18h',
        response: 'Temps de réponse',
        responseValue: '24 - 48 heures',
      },
      faq: 'Consultez d\'abord notre FAQ',
      faqDesc: 'Vous y trouverez peut-être la réponse à votre question.',
    },
    en: {
      title: 'Contact Us',
      subtitle: 'Our team is here to help',
      description: 'Have a question about your order, a product, or our service? We\'re here to help.',
      form: {
        name: 'Full name',
        email: 'Email address',
        subject: 'Subject',
        subjects: {
          order: 'Order inquiry',
          product: 'Product question',
          return: 'Return / Refund',
          other: 'Other request',
        },
        orderNumber: 'Order number (optional)',
        message: 'Your message',
        messagePlaceholder: 'Describe your request in detail...',
        submit: 'Send message',
        submitting: 'Sending...',
      },
      success: {
        title: 'Message sent!',
        description: 'We have received your message and will respond within 24 to 48 hours.',
        back: 'Back to home',
      },
      info: {
        email: 'Email',
        hours: 'Business hours',
        hoursValue: 'Mon - Fri: 9am - 6pm',
        response: 'Response time',
        responseValue: '24 - 48 hours',
      },
      faq: 'Check our FAQ first',
      faqDesc: 'You might find the answer to your question there.',
    },
  };

  const t = content[locale as keyof typeof content] || content.en;

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#FFFBF7] flex items-center justify-center py-20">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-[#2D2926] mb-4">{t.success.title}</h1>
          <p className="text-[#6B5B54] mb-8">{t.success.description}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#2D2926] text-white rounded-full font-medium hover:bg-[#B8927A] transition-colors"
          >
            {t.success.back}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFBF7]">
      {/* Header */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#F5EDE8] to-[#FFFBF7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[#B8927A] text-sm font-medium tracking-widest uppercase mb-4 block">
            {t.subtitle}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl text-[#2D2926] mb-4">
            {t.title}
          </h1>
          <p className="text-[#6B5B54] max-w-lg mx-auto">
            {t.description}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            {/* Info Cards */}
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#B8927A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5B54]">{t.info.email}</p>
                    <p className="font-medium text-[#2D2926]">contact@hayoss.com</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#B8927A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5B54]">{t.info.hours}</p>
                    <p className="font-medium text-[#2D2926]">{t.info.hoursValue}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#B8927A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5B54]">{t.info.response}</p>
                    <p className="font-medium text-[#2D2926]">{t.info.responseValue}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-[#2D2926] p-6 rounded-2xl text-white">
              <h3 className="font-serif text-lg mb-2">{t.faq}</h3>
              <p className="text-sm text-[#D4C4B5] mb-4">{t.faqDesc}</p>
              <Link
                href="/faq"
                className="inline-flex items-center text-[#B8927A] hover:text-white transition-colors text-sm font-medium"
              >
                Voir la FAQ
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#2D2926] mb-2">
                    {t.form.name} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8DED5] focus:outline-none focus:border-[#B8927A] transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#2D2926] mb-2">
                    {t.form.email} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8DED5] focus:outline-none focus:border-[#B8927A] transition-colors"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[#2D2926] mb-2">
                    {t.form.subject} *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8DED5] focus:outline-none focus:border-[#B8927A] transition-colors bg-white"
                  >
                    <option value="">--</option>
                    <option value="order">{t.form.subjects.order}</option>
                    <option value="product">{t.form.subjects.product}</option>
                    <option value="return">{t.form.subjects.return}</option>
                    <option value="other">{t.form.subjects.other}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="orderNumber" className="block text-sm font-medium text-[#2D2926] mb-2">
                    {t.form.orderNumber}
                  </label>
                  <input
                    type="text"
                    id="orderNumber"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleChange}
                    placeholder="HAY-XXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8DED5] focus:outline-none focus:border-[#B8927A] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#2D2926] mb-2">
                  {t.form.message} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t.form.messagePlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8DED5] focus:outline-none focus:border-[#B8927A] transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#2D2926] text-white rounded-full font-medium hover:bg-[#B8927A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.form.submitting}
                  </>
                ) : (
                  t.form.submit
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
