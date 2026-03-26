// ============================================================================
// Email Notification Adapter
// ============================================================================
// Service d'envoi d'emails transactionnels pour:
// - Confirmation de commande
// - Notification d'expédition (avec tracking)
// - Notification de livraison
// - Alertes de dispute
//
// Compatible avec: SendGrid, Mailgun, SMTP, ou autres providers
// ============================================================================

import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  from: string;
  fromName: string;
  // SMTP config
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  // API config (SendGrid, Mailgun)
  apiKey?: string;
  domain?: string; // For Mailgun
}

export interface OrderEmailData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
    image?: string;
  }>;
  totalAmount: string;
  currency: string;
  shippingAddress: {
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
// Email Templates
// ============================================================================

const TEMPLATES = {
  orderConfirmation: (data: OrderEmailData, lang: 'fr' | 'en' = 'fr') => {
    const t = lang === 'fr' ? {
      subject: `Confirmation de commande #${data.orderNumber}`,
      greeting: `Bonjour ${data.customerName},`,
      thanks: 'Merci pour votre commande !',
      summary: 'Voici le récapitulatif de votre commande :',
      items: 'Articles commandés',
      shipping: 'Adresse de livraison',
      total: 'Total',
      nextSteps: 'Prochaines étapes',
      nextStepsText: 'Nous préparons votre commande. Vous recevrez un email avec le numéro de suivi dès que votre colis sera expédié.',
      questions: 'Des questions ?',
      questionsText: 'Notre équipe est là pour vous aider.',
      footer: 'Merci de votre confiance !',
    } : {
      subject: `Order Confirmation #${data.orderNumber}`,
      greeting: `Hello ${data.customerName},`,
      thanks: 'Thank you for your order!',
      summary: 'Here is your order summary:',
      items: 'Ordered Items',
      shipping: 'Shipping Address',
      total: 'Total',
      nextSteps: 'Next Steps',
      nextStepsText: 'We are preparing your order. You will receive an email with tracking information once your package ships.',
      questions: 'Questions?',
      questionsText: 'Our team is here to help.',
      footer: 'Thank you for your trust!',
    };

    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" width="60" style="border-radius: 4px;">` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">x${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.price}</td>
      </tr>
    `).join('');

    return {
      subject: t.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Dropship Luxe</h1>
          </div>

          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 5px;">${t.greeting}</p>
            <p style="color: #666; margin-top: 5px;">${t.thanks}</p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="font-size: 16px; margin-top: 0; color: #333;">${t.summary}</h2>
              <p><strong>Commande :</strong> #${data.orderNumber}</p>
            </div>

            <h3 style="border-bottom: 2px solid #667eea; padding-bottom: 10px;">${t.items}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
              <tr style="background: #f9f9f9;">
                <td colspan="3" style="padding: 12px; font-weight: bold;">${t.total}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #667eea;">
                  ${data.totalAmount} ${data.currency}
                </td>
              </tr>
            </table>

            <h3 style="border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 30px;">${t.shipping}</h3>
            <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
              ${data.shippingAddress.street}<br>
              ${data.shippingAddress.postalCode} ${data.shippingAddress.city}<br>
              ${data.shippingAddress.country}
            </p>

            <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0066cc;">${t.nextSteps}</h3>
              <p style="margin-bottom: 0;">${t.nextStepsText}</p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
            <p>${t.footer}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Dropship Luxe - Cosmétiques de Luxe
            </p>
          </div>
        </body>
        </html>
      `,
    };
  },

  shipmentNotification: (data: OrderEmailData, lang: 'fr' | 'en' = 'fr') => {
    const t = lang === 'fr' ? {
      subject: `Votre commande #${data.orderNumber} a été expédiée !`,
      greeting: `Bonjour ${data.customerName},`,
      shipped: 'Bonne nouvelle ! Votre commande a été expédiée.',
      tracking: 'Suivre mon colis',
      trackingNumber: 'Numéro de suivi',
      carrier: 'Transporteur',
      estimatedDelivery: 'Livraison estimée',
      note: 'Note importante',
      noteText: 'Les délais de livraison peuvent varier selon la destination. Vous pouvez suivre votre colis en temps réel via le lien ci-dessus.',
    } : {
      subject: `Your order #${data.orderNumber} has shipped!`,
      greeting: `Hello ${data.customerName},`,
      shipped: 'Great news! Your order has been shipped.',
      tracking: 'Track my package',
      trackingNumber: 'Tracking Number',
      carrier: 'Carrier',
      estimatedDelivery: 'Estimated Delivery',
      note: 'Important Note',
      noteText: 'Delivery times may vary by destination. You can track your package in real-time using the link above.',
    };

    return {
      subject: t.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Colis Expédié !</h1>
          </div>

          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
            <p style="font-size: 18px;">${t.greeting}</p>
            <p>${t.shipped}</p>

            <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 15px 0;"><strong>${t.trackingNumber}:</strong> ${data.trackingNumber}</p>
              ${data.carrier ? `<p style="margin: 0 0 15px 0;"><strong>${t.carrier}:</strong> ${data.carrier}</p>` : ''}
              ${data.estimatedDelivery ? `<p style="margin: 0 0 15px 0;"><strong>${t.estimatedDelivery}:</strong> ${data.estimatedDelivery}</p>` : ''}
              ${data.trackingUrl ? `
                <a href="${data.trackingUrl}" style="display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">
                  ${t.tracking}
                </a>
              ` : ''}
            </div>

            <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
              <strong>${t.note}:</strong><br>
              ${t.noteText}
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
            <p>Dropship Luxe - Cosmétiques de Luxe</p>
          </div>
        </body>
        </html>
      `,
    };
  },

  deliveryNotification: (data: OrderEmailData, lang: 'fr' | 'en' = 'fr') => {
    const t = lang === 'fr' ? {
      subject: `Votre commande #${data.orderNumber} a été livrée !`,
      greeting: `Bonjour ${data.customerName},`,
      delivered: 'Votre commande a été livrée avec succès !',
      feedback: 'Votre avis compte',
      feedbackText: 'Nous espérons que vous êtes satisfait(e) de vos produits. N\'hésitez pas à nous laisser un avis !',
      skinTest: 'Rappel Sécurité',
      skinTestText: 'Pour tout nouveau produit cosmétique, nous recommandons d\'effectuer un test cutané (patch test) 24h avant la première utilisation complète.',
    } : {
      subject: `Your order #${data.orderNumber} has been delivered!`,
      greeting: `Hello ${data.customerName},`,
      delivered: 'Your order has been successfully delivered!',
      feedback: 'Your feedback matters',
      feedbackText: 'We hope you\'re happy with your products. Feel free to leave us a review!',
      skinTest: 'Safety Reminder',
      skinTestText: 'For any new cosmetic product, we recommend performing a patch test 24 hours before first full use.',
    };

    return {
      subject: t.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Commande Livrée !</h1>
          </div>

          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
            <p style="font-size: 18px;">${t.greeting}</p>
            <p>${t.delivered}</p>

            <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">${t.feedback}</h3>
              <p>${t.feedbackText}</p>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
              <strong>${t.skinTest}:</strong><br>
              ${t.skinTestText}
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
            <p>Merci de votre confiance !</p>
            <p>Dropship Luxe - Cosmétiques de Luxe</p>
          </div>
        </body>
        </html>
      `,
    };
  },
};

// ============================================================================
// Email Adapter Class
// ============================================================================

export class EmailAdapter {
  private transporter: nodemailer.Transporter | null = null;
  private readonly config: EmailConfig;
  private readonly prisma: PrismaClient;

  constructor(config: EmailConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (this.config.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort ?? 587,
        secure: this.config.smtpSecure ?? false,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        },
      });
    }
    // TODO: Add SendGrid and Mailgun support
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(data: OrderEmailData): Promise<EmailResult> {
    const template = TEMPLATES.orderConfirmation(data, 'fr');
    return this.send(data.customerEmail, template.subject, template.html);
  }

  /**
   * Send shipment notification email
   */
  async sendShipmentNotification(data: OrderEmailData): Promise<EmailResult> {
    const template = TEMPLATES.shipmentNotification(data, 'fr');
    return this.send(data.customerEmail, template.subject, template.html);
  }

  /**
   * Send delivery notification email
   */
  async sendDeliveryNotification(data: OrderEmailData): Promise<EmailResult> {
    const template = TEMPLATES.deliveryNotification(data, 'fr');
    return this.send(data.customerEmail, template.subject, template.html);
  }

  /**
   * Generic send method
   */
  private async send(to: string, subject: string, html: string): Promise<EmailResult> {
    try {
      if (!this.transporter) {
        // Log-only mode if no transporter configured
        console.log('[Email] Would send:', { to, subject });
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
        };
      }

      const result = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.from}>`,
        to,
        subject,
        html,
      });

      // Log to database
      await this.prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT',
          entity: 'Email',
          entityId: result.messageId,
          changes: { to, subject },
        },
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('[Email] Send failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createEmailAdapter(prisma: PrismaClient): EmailAdapter {
  // Build config object with only defined properties
  const config: EmailConfig = {
    provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid' | 'mailgun') ?? 'smtp',
    from: process.env.EMAIL_FROM ?? 'noreply@dropship-luxe.com',
    fromName: process.env.EMAIL_FROM_NAME ?? 'Dropship Luxe',
    smtpSecure: process.env.SMTP_SECURE === 'true',
  };

  // Only add optional properties if they have values
  if (process.env.SMTP_HOST) config.smtpHost = process.env.SMTP_HOST;
  if (process.env.SMTP_PORT) config.smtpPort = parseInt(process.env.SMTP_PORT);
  if (process.env.SMTP_USER) config.smtpUser = process.env.SMTP_USER;
  if (process.env.SMTP_PASSWORD) config.smtpPassword = process.env.SMTP_PASSWORD;
  if (process.env.EMAIL_API_KEY) config.apiKey = process.env.EMAIL_API_KEY;
  if (process.env.EMAIL_DOMAIN) config.domain = process.env.EMAIL_DOMAIN;

  return new EmailAdapter(config, prisma);
}
