// ============================================================================
// Automated Product Import Use Case
// ============================================================================
// Orchestrates the complete automated product import workflow:
// 1. Search products by keywords/categories on AliExpress
// 2. Apply product scoring and filtering (65+ threshold)
// 3. Generate luxury translations with brand-safety guardrails
// 4. Store products with all locale translations
// 5. Support scheduled imports via BullMQ jobs
// ============================================================================

import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { AliExpressAdapter, AliExpressConfig } from '@infrastructure/adapters/outbound/external-apis/aliexpress.adapter.js';
import { OpenAIAdapter, OpenAIConfig } from '@infrastructure/adapters/outbound/external-apis/openai.adapter.js';
import { SyncAliExpressProductsUseCase, SyncConfig, SyncResult } from './sync-aliexpress-products.use-case.js';
import { logger } from '@shared/utils/logger.js';
import Redis from 'ioredis';

// ============================================================================
// Types
// ============================================================================

export interface ImportJobConfig {
  jobId: string;
  name: string;
  searchParams: {
    keywords: string[];
    categoryIds?: string[];
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
  };
  syncConfig: SyncConfig;
  schedule?: {
    cron: string; // e.g., "0 2 * * *" for daily at 2 AM
    timezone?: string;
  };
  maxProducts?: number;
  notifyOnComplete?: boolean;
}

export interface ImportJobResult {
  jobId: string;
  jobName: string;
  status: 'completed' | 'partial' | 'failed';
  syncResult: SyncResult;
  startedAt: Date;
  completedAt: Date;
  nextScheduledRun?: Date;
}

export interface ImportProgress {
  jobId: string;
  phase: 'searching' | 'scoring' | 'translating' | 'storing';
  currentStep: number;
  totalSteps: number;
  message: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  targetCountry: 'FR',
  locales: ['fr', 'en', 'es', 'it', 'de'],
  pricingStrategy: {
    markupMultiplier: 2.5, // 2.5x cost
    minimumMargin: 0.50,   // 50% minimum margin
  },
  maxProductsPerBatch: 10,
  dryRun: false,
};

const DEFAULT_COSMETIC_KEYWORDS = [
  'skincare serum',
  'face cream luxury',
  'makeup brush set',
  'lipstick matte',
  'eye shadow palette',
  'facial cleanser',
  'moisturizer cream',
  'anti aging serum', // Will be filtered by our guardrails
  'foundation makeup',
  'mascara waterproof',
];

// ============================================================================
// Automated Import Use Case
// ============================================================================

export class AutomatedProductImportUseCase {
  private readonly queue: Queue;
  private worker: Worker | null = null;
  private readonly prisma: PrismaClient;
  private readonly aliexpressAdapter: AliExpressAdapter;
  private readonly openaiAdapter: OpenAIAdapter;
  private readonly syncUseCase: SyncAliExpressProductsUseCase;

  constructor(
    redisConnection: Redis,
    prisma: PrismaClient,
    aliexpressConfig: AliExpressConfig,
    openaiConfig: OpenAIConfig
  ) {
    this.prisma = prisma;
    this.aliexpressAdapter = new AliExpressAdapter(aliexpressConfig);
    this.openaiAdapter = new OpenAIAdapter(openaiConfig);
    this.syncUseCase = new SyncAliExpressProductsUseCase(
      this.aliexpressAdapter,
      this.openaiAdapter,
      prisma
    );

    // Initialize BullMQ queue
    this.queue = new Queue('product-import', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute initial delay
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 50, // Keep last 50 failed jobs
        },
      },
    });
  }

  // ============================================================================
  // Manual Import
  // ============================================================================

  /**
   * Execute a one-time import from AliExpress
   */
  async executeImport(
    productIds: string[],
    config: Partial<SyncConfig> = {}
  ): Promise<SyncResult> {
    const fullConfig: SyncConfig = {
      ...DEFAULT_SYNC_CONFIG,
      ...config,
    };

    logger.info('Starting manual product import', {
      productCount: productIds.length,
      config: fullConfig,
    });

    const result = await this.syncUseCase.execute(productIds, fullConfig);

    logger.info('Manual import completed', {
      imported: result.imported.length,
      quarantined: result.quarantined.length,
      rejected: result.rejected.length,
      errors: result.errors.length,
    });

    return result;
  }

  /**
   * Search and import products by keywords
   */
  async searchAndImport(
    keywords: string[],
    options: {
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      maxProducts?: number;
      config?: Partial<SyncConfig>;
    } = {}
  ): Promise<SyncResult> {
    const allProductIds: string[] = [];
    const maxProducts = options.maxProducts ?? 50;

    // Search for products using each keyword
    for (const keyword of keywords) {
      if (allProductIds.length >= maxProducts) break;

      try {
        const searchResult = await this.aliexpressAdapter.searchProductsDetailed({
          keywords: keyword,
          categoryId: options.categoryId,
          minPrice: options.minPrice,
          maxPrice: options.maxPrice,
          minRating: options.minRating ?? 4.0,
          pageSize: Math.min(50, maxProducts - allProductIds.length),
        });

        const newIds = searchResult.products
          .map(p => p.productId)
          .filter(id => !allProductIds.includes(id));

        allProductIds.push(...newIds);

        logger.info(`Found ${newIds.length} products for keyword: ${keyword}`);
      } catch (error) {
        logger.error(`Error searching for keyword: ${keyword}`, { error });
      }
    }

    if (allProductIds.length === 0) {
      return {
        success: false,
        imported: [],
        quarantined: [],
        rejected: [],
        errors: [{ aliexpressId: '', stage: 'fetch', message: 'No products found' }],
        stats: {
          totalProcessed: 0,
          importedCount: 0,
          quarantinedCount: 0,
          rejectedCount: 0,
          errorCount: 1,
          averageScore: 0,
          processingTimeMs: 0,
        },
      };
    }

    // Import found products
    return this.executeImport(allProductIds.slice(0, maxProducts), options.config);
  }

  // ============================================================================
  // Scheduled Import Jobs
  // ============================================================================

  /**
   * Schedule a recurring import job
   */
  async scheduleImportJob(config: ImportJobConfig): Promise<string> {
    const jobData = {
      ...config,
      createdAt: new Date().toISOString(),
    };

    if (config.schedule) {
      // Repeatable job with cron schedule
      await this.queue.add(config.jobId, jobData, {
        repeat: {
          pattern: config.schedule.cron,
          tz: config.schedule.timezone ?? 'Europe/Paris',
        },
        jobId: config.jobId,
      });

      logger.info('Scheduled recurring import job', {
        jobId: config.jobId,
        cron: config.schedule.cron,
      });
    } else {
      // One-time job
      await this.queue.add(config.jobId, jobData);

      logger.info('Added one-time import job', { jobId: config.jobId });
    }

    return config.jobId;
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const repeatableJobs = await this.queue.getRepeatableJobs();
      const job = repeatableJobs.find(j => j.id === jobId || j.key.includes(jobId));

      if (job) {
        await this.queue.removeRepeatableByKey(job.key);
        logger.info('Cancelled repeatable job', { jobId });
        return true;
      }

      // Try to remove as regular job
      const regularJob = await this.queue.getJob(jobId);
      if (regularJob) {
        await regularJob.remove();
        logger.info('Removed regular job', { jobId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error cancelling job', { jobId, error });
      return false;
    }
  }

  /**
   * Get status of all import jobs
   */
  async getJobsStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    scheduledJobs: Array<{ jobId: string; nextRun: Date | null; pattern: string }>;
  }> {
    const [waiting, active, completed, failed, repeatableJobs] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getRepeatableJobs(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      scheduledJobs: repeatableJobs.map(job => ({
        jobId: job.id ?? job.key,
        nextRun: job.next ? new Date(job.next) : null,
        pattern: job.pattern,
      })),
    };
  }

  // ============================================================================
  // Worker Management
  // ============================================================================

  /**
   * Start the background worker
   */
  startWorker(redisConnection: Redis): void {
    if (this.worker) {
      logger.warn('Worker already running');
      return;
    }

    this.worker = new Worker(
      'product-import',
      async (job: Job<ImportJobConfig>) => {
        return this.processImportJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 1, // Process one job at a time
      }
    );

    this.worker.on('completed', (job, result: ImportJobResult) => {
      logger.info('Import job completed', {
        jobId: job.id,
        imported: result.syncResult.stats.importedCount,
        quarantined: result.syncResult.stats.quarantinedCount,
        rejected: result.syncResult.stats.rejectedCount,
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('Import job failed', {
        jobId: job?.id,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error', { error });
    });

    logger.info('Import worker started');
  }

  /**
   * Stop the background worker
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('Import worker stopped');
    }
  }

  // ============================================================================
  // Job Processing
  // ============================================================================

  private async processImportJob(job: Job<ImportJobConfig>): Promise<ImportJobResult> {
    const config = job.data;
    const startedAt = new Date();

    logger.info('Processing import job', {
      jobId: config.jobId,
      name: config.name,
      keywords: config.searchParams.keywords,
    });

    await job.updateProgress({
      jobId: config.jobId,
      phase: 'searching',
      currentStep: 1,
      totalSteps: 4,
      message: 'Searching for products on AliExpress...',
    } as ImportProgress);

    // Search and import products
    const syncResult = await this.searchAndImport(
      config.searchParams.keywords,
      {
        categoryId: config.searchParams.categoryIds?.[0],
        minPrice: config.searchParams.minPrice,
        maxPrice: config.searchParams.maxPrice,
        minRating: config.searchParams.minRating,
        maxProducts: config.maxProducts ?? 50,
        config: config.syncConfig,
      }
    );

    const completedAt = new Date();

    // Save import history
    await this.saveImportHistory(config, syncResult, startedAt, completedAt);

    // Determine status
    let status: 'completed' | 'partial' | 'failed';
    if (syncResult.errors.length === 0 && syncResult.imported.length > 0) {
      status = 'completed';
    } else if (syncResult.imported.length > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }

    const result: ImportJobResult = {
      jobId: config.jobId,
      jobName: config.name,
      status,
      syncResult,
      startedAt,
      completedAt,
    };

    // Notify on completion if configured
    if (config.notifyOnComplete) {
      await this.sendCompletionNotification(result);
    }

    return result;
  }

  private async saveImportHistory(
    config: ImportJobConfig,
    result: SyncResult,
    startedAt: Date,
    completedAt: Date
  ): Promise<void> {
    try {
      await this.prisma.importHistory.create({
        data: {
          jobId: config.jobId,
          jobName: config.name,
          keywords: config.searchParams.keywords,
          totalProcessed: result.stats.totalProcessed,
          importedCount: result.stats.importedCount,
          quarantinedCount: result.stats.quarantinedCount,
          rejectedCount: result.stats.rejectedCount,
          errorCount: result.stats.errorCount,
          averageScore: result.stats.averageScore,
          processingTimeMs: result.stats.processingTimeMs,
          importedProducts: result.imported.map(p => p.aliexpressId),
          errors: result.errors.map(e => ({
            productId: e.aliexpressId,
            stage: e.stage,
            message: e.message,
          })),
          startedAt,
          completedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to save import history', { error });
    }
  }

  private async sendCompletionNotification(result: ImportJobResult): Promise<void> {
    // Placeholder for notification logic (email, Slack, webhook, etc.)
    logger.info('Import notification sent', {
      jobId: result.jobId,
      status: result.status,
      imported: result.syncResult.stats.importedCount,
    });
  }

  // ============================================================================
  // Preset Import Configurations
  // ============================================================================

  /**
   * Get preset import configurations for common cosmetic categories
   */
  static getPresetConfigs(): Record<string, Omit<ImportJobConfig, 'jobId'>> {
    return {
      'skincare-premium': {
        name: 'Premium Skincare Import',
        searchParams: {
          keywords: ['luxury face serum', 'premium moisturizer', 'vitamin c serum', 'hyaluronic acid'],
          minPrice: 5,
          maxPrice: 30,
          minRating: 4.5,
        },
        syncConfig: {
          ...DEFAULT_SYNC_CONFIG,
          pricingStrategy: {
            markupMultiplier: 3.0,
            minimumMargin: 0.55,
          },
        },
        maxProducts: 30,
        schedule: {
          cron: '0 2 * * 1', // Every Monday at 2 AM
          timezone: 'Europe/Paris',
        },
      },
      'makeup-trending': {
        name: 'Trending Makeup Import',
        searchParams: {
          keywords: ['lipstick matte', 'eyeshadow palette', 'foundation liquid', 'mascara'],
          minPrice: 2,
          maxPrice: 20,
          minRating: 4.3,
        },
        syncConfig: {
          ...DEFAULT_SYNC_CONFIG,
          pricingStrategy: {
            markupMultiplier: 2.8,
            minimumMargin: 0.50,
          },
        },
        maxProducts: 50,
        schedule: {
          cron: '0 3 * * 3', // Every Wednesday at 3 AM
          timezone: 'Europe/Paris',
        },
      },
      'beauty-tools': {
        name: 'Beauty Tools Import',
        searchParams: {
          keywords: ['makeup brush set', 'beauty blender', 'face roller', 'derma roller'],
          minPrice: 3,
          maxPrice: 25,
          minRating: 4.2,
        },
        syncConfig: {
          ...DEFAULT_SYNC_CONFIG,
          pricingStrategy: {
            markupMultiplier: 2.5,
            minimumMargin: 0.45,
          },
        },
        maxProducts: 40,
        schedule: {
          cron: '0 4 * * 5', // Every Friday at 4 AM
          timezone: 'Europe/Paris',
        },
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAutomatedImportUseCase(
  redisUrl: string,
  databaseUrl: string,
  aliexpressConfig: AliExpressConfig,
  openaiConfig: OpenAIConfig
): AutomatedProductImportUseCase {
  const redis = new Redis(redisUrl);
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  return new AutomatedProductImportUseCase(
    redis,
    prisma,
    aliexpressConfig,
    openaiConfig
  );
}
