import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export function createProductRouter(prisma: PrismaClient): Router {
  const router = Router();

  // GET /api/v1/products - List all active products
  router.get('/', async (req: Request, res: Response) => {
    try {
      const locale = (req.query.locale as string) || 'fr';
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const category = req.query.category as string;
      const featured = req.query.featured === 'true';

      const where: any = {
        isActive: true,
      };

      if (category) {
        where.categoryId = category;
      }

      if (featured) {
        where.isFeatured = true;
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          translations: {
            where: { locale },
          },
          variants: {
            where: { isActive: true },
            take: 5,
          },
          category: {
            include: { parent: true },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { importScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      });

      const total = await prisma.product.count({ where });

      // Map products to API format
      const mappedProducts = products.map((product) => {
        const translation = product.translations[0];
        return {
          id: product.id,
          aliexpressId: product.aliexpressId,
          name: translation?.name || product.name || product.originalName,
          slug: translation?.slug || product.aliexpressId,
          description: translation?.description || '',
          descriptionHtml: translation?.descriptionHtml || '',
          benefits: translation?.benefits || [],
          ingredients: translation?.ingredients || null,
          howToUse: translation?.howToUse || null,
          metaTitle: translation?.metaTitle || '',
          metaDescription: translation?.metaDescription || '',
          images: product.images,
          basePrice: Number(product.basePrice),
          costPrice: Number(product.costPrice),
          sellingPrice: Number(product.sellingPrice),
          currency: product.currency,
          stock: product.stock,
          rating: product.rating ? Number(product.rating) : null,
          orderVolume: product.orderVolume,
          supplierName: product.supplierName,
          shippingTimeMin: product.shippingTimeMin,
          shippingTimeMax: product.shippingTimeMax,
          importScore: product.importScore,
          isFeatured: product.isFeatured,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
            parent: (product.category as any).parent ? {
              id: (product.category as any).parent.id,
              name: (product.category as any).parent.name,
              slug: (product.category as any).parent.slug,
            } : null,
          } : null,
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: Number(v.price),
            stock: v.stock,
            attributes: v.attributes,
            image: v.image,
          })),
        };
      });

      res.json({
        success: true,
        data: mappedProducts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch products',
        },
      });
    }
  });

  // GET /api/v1/products/:slug - Get single product by slug
  router.get('/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const locale = (req.query.locale as string) || 'fr';

      // Try to find by translation slug first
      const translation = await prisma.productTranslation.findFirst({
        where: {
          slug,
          locale,
        },
        include: {
          product: {
            include: {
              translations: true,
              variants: {
                where: { isActive: true },
                include: {
                  translations: {
                    where: { locale },
                  },
                },
              },
              category: true,
            },
          },
        },
      });

      let product = translation?.product || null;

      // If not found by slug, try by aliexpressId
      if (!product) {
        product = await prisma.product.findFirst({
          where: {
            OR: [
              { aliexpressId: slug },
              { id: slug },
            ],
            isActive: true,
          },
          include: {
            translations: true,
            variants: {
              where: { isActive: true },
              include: {
                translations: {
                  where: { locale },
                },
              },
            },
            category: true,
          },
        });
      }

      if (!product) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        });
        return;
      }

      const currentTranslation = product.translations.find(t => t.locale === locale)
        || product.translations[0];

      res.json({
        success: true,
        data: {
          id: product.id,
          aliexpressId: product.aliexpressId,
          name: currentTranslation?.name || product.name || product.originalName,
          slug: currentTranslation?.slug || product.aliexpressId,
          description: currentTranslation?.description || '',
          descriptionHtml: currentTranslation?.descriptionHtml || '',
          benefits: currentTranslation?.benefits || [],
          ingredients: currentTranslation?.ingredients || null,
          howToUse: currentTranslation?.howToUse || null,
          metaTitle: currentTranslation?.metaTitle || '',
          metaDescription: currentTranslation?.metaDescription || '',
          images: product.images,
          basePrice: Number(product.basePrice),
          costPrice: Number(product.costPrice),
          sellingPrice: Number(product.sellingPrice),
          currency: product.currency,
          stock: product.stock,
          rating: product.rating ? Number(product.rating) : null,
          orderVolume: product.orderVolume,
          supplierName: product.supplierName,
          shippingTimeMin: product.shippingTimeMin,
          shippingTimeMax: product.shippingTimeMax,
          importScore: product.importScore,
          isFeatured: product.isFeatured,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
            parent: (product.category as any).parent ? {
              id: (product.category as any).parent.id,
              name: (product.category as any).parent.name,
              slug: (product.category as any).parent.slug,
            } : null,
          } : null,
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: Number(v.price),
            stock: v.stock,
            attributes: v.attributes,
            image: v.image,
          })),
          translations: product.translations.map(t => ({
            locale: t.locale,
            name: t.name,
            slug: t.slug,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product',
        },
      });
    }
  });

  return router;
}
