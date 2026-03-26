import { Queue, Worker, Job, QueueEvents, type ConnectionOptions, type JobsOptions } from 'bullmq';
import {
  MessageQueue,
  QueueJob,
  QueueOptions,
  JobHandler,
} from '@domain/ports/outbound/message-queue.port.js';
import { Logger } from '@infrastructure/config/logger.js';

export interface BullMQConfig {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisTls?: boolean;  // Enable TLS for secure connections (e.g., Upstash)
  defaultJobOptions?: QueueOptions;
}

export class BullMQAdapter implements MessageQueue {
  private readonly connection: ConnectionOptions;
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly queueEvents: Map<string, QueueEvents> = new Map();
  private readonly logger: Logger;
  private readonly defaultOptions: QueueOptions;

  constructor(config: BullMQConfig, logger: Logger) {
    this.connection = {
      host: config.redisHost,
      port: config.redisPort,
      maxRetriesPerRequest: null,
      ...(config.redisPassword != null ? { password: config.redisPassword } : {}),
      ...(config.redisTls ? { tls: {} } : {}),
    };

    this.logger = logger;
    this.defaultOptions = config.defaultJobOptions ?? {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
    };
  }

  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    if (queue == null) {
      queue = new Queue(queueName, {
        connection: this.connection,
        defaultJobOptions: {
          ...(this.defaultOptions.attempts != null ? { attempts: this.defaultOptions.attempts } : {}),
          ...(this.defaultOptions.removeOnComplete != null ? { removeOnComplete: this.defaultOptions.removeOnComplete } : {}),
          ...(this.defaultOptions.removeOnFail != null ? { removeOnFail: this.defaultOptions.removeOnFail } : {}),
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });
      this.queues.set(queueName, queue);

      const events = new QueueEvents(queueName, { connection: this.connection });
      this.queueEvents.set(queueName, events);

      events.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(`Job ${jobId} failed in queue ${queueName}`, { failedReason });
      });

      events.on('completed', ({ jobId }) => {
        this.logger.info(`Job ${jobId} completed in queue ${queueName}`);
      });
    }
    return queue;
  }

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: QueueOptions
  ): Promise<string> {
    const queue = this.getOrCreateQueue(queueName);
    const jobOptions: JobsOptions = {
      ...((options?.attempts ?? this.defaultOptions.attempts) != null
        ? { attempts: options?.attempts ?? this.defaultOptions.attempts }
        : {}),
      ...(options?.delay != null ? { delay: options.delay } : {}),
      ...(options?.priority != null ? { priority: options.priority } : {}),
      ...((options?.removeOnComplete ?? this.defaultOptions.removeOnComplete) != null
        ? { removeOnComplete: options?.removeOnComplete ?? this.defaultOptions.removeOnComplete }
        : {}),
      ...((options?.removeOnFail ?? this.defaultOptions.removeOnFail) != null
        ? { removeOnFail: options?.removeOnFail ?? this.defaultOptions.removeOnFail }
        : {}),
    };

    const job = await queue.add(jobName, data, jobOptions);

    this.logger.info(`Added job ${job.id ?? 'unknown'} to queue ${queueName}`, { jobName });
    return job.id ?? '';
  }

  async addBulkJobs<T>(
    queueName: string,
    jobs: Array<{ name: string; data: T; options?: QueueOptions }>
  ): Promise<string[]> {
    const queue = this.getOrCreateQueue(queueName);
    const bulkJobs = jobs.map((job) => ({
      name: job.name,
      data: job.data,
      opts: {
        ...((job.options?.attempts ?? this.defaultOptions.attempts) != null
          ? { attempts: job.options?.attempts ?? this.defaultOptions.attempts }
          : {}),
        ...(job.options?.delay != null ? { delay: job.options.delay } : {}),
        ...(job.options?.priority != null ? { priority: job.options.priority } : {}),
      },
    }));

    const addedJobs = await queue.addBulk(bulkJobs);
    return addedJobs.map((job) => job.id ?? '');
  }

  async getJob<T>(queueName: string, jobId: string): Promise<QueueJob<T> | null> {
    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.getJob(jobId);

    if (job == null) return null;

    return this.mapJob<T>(job);
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job != null) {
      await job.remove();
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    await queue.pause();
    this.logger.info(`Paused queue ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    await queue.resume();
    this.logger.info(`Resumed queue ${queueName}`);
  }

  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getOrCreateQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async getFailedJobs<T>(queueName: string, limit = 100): Promise<QueueJob<T>[]> {
    const queue = this.getOrCreateQueue(queueName);
    const jobs = await queue.getFailed(0, limit - 1);
    return jobs.map((job) => this.mapJob<T>(job));
  }

  async retryFailedJobs(queueName: string): Promise<number> {
    const queue = this.getOrCreateQueue(queueName);
    const failedJobs = await queue.getFailed();
    let retried = 0;

    for (const job of failedJobs) {
      await job.retry();
      retried++;
    }

    this.logger.info(`Retried ${retried} failed jobs in queue ${queueName}`);
    return retried;
  }

  async cleanQueue(
    queueName: string,
    olderThan: number,
    status: 'completed' | 'failed'
  ): Promise<number> {
    const queue = this.getOrCreateQueue(queueName);
    const removed = await queue.clean(olderThan, 1000, status);
    this.logger.info(`Cleaned ${removed.length} ${status} jobs from queue ${queueName}`);
    return removed.length;
  }

  registerHandler<T, R>(queueName: string, handler: JobHandler<T, R>): void {
    if (this.workers.has(queueName)) {
      this.logger.warn(`Worker already registered for queue ${queueName}`);
      return;
    }

    const worker = new Worker<T, R>(
      queueName,
      async (job: Job<T>) => {
        this.logger.info(`Processing job ${job.id ?? 'unknown'} in queue ${queueName}`, {
          jobName: job.name,
          attempt: job.attemptsMade + 1,
        });

        try {
          const result = await handler(job.data);
          return result;
        } catch (error) {
          this.logger.error(`Job ${job.id ?? 'unknown'} failed`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt: job.attemptsMade + 1,
            maxAttempts: job.opts.attempts,
          });

          if (job.attemptsMade + 1 >= (job.opts.attempts ?? 3)) {
            await this.moveToDeadLetterQueue(queueName, job);
          }

          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: 5,
      }
    );

    worker.on('error', (error) => {
      this.logger.error(`Worker error in queue ${queueName}`, { error: error.message });
    });

    this.workers.set(queueName, worker);
    this.logger.info(`Registered worker for queue ${queueName}`);
  }

  private async moveToDeadLetterQueue<T>(queueName: string, job: Job<T>): Promise<void> {
    const dlqName = `${queueName}:dlq`;
    const dlq = this.getOrCreateQueue(dlqName);

    await dlq.add(`dlq:${job.name}`, {
      originalQueue: queueName,
      originalJobId: job.id,
      originalJobName: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      failedAt: new Date().toISOString(),
    });

    this.logger.warn(`Moved job ${job.id ?? 'unknown'} to dead letter queue ${dlqName}`);
  }

  async close(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.logger.info('Message queue connections closed');
  }

  private mapJob<T>(job: Job): QueueJob<T> {
    return {
      id: job.id ?? '',
      name: job.name,
      data: job.data as T,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 3,
      ...(job.opts.delay != null ? { delay: job.opts.delay } : {}),
      ...(job.opts.priority != null ? { priority: job.opts.priority } : {}),
      createdAt: new Date(job.timestamp),
    };
  }
}
