// ============================================================================
// Product Translation Repository - Prisma Implementation
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { LocalizedProductContent } from '@domain/ports/outbound/ai-content.port.js';
import { ProductTranslationRepository } from '@application/use-cases/sync-product-translations.use-case.js';
import { logger } from '@infrastructure/config/logger.js';

export class PrismaProductTranslationRepository implements ProductTranslationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertTranslations(
    productId: string,
    translations: LocalizedProductContent[],
    metadata: { aiModel: string; promptVersion: string }
  ): Promise<void> {
    logger.debug('Upserting product translations', {
      productId,
      localesCount: translations.length,
    });

    await this.prisma.$transaction(
      translations.map((translation) =>
        this.prisma.productTranslation.upsert({
          where: {
            productId_locale: {
              productId,
              locale: translation.locale,
            },
          },
          update: {
            name: translation.name,
            slug: translation.slug,
            description: translation.description,
            descriptionHtml: translation.descriptionHtml,
            benefits: translation.benefits,
            metaTitle: translation.metaTitle,
            metaDescription: translation.metaDescription,
            metaKeywords: translation.metaKeywords,
            aiModel: metadata.aiModel,
            aiPromptVersion: metadata.promptVersion,
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
          create: {
            productId,
            locale: translation.locale,
            name: translation.name,
            slug: translation.slug,
            description: translation.description,
            descriptionHtml: translation.descriptionHtml,
            benefits: translation.benefits,
            metaTitle: translation.metaTitle,
            metaDescription: translation.metaDescription,
            metaKeywords: translation.metaKeywords,
            aiModel: metadata.aiModel,
            aiPromptVersion: metadata.promptVersion,
          },
        })
      )
    );

    logger.info('Product translations upserted', {
      productId,
      locales: translations.map((t) => t.locale),
    });
  }

  async getExistingTranslations(productId: string): Promise<LocalizedProductContent[]> {
    const translations = await this.prisma.productTranslation.findMany({
      where: { productId },
    });

    return translations.map((t) => ({
      locale: t.locale as LocalizedProductContent['locale'],
      name: t.name,
      slug: t.slug,
      description: t.description,
      descriptionHtml: t.descriptionHtml,
      benefits: t.benefits,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
      metaKeywords: t.metaKeywords,
    }));
  }

  async getTranslationByLocale(
    productId: string,
    locale: string
  ): Promise<LocalizedProductContent | null> {
    const translation = await this.prisma.productTranslation.findUnique({
      where: {
        productId_locale: {
          productId,
          locale,
        },
      },
    });

    if (!translation) return null;

    return {
      locale: translation.locale as LocalizedProductContent['locale'],
      name: translation.name,
      slug: translation.slug,
      description: translation.description,
      descriptionHtml: translation.descriptionHtml,
      benefits: translation.benefits,
      metaTitle: translation.metaTitle,
      metaDescription: translation.metaDescription,
      metaKeywords: translation.metaKeywords,
    };
  }

  async getProductBySlug(
    locale: string,
    slug: string
  ): Promise<{
    product: {
      id: string;
      sku: string | null;
      images: string[];
      sellingPrice: number;
      currency: string;
      stock: number;
      rating: number | null;
    };
    translation: LocalizedProductContent;
  } | null> {
    const result = await this.prisma.productTranslation.findFirst({
      where: {
        locale,
        slug,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            images: true,
            sellingPrice: true,
            currency: true,
            stock: true,
            rating: true,
          },
        },
      },
    });

    if (!result) return null;

    return {
      product: {
        id: result.product.id,
        sku: result.product.sku,
        images: result.product.images,
        sellingPrice: Number(result.product.sellingPrice),
        currency: result.product.currency,
        stock: result.product.stock,
        rating: result.product.rating ? Number(result.product.rating) : null,
      },
      translation: {
        locale: result.locale as LocalizedProductContent['locale'],
        name: result.name,
        slug: result.slug,
        description: result.description,
        descriptionHtml: result.descriptionHtml,
        benefits: result.benefits,
        metaTitle: result.metaTitle,
        metaDescription: result.metaDescription,
        metaKeywords: result.metaKeywords,
      },
    };
  }
}
