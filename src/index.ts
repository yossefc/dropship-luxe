import { env } from '@infrastructure/config/env.js';
import { createLogger, AuditLogger } from '@infrastructure/config/logger.js';
import { PrismaAuditLogWriter } from '@infrastructure/audit/prisma-audit-log-writer.js';
import { prisma } from '@infrastructure/config/prisma.js';
import { createServer, setupErrorHandling } from '@infrastructure/http/server.js';
import { CronScheduler } from '@infrastructure/cron/scheduler.js';
import { BullMQAdapter } from '@infrastructure/messaging/bullmq.adapter.js';
import { StripeAdapter } from '@infrastructure/adapters/outbound/external-apis/stripe.adapter.js';
import { AliExpressAdapter } from '@infrastructure/adapters/outbound/external-apis/aliexpress.adapter.js';
import { createAliExpressOAuthService } from '@infrastructure/adapters/outbound/external-apis/aliexpress-oauth.service.js';
import { OpenAIAdapter } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { createStripeWebhookRouter } from '@infrastructure/adapters/inbound/webhooks/stripe.webhook.js';
import { createHypAdapter } from '@infrastructure/adapters/outbound/payment/hyp.adapter.js';
import { createHypWebhookRouter } from '@infrastructure/http/controllers/hyp-webhook.controller.js';
import Redis from 'ioredis';

async function bootstrap(): Promise<void> {
  const logger = createLogger({
    level: env.LOG_LEVEL,
    logsDir: env.LOGS_DIR,
    retentionDays: env.LOG_RETENTION_DAYS,
  });

  const auditLogger = new AuditLogger(logger, new PrismaAuditLogWriter(prisma));
  const aliexpressOAuthService = createAliExpressOAuthService(prisma);

  logger.info('Starting Dropship Luxe API', {
    environment: env.NODE_ENV,
    port: env.PORT,
  });

  const messageQueue = new BullMQAdapter(
    {
      redisHost: env.REDIS_HOST,
      redisPort: env.REDIS_PORT,
      ...(env.REDIS_PASSWORD != null ? { redisPassword: env.REDIS_PASSWORD } : {}),
    },
    logger
  );

  const stripeAdapter = new StripeAdapter({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  });

  const aliexpressAdapter = new AliExpressAdapter({
    appKey: env.ALIEXPRESS_APP_KEY,
    appSecret: env.ALIEXPRESS_APP_SECRET,
    accessToken: env.ALIEXPRESS_ACCESS_TOKEN,
    trackingId: env.ALIEXPRESS_TRACKING_ID,
    getAccessToken: async () => aliexpressOAuthService.getValidAccessToken(),
  });

  const openaiAdapter = new OpenAIAdapter({
    apiKey: env.OPENAI_API_KEY,
  });

  const app = createServer(logger, auditLogger, prisma);

  const stripeWebhookRouter = createStripeWebhookRouter({
    paymentGateway: stripeAdapter,
    orderRepository: null as never,
    messageQueue,
    logger,
    auditLogger,
  });

  app.use('/webhooks', stripeWebhookRouter);

  // ============================================================================
  // Hyp (YaadPay) Payment Gateway Integration
  // ============================================================================
  try {
    const hypAdapter = createHypAdapter(logger);
    const redisConnection = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      tls: env.REDIS_HOST.includes('upstash') ? {} : undefined,
      maxRetriesPerRequest: null,
    });

    const { router: hypWebhookRouter } = createHypWebhookRouter(
      hypAdapter,
      prisma,
      redisConnection,
      logger,
      auditLogger
    );

    app.use('/webhooks/hyp', hypWebhookRouter);
    logger.info('Hyp webhook routes mounted at /webhooks/hyp');
  } catch (error) {
    logger.warn('Hyp payment gateway not configured, skipping...', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  app.get('/api/v1/products', async (_req, res) => {
    res.json({
      success: true,
      data: [],
      message: 'Products endpoint - connect repository',
    });
  });

  setupErrorHandling(app, logger);

  const cronScheduler = new CronScheduler(logger);

  cronScheduler.registerTask({
    name: 'stock-sync',
    schedule: env.CRON_STOCK_SYNC,
    handler: async () => {
      logger.info('Running stock synchronization...');
    },
  });

  cronScheduler.registerTask({
    name: 'data-cleanup',
    schedule: env.CRON_DATA_CLEANUP,
    handler: async () => {
      logger.info('Running data cleanup...');
    },
  });

  cronScheduler.start();

  messageQueue.registerHandler('orders', async (data) => {
    logger.info('Processing order', { data });
    return { success: true };
  });

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    cronScheduler.stop();
    logger.info('Cron scheduler stopped');

    server.close(async () => {
      logger.info('HTTP server closed');

      await messageQueue.close();
      logger.info('Message queue closed');

      await prisma.$disconnect();
      logger.info('Prisma disconnected');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

export { aliexpressAdapter, openaiAdapter, stripeAdapter };

const aliexpressAdapter: AliExpressAdapter = null as never;
const openaiAdapter: OpenAIAdapter = null as never;
const stripeAdapter: StripeAdapter = null as never;
