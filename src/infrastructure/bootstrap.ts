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
import { AliExpressDSAdapter } from '@infrastructure/adapters/outbound/external-apis/aliexpress-ds.adapter.js';
import { OpenAIAdapter } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { createAliExpressOAuthService } from '@infrastructure/adapters/outbound/external-apis/aliexpress-oauth.service.js';

// Value Objects
import { Money } from '@domain/value-objects/money.js';
import { Email } from '@domain/value-objects/email.js';
import { Address } from '@domain/value-objects/address.js';
import { Currency } from '@shared/types/index.js';

// Controllers & Routers
import { createHypWebhookRouter, HypWebhookController, PaymentProcessingJob } from '@infrastructure/http/controllers/hyp-webhook.controller.js';
import { createAliExpressOAuthRouter } from '@infrastructure/http/controllers/aliexpress-oauth.controller.js';

// Jobs & Workers
import { TrackingSyncJob, createTrackingSyncJob } from '@infrastructure/jobs/tracking-sync.job.js';
import { ProductImportJob, createProductImportJob, ImportJobResult } from '@infrastructure/jobs/product-import.job.js';

// ============================================================================
// Types
// ============================================================================

interface SystemHealthStatus {
  database: { status: 'healthy' | 'unhealthy'; latencyMs?: number };
  redis: { status: 'healthy' | 'unhealthy'; latencyMs?: number };
  aliexpress: { status: 'healthy' | 'unhealthy' | 'unknown'; lastCheck?: string };
  openai: { status: 'healthy' | 'unhealthy' | 'unknown'; lastCheck?: string };
  hyp: { status: 'healthy' | 'configured' | 'unknown'; masof?: string };
}

interface AdminSettings {
  priceMultiplier: number;
  minProductScore: number;
  quarantineThreshold: number;
  autoImportEnabled: boolean;
}

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
  // Parse REDIS_URL if provided, otherwise use individual config
  let redisHost = env.REDIS_HOST;
  let redisPort = env.REDIS_PORT;
  let redisPassword: string | undefined = env.REDIS_PASSWORD;

  if (env.REDIS_URL) {
    try {
      const redisUrl = new URL(env.REDIS_URL);
      redisHost = redisUrl.hostname;
      redisPort = parseInt(redisUrl.port, 10) || 6379;
      redisPassword = redisUrl.password || undefined;
      logger.info('Using REDIS_URL for connection', { host: redisHost, port: redisPort });
    } catch (error) {
      logger.error('Failed to parse REDIS_URL, falling back to REDIS_HOST/PORT', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Connection options for BullMQ (shared configuration)
  const bullmqConnectionOptions = {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,  // Required for BullMQ
    enableReadyCheck: false,
    tls: env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,  // Enable TLS for rediss:// URLs
  };

  // Separate Redis connection for non-BullMQ operations
  const redisConnection = new Redis(bullmqConnectionOptions);

  redisConnection.on('connect', () => {
    logger.info('Redis connected', { host: redisHost, port: redisPort });
  });

  redisConnection.on('error', (error) => {
    logger.error('Redis connection error', { error: error.message });
  });

  // ==========================================================================
  // 3. Initialize Message Queue (BullMQ)
  // ==========================================================================
  const redisTls = env.REDIS_URL?.startsWith('rediss://') ?? false;
  const messageQueue = new BullMQAdapter(
    {
      redisHost,
      redisPort,
      ...(redisPassword != null ? { redisPassword } : {}),
      ...(redisTls ? { redisTls: true } : {}),
    },
    logger
  );

  logger.info('BullMQ message queue initialized');

  // ==========================================================================
  // 4. Initialize Adapters (Hyp, AliExpress, OpenAI) - All Optional
  // ==========================================================================

  // HYP ADAPTER - Optional until account is created
  let hypAdapter: HypAdapter | null = null;
  try {
    hypAdapter = createHypAdapter(logger);
    logger.info('Hyp (YaadPay) payment adapter initialized');
  } catch (error) {
    logger.warn('Hyp adapter not configured - payment features disabled', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // AliExpress OAuth Service (pour gestion des tokens)
  const aliexpressOAuthService = createAliExpressOAuthService(prisma);

  // AliExpress DS Adapter - Optional until API keys configured
  let aliexpressAdapter: AliExpressDSAdapter | null = null;
  if (env.ALIEXPRESS_APP_KEY && env.ALIEXPRESS_APP_SECRET) {
    aliexpressAdapter = new AliExpressDSAdapter({
      appKey: env.ALIEXPRESS_APP_KEY,
      appSecret: env.ALIEXPRESS_APP_SECRET,
      getAccessToken: async () => aliexpressOAuthService.getValidAccessToken(),
      trackingId: env.ALIEXPRESS_TRACKING_ID,
    });
    logger.info('AliExpress DS adapter initialized (with OAuth token refresh)');
  } else {
    logger.warn('AliExpress adapter not configured - import features disabled');
  }

  // OpenAI Adapter - Optional until API key configured
  let openaiAdapter: OpenAIAdapter | null = null;
  if (env.OPENAI_API_KEY) {
    openaiAdapter = new OpenAIAdapter({
      apiKey: env.OPENAI_API_KEY,
    });
    logger.info('OpenAI adapter initialized');
  } else {
    logger.warn('OpenAI adapter not configured - AI translation disabled');
  }

  // ==========================================================================
  // 5. Create Express Server
  // ==========================================================================
  const app = createServer(logger, auditLogger, prisma);

  // ==========================================================================
  // 6. Mount Hyp Webhook Routes (CRITICAL - Payment Processing)
  // ==========================================================================
  let hypWebhookController: HypWebhookController | null = null;

  if (hypAdapter) {
    const { router: hypWebhookRouter, controller } = createHypWebhookRouter(
      hypAdapter,
      prisma,
      bullmqConnectionOptions,
      logger,
      auditLogger
    );
    hypWebhookController = controller;

    // Hyp envoie les webhooks en URL-encoded, on doit parser correctement
    app.use('/webhooks/hyp', hypWebhookRouter);
    logger.info('Hyp webhook routes mounted at /webhooks/hyp');
  } else {
    logger.warn('Hyp webhook routes NOT mounted - payment processing disabled');
  }

  // ==========================================================================
  // 7. Additional Order Route with HypAdapter from bootstrap context
  // ==========================================================================
  // Note: AliExpress OAuth, Product, and Order routes are also mounted in server.ts
  // This route uses the hypAdapter variable from bootstrap for order creation
  app.post('/api/v1/orders', async (req, res) => {
    try {
      // Check if payment gateway is configured
      if (!hypAdapter) {
        res.status(503).json({
          success: false,
          error: 'Payment gateway not configured. Please contact support.',
        });
        return;
      }

      const {
        customer,
        shippingAddress,
        items,
        shippingMethod,
        shippingCost,
        subtotal,
        total,
        currency = 'EUR',
      } = req.body;

      // Validate required fields
      if (!customer?.email || !shippingAddress || !items?.length) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: customer, shippingAddress, items',
        });
        return;
      }

      logger.info('Creating new order', {
        email: customer.email,
        itemCount: items.length,
        total,
        currency,
      });

      // Generate order number
      const orderNumber = `DL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create or find customer
      let dbCustomer = await prisma.customer.findUnique({
        where: { email: customer.email },
      });

      if (!dbCustomer) {
        dbCustomer = await prisma.customer.create({
          data: {
            email: customer.email,
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            phone: customer.phone || null,
          },
        });
        logger.info('Created new customer', { customerId: dbCustomer.id });
      }

      // Calculate tax (20% TVA for France)
      const tax = subtotal * 0.20;

      // Create the order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: dbCustomer.id,
          customerEmail: customer.email,
          status: 'pending',
          paymentStatus: 'pending',
          subtotal,
          shippingCost,
          tax,
          total,
          currency,
          // Shipping address
          shippingFirstName: shippingAddress.firstName,
          shippingLastName: shippingAddress.lastName,
          shippingStreet: shippingAddress.street,
          shippingCity: shippingAddress.city,
          shippingPostalCode: shippingAddress.postalCode,
          shippingCountry: shippingAddress.country,
          shippingPhone: shippingAddress.phone || null,
          // Billing = Shipping for now
          billingFirstName: shippingAddress.firstName,
          billingLastName: shippingAddress.lastName,
          billingStreet: shippingAddress.street,
          billingCity: shippingAddress.city,
          billingPostalCode: shippingAddress.postalCode,
          billingCountry: shippingAddress.country,
          // Order items
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              variantName: item.variantName || null,
              productName: item.name || item.productName || 'Product',
              sku: item.sku || `SKU-${item.productId}`,
              quantity: item.quantity,
              unitPrice: item.price,
              supplierPrice: item.supplierPrice || item.price * 0.4, // Estimate supplier price
              currency,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      logger.info('Order created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      });

      // Generate Hyp payment link
      const paymentResult = await hypAdapter.createPaymentIntent({
        orderId: order.orderNumber,
        amount: Money.create(total, currency as Currency),
        customerEmail: Email.create(customer.email),
        customerId: dbCustomer.id,
        metadata: {
          orderDbId: order.id,
          customerName: `${customer.firstName} ${customer.lastName}`,
        },
      });

      // Update order with payment intent ID
      await prisma.order.update({
        where: { id: order.id },
        data: {
          hypTransactionId: paymentResult.id,
        },
      });

      logger.info('Payment link generated', {
        orderId: order.id,
        paymentIntentId: paymentResult.id,
      });

      // Return success with payment URL
      res.status(201).json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          currency: order.currency,
        },
        paymentUrl: paymentResult.clientSecret, // This is the Hyp redirect URL
      });

    } catch (error) {
      logger.error('Failed to create order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create order. Please try again.',
      });
    }
  });

  // ==========================================================================
  // GET /api/v1/orders/:orderNumber - Get Order Status
  // ==========================================================================
  app.get('/api/v1/orders/:orderNumber', async (req, res) => {
    try {
      const { orderNumber } = req.params;

      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: true,
          supplierOrders: true,
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found',
        });
        return;
      }

      res.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          currency: order.currency,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          items: order.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            variantName: item.variantName,
          })),
          tracking: order.supplierOrders
            .filter(so => so.trackingNumber)
            .map(so => ({
              trackingNumber: so.trackingNumber,
              carrier: so.carrier,
              status: so.status,
            })),
        },
      });

    } catch (error) {
      logger.error('Failed to fetch order', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch order',
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
  // 8b. Admin API Routes (Protected)
  // ==========================================================================

  // Simple admin auth middleware
  const adminAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'dropship-luxe-admin-2024';

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Initialize product import job
  const productImportJob = createProductImportJob(prisma);
  let lastImportResult: ImportJobResult | null = null;

  // Admin Settings (in-memory, should be persisted in production)
  let adminSettings: AdminSettings = {
    priceMultiplier: 2.5,
    minProductScore: 65,
    quarantineThreshold: 50,
    autoImportEnabled: false,
  };

  // GET /api/admin/health - System health status
  app.get('/api/admin/health', adminAuth, async (_req, res) => {
    const health: SystemHealthStatus = {
      database: { status: 'unhealthy' },
      redis: { status: 'unhealthy' },
      aliexpress: { status: 'unknown' },
      openai: { status: 'unknown' },
      hyp: { status: hypAdapter ? 'configured' : 'unknown', masof: env.HYP_MASOF ? env.HYP_MASOF.substring(0, 4) + '****' : 'N/A' },
    };

    // Database check
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      health.database = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      health.database = { status: 'unhealthy' };
    }

    // Redis check
    try {
      const start = Date.now();
      await redisConnection.ping();
      health.redis = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      health.redis = { status: 'unhealthy' };
    }

    // AliExpress check (based on last credential status)
    try {
      const credential = await prisma.aliExpressCredential.findFirst({
        where: { isActive: true },
      });
      if (credential && credential.expiresAt && credential.expiresAt > new Date()) {
        health.aliexpress = { status: 'healthy', lastCheck: credential.lastUsedAt?.toISOString() };
      } else {
        health.aliexpress = { status: 'unhealthy', lastCheck: credential?.lastUsedAt?.toISOString() };
      }
    } catch {
      health.aliexpress = { status: 'unknown' };
    }

    // OpenAI check (assume healthy if adapter is configured)
    health.openai = {
      status: openaiAdapter ? 'healthy' : 'unknown',
      lastCheck: new Date().toISOString(),
    };

    res.json(health);
  });

  // GET /api/admin/imports - Get import history
  app.get('/api/admin/imports', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const imports = await prisma.importHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      res.json({
        imports,
        lastResult: lastImportResult,
      });
    } catch (error) {
      logger.error('Failed to fetch import history', { error });
      res.status(500).json({ error: 'Failed to fetch imports' });
    }
  });

  // POST /api/admin/imports/run - Trigger manual import
  app.post('/api/admin/imports/run', adminAuth, async (req, res) => {
    try {
      const { feedName, maxProducts, dryRun } = req.body;

      logger.info('Manual import triggered', { feedName, maxProducts, dryRun });

      // Run import asynchronously
      res.json({ status: 'started', message: 'Import job started' });

      lastImportResult = await productImportJob.execute({
        feedName: feedName ?? 'DS_France_topsellers',
        maxProducts: maxProducts ?? 20,
        minScore: adminSettings.minProductScore,
        quarantineThreshold: adminSettings.quarantineThreshold,
        priceMultiplier: adminSettings.priceMultiplier,
        dryRun: dryRun ?? false,
      });

      logger.info('Manual import completed', { result: lastImportResult });
    } catch (error) {
      logger.error('Manual import failed', { error });
    }
  });

  // GET /api/admin/quarantine - Get quarantined products
  app.get('/api/admin/quarantine', adminAuth, async (req, res) => {
    try {
      const status = req.query.status as string;
      const quarantined = await prisma.productQuarantine.findMany({
        where: status ? { status: status as any } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({ products: quarantined });
    } catch (error) {
      logger.error('Failed to fetch quarantine', { error });
      res.status(500).json({ error: 'Failed to fetch quarantine' });
    }
  });

  // GET /api/admin/orders - Get orders with payment and supplier status
  app.get('/api/admin/orders', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          items: true,
          supplierOrders: true,
        },
      });

      const formattedOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        total: order.total,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        supplierStatus: order.supplierOrders.length > 0
          ? order.supplierOrders.every(s => s.status === 'delivered')
            ? 'delivered'
            : order.supplierOrders.some(s => s.status === 'shipped')
            ? 'shipped'
            : order.supplierOrders.some(s => s.status === 'submitted')
            ? 'processing'
            : 'pending'
          : 'none',
        trackingNumbers: order.supplierOrders
          .filter(s => s.trackingNumber)
          .map(s => s.trackingNumber),
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      }));

      res.json({ orders: formattedOrders });
    } catch (error) {
      logger.error('Failed to fetch orders', { error });
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // GET /api/admin/settings - Get admin settings
  app.get('/api/admin/settings', adminAuth, (_req, res) => {
    res.json(adminSettings);
  });

  // PUT /api/admin/settings - Update admin settings
  app.put('/api/admin/settings', adminAuth, async (req, res) => {
    try {
      const { priceMultiplier, minProductScore, quarantineThreshold, autoImportEnabled } = req.body;

      if (priceMultiplier !== undefined) adminSettings.priceMultiplier = parseFloat(priceMultiplier);
      if (minProductScore !== undefined) adminSettings.minProductScore = parseInt(minProductScore);
      if (quarantineThreshold !== undefined) adminSettings.quarantineThreshold = parseInt(quarantineThreshold);
      if (autoImportEnabled !== undefined) adminSettings.autoImportEnabled = Boolean(autoImportEnabled);

      logger.info('Admin settings updated', adminSettings as unknown as Record<string, unknown>);

      res.json(adminSettings);
    } catch (error) {
      logger.error('Failed to update settings', { error });
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // POST /api/admin/prices/recalculate - Recalculate all prices with new multiplier
  app.post('/api/admin/prices/recalculate', adminAuth, async (req, res) => {
    try {
      const { multiplier } = req.body;
      const priceMultiplier = parseFloat(multiplier ?? adminSettings.priceMultiplier);

      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, costPrice: true },
      });

      let updated = 0;
      for (const product of products) {
        const newPrice = product.costPrice.toNumber() * priceMultiplier;
        await prisma.product.update({
          where: { id: product.id },
          data: { sellingPrice: newPrice },
        });
        updated++;
      }

      adminSettings.priceMultiplier = priceMultiplier;

      logger.info('Prices recalculated', { multiplier: priceMultiplier, updated });

      res.json({ success: true, updated, multiplier: priceMultiplier });
    } catch (error) {
      logger.error('Price recalculation failed', { error });
      res.status(500).json({ error: 'Price recalculation failed' });
    }
  });

  // GET /api/admin/stats - Dashboard statistics
  app.get('/api/admin/stats', adminAuth, async (_req, res) => {
    try {
      const [
        totalProducts,
        activeProducts,
        quarantinedCount,
        totalOrders,
        pendingOrders,
        recentRevenue,
      ] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.productQuarantine.count({ where: { status: 'pending' } }),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'pending' } }),
        prisma.order.aggregate({
          where: {
            paymentStatus: 'succeeded',
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          _sum: { total: true },
        }),
      ]);

      res.json({
        products: {
          total: totalProducts,
          active: activeProducts,
          quarantined: quarantinedCount,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
        },
        revenue: {
          last30Days: recentRevenue._sum.total ?? 0,
        },
        settings: adminSettings,
      });
    } catch (error) {
      logger.error('Failed to fetch stats', { error });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  logger.info('Admin API routes mounted at /api/admin/*');

  // ==========================================================================
  // 9. Setup Error Handling
  // ==========================================================================
  setupErrorHandling(app, logger);

  // ==========================================================================
  // 10. Initialize Workers (BullMQ)
  // ==========================================================================

  // Worker pour traiter les paiements Hyp (only if Hyp is configured)
  let hypPaymentWorker: Worker<PaymentProcessingJob> | null = null;

  if (hypWebhookController) {
    hypPaymentWorker = new Worker<PaymentProcessingJob>(
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
            await hypWebhookController!.processSuccessfulPayment(job.data);
            break;

          case 'payment.failed':
          case 'payment.canceled':
            await hypWebhookController!.processFailedPayment(job.data);
            break;

          default:
            logger.warn('Unhandled payment event type', { eventType });
        }

        return { processed: true, eventType };
      },
      {
        connection: bullmqConnectionOptions,
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
  } else {
    logger.warn('Hyp payment worker NOT started - payment processing disabled');
  }

  // Worker pour le fulfillment AliExpress (only if AliExpress is configured)
  let fulfillmentWorker: Worker | null = null;

  if (aliexpressAdapter) {
    const aliExpressAdapterRef = aliexpressAdapter; // Capture for closure
    fulfillmentWorker = new Worker(
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
            const sanitizedFirstName = order.shippingFirstName
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();
            const sanitizedLastName = order.shippingLastName
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();
            const sanitizedStreet = order.shippingStreet
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();
            const sanitizedCity = order.shippingCity
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();
            const sanitizedPostalCode = order.shippingPostalCode.replace(/\s/g, '');
            const sanitizedCountry = order.shippingCountry.toUpperCase();
            const sanitizedPhone = order.shippingPhone ?? '';

            // Create Address value object for supplier
            const shippingAddress = Address.create({
              firstName: sanitizedFirstName,
              lastName: sanitizedLastName,
              street: sanitizedStreet,
              city: sanitizedCity,
              postalCode: sanitizedPostalCode,
              country: sanitizedCountry,
              ...(sanitizedPhone ? { phone: sanitizedPhone } : {}),
            });

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
                shippingName: `${sanitizedFirstName} ${sanitizedLastName}`,
                shippingAddress: sanitizedStreet,
                shippingCity: sanitizedCity,
                shippingPostalCode: sanitizedPostalCode,
                shippingCountry: sanitizedCountry,
                shippingPhone: sanitizedPhone,
                status: 'pending',
              },
            });

            // Soumettre à AliExpress
            const result = await aliExpressAdapterRef.placeOrder(
              [
                {
                  productId: item.product.aliexpressId,
                  variantId: item.variantId ?? undefined,
                  quantity: item.quantity,
                },
              ],
              shippingAddress
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
        connection: bullmqConnectionOptions,
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
  } else {
    logger.warn('Order fulfillment worker NOT started - AliExpress not configured');
  }

  // ==========================================================================
  // 11. Initialize Cron Scheduler
  // ==========================================================================
  const cronScheduler = new CronScheduler(logger);

  // Synchronisation des stocks AliExpress (toutes les 6 heures) - only if AliExpress configured
  if (aliexpressAdapter) {
    const aliExpressAdapterRef = aliexpressAdapter; // Capture for closure
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
              const stock = await aliExpressAdapterRef.getProductStock(product.aliexpressId);

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
  } else {
    logger.warn('Stock sync cron task NOT registered - AliExpress not configured');
  }

  // Synchronisation des tracking AliExpress (toutes les 6 heures) - only if AliExpress configured
  if (env.ALIEXPRESS_APP_KEY && env.ALIEXPRESS_APP_SECRET) {
    const trackingSyncJob = createTrackingSyncJob(prisma, {
      appKey: env.ALIEXPRESS_APP_KEY,
      appSecret: env.ALIEXPRESS_APP_SECRET,
      getAccessToken: async () => aliexpressOAuthService.getValidAccessToken(),
      trackingId: env.ALIEXPRESS_TRACKING_ID,
    });

    cronScheduler.registerTask({
      name: 'tracking-sync',
      schedule: '0 */6 * * *',  // Toutes les 6 heures
      handler: async () => {
        await trackingSyncJob.execute();
      },
    });
  } else {
    logger.warn('Tracking sync cron task NOT registered - AliExpress not configured');
  }

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
  const server = app.listen(env.PORT, async () => {
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
    logger.info('  - POST /api/v1/orders');
    logger.info('  - GET  /api/v1/orders/:orderNumber');
    logger.info('Admin API:');
    logger.info('  - GET  /api/admin/health');
    logger.info('  - GET  /api/admin/imports');
    logger.info('  - POST /api/admin/imports/run');
    logger.info('  - GET  /api/admin/quarantine');
    logger.info('  - GET  /api/admin/orders');
    logger.info('  - GET  /api/admin/settings');
    logger.info('  - PUT  /api/admin/settings');
    logger.info('  - POST /api/admin/prices/recalculate');
    logger.info('  - GET  /api/admin/stats');
    logger.info('========================================');

    // ==========================================================================
    // 12b. Initial AliExpress Product Sync (Startup)
    // ==========================================================================
    // Check if database has products, if not, trigger initial import
    try {
      const productCount = await prisma.product.count();

      if (productCount === 0) {
        logger.info('========================================');
        logger.info('No products found - Starting initial AliExpress sync...');
        logger.info('========================================');

        // Check if AliExpress OAuth is configured
        const credential = await prisma.aliExpressCredential.findFirst({
          where: { isActive: true },
        });

        if (credential && credential.expiresAt && credential.expiresAt > new Date()) {
          // Run initial import with dry-run first for safety
          logger.info('Running initial product import (dry-run first)...');

          const dryRunResult = await productImportJob.execute({
            feedName: 'DS_France_topsellers',
            maxProducts: 10,
            minScore: adminSettings.minProductScore,
            quarantineThreshold: adminSettings.quarantineThreshold,
            priceMultiplier: adminSettings.priceMultiplier,
            dryRun: true,
          });

          logger.info('Dry-run completed', {
            totalProcessed: dryRunResult.totalProcessed,
            wouldImport: dryRunResult.importedCount,
            wouldQuarantine: dryRunResult.quarantinedCount,
            wouldReject: dryRunResult.rejectedCount,
          });

          // If dry-run looks good, run actual import
          if (dryRunResult.importedCount > 0 || dryRunResult.quarantinedCount > 0) {
            logger.info('Dry-run successful - Running actual import...');

            lastImportResult = await productImportJob.execute({
              feedName: 'DS_France_topsellers',
              maxProducts: 10,
              minScore: adminSettings.minProductScore,
              quarantineThreshold: adminSettings.quarantineThreshold,
              priceMultiplier: adminSettings.priceMultiplier,
              dryRun: false,
            });

            logger.info('========================================');
            logger.info('Initial import completed!');
            logger.info(`  Imported: ${lastImportResult.importedCount} products`);
            logger.info(`  Quarantined: ${lastImportResult.quarantinedCount} products`);
            logger.info(`  Rejected: ${lastImportResult.rejectedCount} products`);
            logger.info(`  Errors: ${lastImportResult.errorCount}`);
            logger.info('========================================');
          } else {
            logger.warn('Dry-run found no products to import - check AliExpress API connection');
          }
        } else {
          logger.warn('========================================');
          logger.warn('AliExpress OAuth not configured or expired!');
          logger.warn('Visit /api/aliexpress/authorize to set up OAuth');
          logger.warn('========================================');
        }
      } else {
        logger.info(`Database contains ${productCount} products - skipping initial sync`);
      }
    } catch (error) {
      logger.error('Initial sync failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't crash the server on initial sync failure
    }
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

      // 3. Arrêter les workers (if they were started)
      if (hypPaymentWorker) {
        await hypPaymentWorker.close();
        logger.info('Hyp payment worker stopped');
      }

      if (fulfillmentWorker) {
        await fulfillmentWorker.close();
        logger.info('Fulfillment worker stopped');
      }

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
// Note: bootstrap() is called from src/index.ts - do NOT call it here
// to avoid starting the server twice
