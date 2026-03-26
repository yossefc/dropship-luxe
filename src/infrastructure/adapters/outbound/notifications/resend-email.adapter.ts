// ============================================================================
// Resend Email Adapter - Production Email Service
// ============================================================================
// Adaptateur email utilisant Resend API pour l'envoi d'emails transactionnels
// en production sur le domaine hayoss.com
//
// Fonctionnalités:
// - Confirmation de commande
// - Notification d'expédition (avec tracking)
// - Notification de livraison
// - Support multi-langues (FR, EN, ES, IT, DE)
// ============================================================================

import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { logger } from '@infrastructure/config/logger.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ResendEmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  isDevelopment?: boolean;
}

export interface OrderEmailData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  locale: 'fr' | 'en' | 'es' | 'it' | 'de';
  items: Array<{
    name: string;
    quantity: number;
    price: string;
    image?: string;
  }>;
  subtotal: string;
  shippingCost: string;
  tax: string;
  totalAmount: string;
  currency: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Translations
// ============================================================================

const TRANSLATIONS = {
  fr: {
    brand: 'Hayoss',
    tagline: 'Beauté & Cosmétiques Premium',
    orderConfirmation: {
      subject: (orderNumber: string) => `Confirmation de commande #${orderNumber} - Hayoss`,
      greeting: (name: string) => `Bonjour ${name},`,
      thanks: 'Merci pour votre commande !',
      summary: 'Récapitulatif de votre commande',
      items: 'Articles commandés',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      tax: 'TVA',
      total: 'Total',
      shippingAddress: 'Adresse de livraison',
      nextSteps: 'Prochaines étapes',
      nextStepsText: 'Nous préparons votre commande avec soin. Vous recevrez un email avec le numéro de suivi dès que votre colis sera expédié.',
      questions: 'Des questions ?',
      questionsText: 'Notre équipe est disponible à contact@hayoss.com',
      footer: 'Merci de votre confiance !',
    },
    shipment: {
      subject: (orderNumber: string) => `Votre commande #${orderNumber} a été expédiée ! - Hayoss`,
      greeting: (name: string) => `Bonjour ${name},`,
      shipped: 'Bonne nouvelle ! Votre commande est en route.',
      trackPackage: 'Suivre mon colis',
      trackingNumber: 'Numéro de suivi',
      carrier: 'Transporteur',
      estimatedDelivery: 'Livraison estimée',
      note: 'Note importante',
      noteText: 'Les délais de livraison peuvent varier selon la destination. Suivez votre colis en temps réel via le lien ci-dessus.',
    },
    delivery: {
      subject: (orderNumber: string) => `Votre commande #${orderNumber} a été livrée ! - Hayoss`,
      greeting: (name: string) => `Bonjour ${name},`,
      delivered: 'Votre commande a été livrée avec succès !',
      feedback: 'Votre avis compte',
      feedbackText: 'Nous espérons que vous êtes satisfait(e) de vos produits. N\'hésitez pas à nous laisser un avis !',
      skinTest: 'Conseil beauté',
      skinTestText: 'Pour tout nouveau produit cosmétique, nous recommandons d\'effectuer un test cutané 24h avant la première utilisation.',
    },
  },
  en: {
    brand: 'Hayoss',
    tagline: 'Premium Beauty & Cosmetics',
    orderConfirmation: {
      subject: (orderNumber: string) => `Order Confirmation #${orderNumber} - Hayoss`,
      greeting: (name: string) => `Hello ${name},`,
      thanks: 'Thank you for your order!',
      summary: 'Your Order Summary',
      items: 'Ordered Items',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      total: 'Total',
      shippingAddress: 'Shipping Address',
      nextSteps: 'Next Steps',
      nextStepsText: 'We are carefully preparing your order. You will receive an email with tracking information once your package ships.',
      questions: 'Questions?',
      questionsText: 'Our team is available at contact@hayoss.com',
      footer: 'Thank you for your trust!',
    },
    shipment: {
      subject: (orderNumber: string) => `Your order #${orderNumber} has shipped! - Hayoss`,
      greeting: (name: string) => `Hello ${name},`,
      shipped: 'Great news! Your order is on its way.',
      trackPackage: 'Track my package',
      trackingNumber: 'Tracking Number',
      carrier: 'Carrier',
      estimatedDelivery: 'Estimated Delivery',
      note: 'Important Note',
      noteText: 'Delivery times may vary by destination. Track your package in real-time using the link above.',
    },
    delivery: {
      subject: (orderNumber: string) => `Your order #${orderNumber} has been delivered! - Hayoss`,
      greeting: (name: string) => `Hello ${name},`,
      delivered: 'Your order has been successfully delivered!',
      feedback: 'Your feedback matters',
      feedbackText: 'We hope you\'re happy with your products. Feel free to leave us a review!',
      skinTest: 'Beauty tip',
      skinTestText: 'For any new cosmetic product, we recommend performing a patch test 24 hours before first full use.',
    },
  },
  es: {
    brand: 'Hayoss',
    tagline: 'Belleza y Cosméticos Premium',
    orderConfirmation: {
      subject: (orderNumber: string) => `Confirmación de pedido #${orderNumber} - Hayoss`,
      greeting: (name: string) => `Hola ${name},`,
      thanks: '¡Gracias por tu pedido!',
      summary: 'Resumen de tu pedido',
      items: 'Artículos pedidos',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      tax: 'IVA',
      total: 'Total',
      shippingAddress: 'Dirección de envío',
      nextSteps: 'Próximos pasos',
      nextStepsText: 'Estamos preparando tu pedido con cuidado. Recibirás un email con el número de seguimiento cuando se envíe.',
      questions: '¿Preguntas?',
      questionsText: 'Nuestro equipo está disponible en contact@hayoss.com',
      footer: '¡Gracias por tu confianza!',
    },
    shipment: {
      subject: (orderNumber: string) => `¡Tu pedido #${orderNumber} ha sido enviado! - Hayoss`,
      greeting: (name: string) => `Hola ${name},`,
      shipped: '¡Buenas noticias! Tu pedido está en camino.',
      trackPackage: 'Seguir mi paquete',
      trackingNumber: 'Número de seguimiento',
      carrier: 'Transportista',
      estimatedDelivery: 'Entrega estimada',
      note: 'Nota importante',
      noteText: 'Los tiempos de entrega pueden variar según el destino. Sigue tu paquete en tiempo real.',
    },
    delivery: {
      subject: (orderNumber: string) => `¡Tu pedido #${orderNumber} ha sido entregado! - Hayoss`,
      greeting: (name: string) => `Hola ${name},`,
      delivered: '¡Tu pedido ha sido entregado con éxito!',
      feedback: 'Tu opinión importa',
      feedbackText: 'Esperamos que estés satisfecho con tus productos. ¡Déjanos una reseña!',
      skinTest: 'Consejo de belleza',
      skinTestText: 'Para cualquier nuevo producto cosmético, recomendamos hacer una prueba cutánea 24h antes del primer uso.',
    },
  },
  it: {
    brand: 'Hayoss',
    tagline: 'Bellezza e Cosmetici Premium',
    orderConfirmation: {
      subject: (orderNumber: string) => `Conferma ordine #${orderNumber} - Hayoss`,
      greeting: (name: string) => `Ciao ${name},`,
      thanks: 'Grazie per il tuo ordine!',
      summary: 'Riepilogo del tuo ordine',
      items: 'Articoli ordinati',
      subtotal: 'Subtotale',
      shipping: 'Spedizione',
      tax: 'IVA',
      total: 'Totale',
      shippingAddress: 'Indirizzo di spedizione',
      nextSteps: 'Prossimi passi',
      nextStepsText: 'Stiamo preparando il tuo ordine con cura. Riceverai un\'email con il numero di tracciamento quando spedito.',
      questions: 'Domande?',
      questionsText: 'Il nostro team è disponibile a contact@hayoss.com',
      footer: 'Grazie per la tua fiducia!',
    },
    shipment: {
      subject: (orderNumber: string) => `Il tuo ordine #${orderNumber} è stato spedito! - Hayoss`,
      greeting: (name: string) => `Ciao ${name},`,
      shipped: 'Buone notizie! Il tuo ordine è in arrivo.',
      trackPackage: 'Traccia il mio pacco',
      trackingNumber: 'Numero di tracciamento',
      carrier: 'Corriere',
      estimatedDelivery: 'Consegna stimata',
      note: 'Nota importante',
      noteText: 'I tempi di consegna possono variare. Traccia il tuo pacco in tempo reale.',
    },
    delivery: {
      subject: (orderNumber: string) => `Il tuo ordine #${orderNumber} è stato consegnato! - Hayoss`,
      greeting: (name: string) => `Ciao ${name},`,
      delivered: 'Il tuo ordine è stato consegnato con successo!',
      feedback: 'La tua opinione conta',
      feedbackText: 'Speriamo che tu sia soddisfatto dei tuoi prodotti. Lasciaci una recensione!',
      skinTest: 'Consiglio di bellezza',
      skinTestText: 'Per ogni nuovo prodotto cosmetico, consigliamo un patch test 24h prima del primo utilizzo.',
    },
  },
  de: {
    brand: 'Hayoss',
    tagline: 'Premium Schönheit & Kosmetik',
    orderConfirmation: {
      subject: (orderNumber: string) => `Bestellbestätigung #${orderNumber} - Hayoss`,
      greeting: (name: string) => `Hallo ${name},`,
      thanks: 'Vielen Dank für Ihre Bestellung!',
      summary: 'Ihre Bestellübersicht',
      items: 'Bestellte Artikel',
      subtotal: 'Zwischensumme',
      shipping: 'Versand',
      tax: 'MwSt',
      total: 'Gesamt',
      shippingAddress: 'Lieferadresse',
      nextSteps: 'Nächste Schritte',
      nextStepsText: 'Wir bereiten Ihre Bestellung sorgfältig vor. Sie erhalten eine E-Mail mit der Sendungsverfolgung.',
      questions: 'Fragen?',
      questionsText: 'Unser Team ist erreichbar unter contact@hayoss.com',
      footer: 'Vielen Dank für Ihr Vertrauen!',
    },
    shipment: {
      subject: (orderNumber: string) => `Ihre Bestellung #${orderNumber} wurde versandt! - Hayoss`,
      greeting: (name: string) => `Hallo ${name},`,
      shipped: 'Gute Nachrichten! Ihre Bestellung ist unterwegs.',
      trackPackage: 'Paket verfolgen',
      trackingNumber: 'Sendungsnummer',
      carrier: 'Versanddienstleister',
      estimatedDelivery: 'Voraussichtliche Lieferung',
      note: 'Wichtiger Hinweis',
      noteText: 'Lieferzeiten können je nach Zielort variieren. Verfolgen Sie Ihr Paket in Echtzeit.',
    },
    delivery: {
      subject: (orderNumber: string) => `Ihre Bestellung #${orderNumber} wurde zugestellt! - Hayoss`,
      greeting: (name: string) => `Hallo ${name},`,
      delivered: 'Ihre Bestellung wurde erfolgreich zugestellt!',
      feedback: 'Ihre Meinung zählt',
      feedbackText: 'Wir hoffen, Sie sind mit Ihren Produkten zufrieden. Hinterlassen Sie uns eine Bewertung!',
      skinTest: 'Schönheitstipp',
      skinTestText: 'Für jedes neue Kosmetikprodukt empfehlen wir einen Patch-Test 24h vor der ersten Anwendung.',
    },
  },
};

// ============================================================================
// Email Templates (Responsive HTML)
// ============================================================================

function generateBaseTemplate(content: string, brandName: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${brandName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    body { margin: 0; padding: 0; width: 100%; background-color: #f5f5f5; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; max-width: 100%; }

    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content-block { padding: 20px !important; }
      .item-row td { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          ${content}
        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 30px 20px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 14px;">
                © ${new Date().getFullYear()} ${brandName}. Tous droits réservés.
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                <a href="https://www.hayoss.com/fr/legal/privacy" style="color: #999; text-decoration: underline;">Politique de confidentialité</a>
                &nbsp;|&nbsp;
                <a href="https://www.hayoss.com/fr/legal/terms" style="color: #999; text-decoration: underline;">CGV</a>
                &nbsp;|&nbsp;
                <a href="https://www.hayoss.com/fr/contact" style="color: #999; text-decoration: underline;">Contact</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateOrderConfirmationTemplate(data: OrderEmailData): { subject: string; html: string } {
  const t = TRANSLATIONS[data.locale]?.orderConfirmation ?? TRANSLATIONS.en.orderConfirmation;
  const brand = TRANSLATIONS[data.locale]?.brand ?? 'Hayoss';

  const itemsHtml = data.items.map(item => `
    <tr class="item-row">
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" width="70" height="70" style="border-radius: 8px; object-fit: cover;">` : ''}
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        <p style="margin: 0; font-weight: 600; color: #333;">${item.name}</p>
        <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Qty: ${item.quantity}</p>
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">
        <p style="margin: 0; font-weight: 600; color: #333;">${item.price}</p>
      </td>
    </tr>
  `).join('');

  const content = `
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${brand}</h1>
        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">Beauté & Cosmétiques Premium</p>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td class="content-block" style="padding: 40px 30px;">
        <p style="font-size: 20px; margin: 0 0 5px; color: #333;">${t.greeting(data.customerName)}</p>
        <p style="color: #666; margin: 5px 0 30px; font-size: 16px;">${t.thanks}</p>

        <!-- Order Summary Box -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="font-size: 16px; margin: 0 0 15px; color: #333; font-weight: 600;">${t.summary}</h2>
          <p style="margin: 0; color: #666;">
            <strong style="color: #333;">Commande:</strong> #${data.orderNumber}
          </p>
        </div>

        <!-- Items Table -->
        <h3 style="font-size: 16px; margin: 0 0 15px; padding-bottom: 15px; border-bottom: 2px solid #1a1a2e; color: #333;">${t.items}</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          <tr style="background: #f8f9fa;">
            <td colspan="2" style="padding: 12px 15px; color: #666;">${t.subtotal}</td>
            <td style="padding: 12px 15px; text-align: right; color: #333;">${data.subtotal}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td colspan="2" style="padding: 12px 15px; color: #666;">${t.shipping}</td>
            <td style="padding: 12px 15px; text-align: right; color: #333;">${data.shippingCost}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td colspan="2" style="padding: 12px 15px; color: #666;">${t.tax}</td>
            <td style="padding: 12px 15px; text-align: right; color: #333;">${data.tax}</td>
          </tr>
          <tr style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
            <td colspan="2" style="padding: 15px; color: #fff; font-weight: 600; border-radius: 0 0 0 8px;">${t.total}</td>
            <td style="padding: 15px; text-align: right; color: #fff; font-weight: 700; font-size: 20px; border-radius: 0 0 8px 0;">
              ${data.totalAmount} ${data.currency}
            </td>
          </tr>
        </table>

        <!-- Shipping Address -->
        <h3 style="font-size: 16px; margin: 30px 0 15px; padding-bottom: 15px; border-bottom: 2px solid #1a1a2e; color: #333;">${t.shippingAddress}</h3>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px;">
          <p style="margin: 0; color: #333; line-height: 1.8;">
            <strong>${data.shippingAddress.firstName} ${data.shippingAddress.lastName}</strong><br>
            ${data.shippingAddress.street}<br>
            ${data.shippingAddress.postalCode} ${data.shippingAddress.city}<br>
            ${data.shippingAddress.country}
          </p>
        </div>

        <!-- Next Steps -->
        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 25px; border-radius: 12px; margin-top: 30px;">
          <h3 style="margin: 0 0 10px; color: #1565c0; font-size: 16px;">${t.nextSteps}</h3>
          <p style="margin: 0; color: #1976d2; line-height: 1.6;">${t.nextStepsText}</p>
        </div>

        <!-- Questions -->
        <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #eee;">
          <p style="margin: 0 0 5px; color: #333; font-weight: 600;">${t.questions}</p>
          <p style="margin: 0; color: #666;">${t.questionsText}</p>
        </div>
      </td>
    </tr>
  `;

  return {
    subject: t.subject(data.orderNumber),
    html: generateBaseTemplate(content, brand),
  };
}

function generateShipmentTemplate(data: OrderEmailData): { subject: string; html: string } {
  const t = TRANSLATIONS[data.locale]?.shipment ?? TRANSLATIONS.en.shipment;
  const brand = TRANSLATIONS[data.locale]?.brand ?? 'Hayoss';

  const content = `
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #00796b 0%, #26a69a 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">📦</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${brand}</h1>
        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Colis Expédié !</p>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td class="content-block" style="padding: 40px 30px;">
        <p style="font-size: 20px; margin: 0 0 10px; color: #333;">${t.greeting(data.customerName)}</p>
        <p style="color: #666; margin: 0 0 30px; font-size: 16px;">${t.shipped}</p>

        <!-- Tracking Info Box -->
        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 30px; border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 10px; color: #2e7d32;">
            <strong>${t.trackingNumber}:</strong><br>
            <span style="font-size: 20px; font-weight: 700; color: #1b5e20; letter-spacing: 1px;">${data.trackingNumber}</span>
          </p>

          ${data.carrier ? `<p style="margin: 15px 0 0; color: #388e3c;"><strong>${t.carrier}:</strong> ${data.carrier}</p>` : ''}
          ${data.estimatedDelivery ? `<p style="margin: 10px 0 0; color: #388e3c;"><strong>${t.estimatedDelivery}:</strong> ${data.estimatedDelivery}</p>` : ''}

          ${data.trackingUrl ? `
            <a href="${data.trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #00796b 0%, #26a69a 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: 600; margin-top: 20px; box-shadow: 0 4px 15px rgba(0, 121, 107, 0.3);">
              ${t.trackPackage} →
            </a>
          ` : ''}
        </div>

        <!-- Important Note -->
        <div style="background: #fff8e1; padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107; margin-top: 30px;">
          <p style="margin: 0; color: #f57c00;">
            <strong>${t.note}:</strong><br>
            ${t.noteText}
          </p>
        </div>
      </td>
    </tr>
  `;

  return {
    subject: t.subject(data.orderNumber),
    html: generateBaseTemplate(content, brand),
  };
}

function generateDeliveryTemplate(data: OrderEmailData): { subject: string; html: string } {
  const t = TRANSLATIONS[data.locale]?.delivery ?? TRANSLATIONS.en.delivery;
  const brand = TRANSLATIONS[data.locale]?.brand ?? 'Hayoss';

  const content = `
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">✨</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${brand}</h1>
        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Commande Livrée !</p>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td class="content-block" style="padding: 40px 30px;">
        <p style="font-size: 20px; margin: 0 0 10px; color: #333;">${t.greeting(data.customerName)}</p>
        <p style="color: #666; margin: 0 0 30px; font-size: 16px;">${t.delivered}</p>

        <!-- Feedback Box -->
        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 25px; border-radius: 12px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px; color: #1565c0; font-size: 16px;">${t.feedback}</h3>
          <p style="margin: 0; color: #1976d2; line-height: 1.6;">${t.feedbackText}</p>
        </div>

        <!-- Beauty Tip -->
        <div style="background: #fff8e1; padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #f57c00;">
            <strong>💡 ${t.skinTest}:</strong><br>
            ${t.skinTestText}
          </p>
        </div>
      </td>
    </tr>
  `;

  return {
    subject: t.subject(data.orderNumber),
    html: generateBaseTemplate(content, brand),
  };
}

// ============================================================================
// Resend Email Adapter Class
// ============================================================================

export class ResendEmailAdapter {
  private readonly resend: Resend;
  private readonly config: ResendEmailConfig;
  private readonly prisma: PrismaClient;

  constructor(config: ResendEmailConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;
    this.resend = new Resend(config.apiKey);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(data: OrderEmailData): Promise<EmailResult> {
    const template = generateOrderConfirmationTemplate(data);
    return this.send(data.customerEmail, template.subject, template.html, {
      orderId: data.orderId,
      type: 'ORDER_CONFIRMATION',
    });
  }

  /**
   * Send shipment notification email
   */
  async sendShipmentNotification(data: OrderEmailData): Promise<EmailResult> {
    const template = generateShipmentTemplate(data);
    return this.send(data.customerEmail, template.subject, template.html, {
      orderId: data.orderId,
      type: 'SHIPMENT_NOTIFICATION',
    });
  }

  /**
   * Send delivery notification email
   */
  async sendDeliveryNotification(data: OrderEmailData): Promise<EmailResult> {
    const template = generateDeliveryTemplate(data);
    return this.send(data.customerEmail, template.subject, template.html, {
      orderId: data.orderId,
      type: 'DELIVERY_NOTIFICATION',
    });
  }

  /**
   * Generic send method using Resend API
   */
  private async send(
    to: string,
    subject: string,
    html: string,
    metadata: { orderId: string; type: string }
  ): Promise<EmailResult> {
    try {
      // Development mode - log only
      if (this.config.isDevelopment) {
        logger.info('[ResendEmail] Development mode - would send:', {
          to,
          subject,
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
        });
        return {
          success: true,
          messageId: `dev-${Date.now()}`,
        };
      }

      // Production - send via Resend API
      const { data, error } = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: [to],
        subject,
        html,
        replyTo: this.config.replyTo,
        tags: [
          { name: 'order_id', value: metadata.orderId },
          { name: 'email_type', value: metadata.type },
        ],
      });

      if (error) {
        logger.error('[ResendEmail] API error:', { error, to, subject });
        return {
          success: false,
          error: error.message,
        };
      }

      // Log to audit
      await this.prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT',
          entity: 'Email',
          entityId: data?.id ?? metadata.orderId,
          changes: {
            to,
            subject,
            type: metadata.type,
            orderId: metadata.orderId,
            messageId: data?.id,
          },
        },
      });

      logger.info('[ResendEmail] Email sent successfully', {
        messageId: data?.id,
        to,
        type: metadata.type,
      });

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      logger.error('[ResendEmail] Send failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to,
        subject,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// Port Interface (Hexagonal Architecture)
// ============================================================================

export interface EmailNotificationPort {
  sendOrderConfirmation(data: OrderEmailData): Promise<EmailResult>;
  sendShipmentNotification(data: OrderEmailData): Promise<EmailResult>;
  sendDeliveryNotification(data: OrderEmailData): Promise<EmailResult>;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createResendEmailAdapter(prisma: PrismaClient): ResendEmailAdapter {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }

  const config: ResendEmailConfig = {
    apiKey,
    fromEmail: process.env.EMAIL_FROM ?? 'contact@hayoss.com',
    fromName: process.env.EMAIL_FROM_NAME ?? 'Hayoss',
    replyTo: process.env.EMAIL_REPLY_TO ?? 'contact@hayoss.com',
    isDevelopment: process.env.NODE_ENV !== 'production',
  };

  return new ResendEmailAdapter(config, prisma);
}
