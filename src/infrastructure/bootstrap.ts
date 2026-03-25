// ============================================================================
// Bootstrap - Central System Initialization
// ============================================================================
// Point d'entrée principal du serveur Dropship Luxe.
//
// Ce fichier initialise:
// - Le serveur Express avec toutes les routes (Webhooks Hyp, OAuth AliExpress)
// - Les files d'attente BullMQ et leurs Workers
// - Le scheduler de tâches Cron (sync stocks toutes les 6h)
// - La connexion Prisma/PostgreSQL
// - La connexion Redis
//
// IMPORTANT: Stripe a été complètement supprimé.
// Tous les paiements passent par Hyp (YaadPay).
// ============================================================================

import Redis from 'ioredis';
import { Worker } from 'bullmq';
import { env } from '@infrastructure/config/env.js';
import { createLogger, AuditLogger } from '@infrastructure/config/logger.js';
import { PrismaAuditLogWriter } from '@infrastructure/audit/prisma-audit-log-writer.js';
import { prisma } from '@infrastructure/config/prisma.js';
import { createServer, setupErrorHandling } from '@infrastructure/http/server.js';
import { CronScheduler } from '@infrastructure/cron/scheduler.js';
import { BullMQAdapter } from '@infrastructure/messaging/bullmq.adapter.js';

// Adapters - Hyp remplace Stripe
import { HypAdapter, createHypAdapter } from '@infrastructure/adapters/outbound/payment/hyp.adapter.js';
import { AliExpressAdapter } from '@infrastructure/adapters/outbound/external-apis/aliexpress.adapter.js';
import { OpenAIAdapter } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { createAliExpressOAuthService } from '@infrastructure/adapters/outbound/external-apis/aliexpress-oauth.service.js';

// Controllers & Routers
import { createHypWebhookRouter, HypWebhookController, PaymentProcessingJob } from '@infrastructure/http/controllers/hyp-webhook.controller.js';
import { createAliExpressOAuthRouter } from '@infrastructure/http/controllers/aliexpress-oauth.controller.js';

// Jobs & Workers
import { TrackingSyncJob, createTrackingSyncJob } from '@infrastructure/jobs/tracking-sync.job.js';

// ============================================================================
// Types
// ============================================================================

interface BootstrapResult {
  shutdown: () => Promise<void>;
}

// ============================================================================
// Main Bootstrap Function
// ============================================================================

export async function bootstrap(): Promise<BootstrapResult> {
  // ==========================================================================
  // 1. Initialize Logger
  // ==========================================================================
  const logger = createLogger({
    level: env.LOG_LEVEL,
    logsDir: env.LOGS_DIR,
    retentionDays: env.LOG_RETENTION_DAYS,
  });

  const auditLogger = new AuditLogger(logger, new PrismaAuditLogWriter(prisma));

  logger.info('========================================');
  logger.info('Starting Dropship Luxe API');
  logger.info('========================================');
  logger.info('Configuration:', {
    environment: env.NODE_ENV,
    port: env.PORT,
    paymentGateway: 'Hyp (YaadPay)',  // Stripe supprimé
  });

  // ==========================================================================
  // 2. Initialize Redis Connection
  // ==========================================================================
  const redisConnection = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD ?? undefined,
    maxRetriesPerRequest: null,  // Required for BullMQ
    enableReadyCheck: false,
  });

  redisConnection.on('connect', () => {
    logger.info('Redis connected', { host: env.REDIS_HOST, port: env.REDIS_PORT });
  });

  redisConnection.on('error', (error) => {
    logger.error('Redis connection error', { error: error.message });
  });

  // ==========================================================================
  // 3. Initialize Message Queue (BullMQ)
  // ==========================================================================
  const messageQueue = new BullMQAdapter(
    {
      redisHost: env.REDIS_HOST,
      redisPort: env.REDIS_PORT,
      ...(env.REDIS_PASSWORD != null ? { redisPassword: env.REDIS_PASSWORD } : {}),
    },
    logger
  );

  logger.info('BullMQ message queue initialized');

  // ==========================================================================
  // 4. Initialize Adapters (Hyp, AliExpress, OpenAI)
  // ==========================================================================

  // HYP ADAPTER - Remplace complètement Stripe
  const hypAdapter = createHypAdapter(logger);
  logger.info('Hyp (YaadPay) payment adapter initialized');

  // AliExpress Adapter
  const aliexpressAdapter = new AliExpressAdapter({
    appKey: env.ALIEXPRESS_APP_KEY,
    appSecret: env.ALIEXPRESS_APP_SECRET,
    accessToken: env.ALIEXPRESS_ACCESS_TOKEN,
    trackingId: env.ALIEXPRESS_TRACKING_ID,
  });
  logger.info('AliExpress adapter initialized');

  // OpenAI Adapter (pour traductions produits)
  const openaiAdapter = new OpenAIAdapter({
    apiKey: env.OPENAI_API_KEY,
  });
  logger.info('OpenAI adapter initialized');

  // ==========================================================================
  // 5. Create Express Server
  // ==========================================================================
  const app = createServer(logger, auditLogger, prisma);

  // ==========================================================================
  // 6. Mount Hyp Webhook Routes (CRITICAL - Payment Processing)
  // ==========================================================================
  const { router: hypWebhookRouter, controller: hypWebhookController } = createHypWebhookRouter(
    hypAdapter,
    prisma,
    redisConnection,
    logger,
    auditLogger
  );

  // Hyp envoie les webhooks en URL-encoded, on doit parser correctement
  app.use('/webhooks/hyp', hypWebhookRouter);
  logger.info('Hyp webhook routes mounted at /webhooks/hyp');

  // ==========================================================================
  // 7. Mount AliExpress OAuth Routes
  // ==========================================================================
  app.use('/api/aliexpress', createAliExpressOAuthRouter(prisma));
  logger.info('AliExpress OAuth routes mounted at /api/aliexpress');

  // ==========================================================================
  // 8. Mount API Routes
  // ==========================================================================
  app.get('/api/v1/products', async (_req, res) => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          translations: {
            where: { locale: 'fr' },
          },
          variants: {
            where: { isActive: true },
          },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      logger.error('Failed to fetch products', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
      });
    }
  });

  // Health check avec statut des dépendances
  app.get('/api/health/detailed', async (_req, res) => {
    const checks = {
      database: false,
      redis: false,
      timestamp: new Date().toISOString(),
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      // Database check failed
    }

    try {
      await redisConnection.ping();
      checks.redis = true;
    } catch {
      // Redis check failed
    }

    const allHealthy = checks.database && checks.redis;
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    });
  });

  // ==========================================================================
  // 9. Setup Error Handling
  // ==========================================================================
  setupErrorHandling(app, logger);

  // ==========================================================================
  // 10. Initialize Workers (BullMQ)
  // ==========================================================================

  // Worker pour traiter les paiements Hyp
  const hypPaymentWorker = new Worker<PaymentProcessingJob>(
    'hyp-payments',
    async (job) => {
      const { eventType } = job.data;

      logger.info('Processing Hyp payment job', {
        jobId: job.id,
        eventType,
        orderId: job.data.orderId,
      });

      switch (eventType) {
        case 'payment.succeeded':
          await hypWebhookController.processSuccessfulPayment(job.data);
          break;

        case 'payment.failed':
        case 'payment.canceled':
          await hypWebhookController.processFailedPayment(job.data);
          break;

        default:
          logger.warn('Unhandled payment event type', { eventType });
      }

      return { processed: true, eventType };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  hypPaymentWorker.on('completed', (job, result) => {
    logger.info('Hyp payment job completed', {
      jobId: job.id,
      eventType: job.data.eventType,
      result,
    });
  });

  hypPaymentWorker.on('failed', (job, error) => {
    logger.error('Hyp payment job failed', {
      jobId: job?.id,
      eventType: job?.data.eventType,
      error: error.message,
    });
  });

  logger.info('Hyp payment worker started');

  // Worker pour le fulfillment AliExpress
  const fulfillmentWorker = new Worker(
    'order-fulfillment',
    async (job) => {
      const { orderId } = job.data;

      logger.info('Processing AliExpress fulfillment', { orderId });

      // Récupérer la commande avec ses items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Créer les commandes fournisseur pour chaque item
      for (const item of order.items) {
        try {
          // Sanitiser l'adresse
          const sanitizedAddress = {
            fullName: `${order.shippingFirstName} ${order.shippingLastName}`
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase(),
            street: order.shippingStreet
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase(),
            city: order.shippingCity
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase(),
            postalCode: order.shippingPostalCode.replace(/\s/g, ''),
            country: order.shippingCountry.toUpperCase(),
            phone: order.shippingPhone ?? '',
          };

          // Créer l'enregistrement SupplierOrder
          const supplierOrder = await prisma.supplierOrder.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitCost: item.supplierPrice,
              shippingCost: 0,
              totalCost: item.supplierPrice.toNumber() * item.quantity,
              shippingName: sanitizedAddress.fullName,
              shippingAddress: sanitizedAddress.street,
              shippingCity: sanitizedAddress.city,
              shippingPostalCode: sanitizedAddress.postalCode,
              shippingCountry: sanitizedAddress.country,
              shippingPhone: sanitizedAddress.phone,
              status: 'pending',
            },
          });

          // Soumettre à AliExpress
          const result = await aliexpressAdapter.placeOrder(
            [
              {
                productId: item.product.aliexpressId,
                variantId: item.variantId ?? undefined,
                quantity: item.quantity,
              },
            ],
            sanitizedAddress
          );

          // Mettre à jour avec l'ID AliExpress
          await prisma.supplierOrder.update({
            where: { id: supplierOrder.id },
            data: {
              aliexpressOrderId: result.orderId,
              status: 'submitted',
              submittedAt: new Date(),
            },
          });

          logger.info('AliExpress order created', {
            supplierOrderId: supplierOrder.id,
            aliexpressOrderId: result.orderId,
          });

        } catch (error) {
          logger.error('Failed to create AliExpress order', {
            orderId,
            itemId: item.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Mettre à jour le statut de la commande
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'processing' },
      });

      return { processed: true, orderId };
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  fulfillmentWorker.on('completed', (job, result) => {
    logger.info('Fulfillment job completed', { jobId: job.id, result });
  });

  fulfillmentWorker.on('failed', (job, error) => {
    logger.error('Fulfillment job failed', {
      jobId: job?.id,
      error: error.message,
    });
  });

  logger.info('Order fulfillment worker started');

  // ==========================================================================
  // 11. Initialize Cron Scheduler
  // ==========================================================================
  const cronScheduler = new CronScheduler(logger);

  // Synchronisation des stocks AliExpress (toutes les 6 heures)
  cronScheduler.registerTask({
    name: 'stock-sync',
    schedule: env.CRON_STOCK_SYNC,  // '0 */6 * * *'
    handler: async () => {
      logger.info('Starting stock synchronization with AliExpress...');

      try {
        const products = await prisma.product.findMany({
          where: { isActive: true },
          select: { id: true, aliexpressId: true },
        });

        let updated = 0;
        let errors = 0;

        for (const product of products) {
          try {
            const stock = await aliexpressAdapter.getProductStock(product.aliexpressId);

            await prisma.product.update({
              where: { id: product.id },
              data: {
                stock,
                lastSyncAt: new Date(),
              },
            });

            updated++;
          } catch (error) {
            errors++;
            logger.error('Failed to sync product stock', {
              productId: product.id,
              aliexpressId: product.aliexpressId,
              error: error instanceof Error ? error.message : 'Unknown',
            });
          }
        }

        logger.info('Stock synchronization completed', {
          total: products.length,
          updated,
          errors,
        });
      } catch (error) {
        logger.error('Stock synchronization failed', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    },
  });

  // Synchronisation des tracking AliExpress (toutes les 6 heures)
  const trackingSyncJob = createTrackingSyncJob(prisma, {
    appKey: env.ALIEXPRESS_APP_KEY,
    appSecret: env.ALIEXPRESS_APP_SECRET,
    accessToken: env.ALIEXPRESS_ACCESS_TOKEN,
    trackingId: env.ALIEXPRESS_TRACKING_ID,
  });

  cronScheduler.registerTask({
    name: 'tracking-sync',
    schedule: '0 */6 * * *',  // Toutes les 6 heures
    handler: async () => {
      await trackingSyncJob.execute();
    },
  });

  // Nettoyage des données anciennes (quotidien à minuit)
  cronScheduler.registerTask({
    name: 'data-cleanup',
    schedule: env.CRON_DATA_CLEANUP,  // '0 0 * * *'
    handler: async () => {
      logger.info('Running data cleanup...');

      try {
        // Supprimer les événements webhook traités de plus de 30 jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedWebhooks = await prisma.webhookEvent.deleteMany({
          where: {
            status: 'completed',
            processedAt: { lt: thirtyDaysAgo },
          },
        });

        // Supprimer les logs d'audit de plus de 365 jours
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const deletedAuditLogs = await prisma.auditLog.deleteMany({
          where: {
            createdAt: { lt: oneYearAgo },
          },
        });

        logger.info('Data cleanup completed', {
          deletedWebhooks: deletedWebhooks.count,
          deletedAuditLogs: deletedAuditLogs.count,
        });
      } catch (error) {
        logger.error('Data cleanup failed', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    },
  });

  // Démarrer le scheduler
  cronScheduler.start();
  logger.info('Cron scheduler started', {
    tasks: cronScheduler.getTaskNames(),
  });

  // ==========================================================================
  // 12. Start HTTP Server
  // ==========================================================================
  const server = app.listen(env.PORT, () => {
    logger.info('========================================');
    logger.info(`Server listening on port ${env.PORT}`);
    logger.info('========================================');
    logger.info('Available endpoints:');
    logger.info('  - GET  /health');
    logger.info('  - GET  /ready');
    logger.info('  - GET  /api/health/detailed');
    logger.info('  - POST /webhooks/hyp');
    logger.info('  - GET  /webhooks/hyp/success');
    logger.info('  - GET  /webhooks/hyp/error');
    logger.info('  - GET  /api/aliexpress/authorize');
    logger.info('  - GET  /api/aliexpress/callback');
    logger.info('  - GET  /api/aliexpress/status');
    logger.info('  - GET  /api/v1/products');
    logger.info('========================================');
  });

  // ==========================================================================
  // 13. Graceful Shutdown Handler
  // ==========================================================================
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // 1. Arrêter le scheduler cron
    cronScheduler.stop();
    logger.info('Cron scheduler stopped');

    // 2. Fermer le serveur HTTP (stop accepting new connections)
    server.close(async () => {
      logger.info('HTTP server closed');

      // 3. Arrêter les workers
      await hypPaymentWorker.close();
      logger.info('Hyp payment worker stopped');

      await fulfillmentWorker.close();
      logger.info('Fulfillment worker stopped');

      // 4. Fermer la queue de messages
      await messageQueue.close();
      logger.info('Message queue closed');

      // 5. Fermer Redis
      await redisConnection.quit();
      logger.info('Redis connection closed');

      // 6. Fermer Prisma
      await prisma.$disconnect();
      logger.info('Prisma disconnected');

      logger.info('========================================');
      logger.info('Graceful shutdown complete');
      logger.info('========================================');
      process.exit(0);
    });

    // Timeout de sécurité (30 secondes)
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  // Enregistrer les handlers de signaux
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handlers d'erreurs non gérées
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      promise: String(promise),
    });
  });

  // Retourner la fonction de shutdown pour les tests
  return {
    shutdown: () => gracefulShutdown('MANUAL'),
  };
}

// ============================================================================
// Entry Point
// ============================================================================

// Démarrer l'application si ce fichier est exécuté directement
bootstrap().catch((error) => {
  console.error('========================================');
  console.error('FATAL: Failed to start application');
  console.error('========================================');
  console.error(error);
  process.exit(1);
});
