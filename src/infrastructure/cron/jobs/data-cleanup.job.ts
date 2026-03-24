import { MessageQueue } from '@domain/ports/outbound/message-queue.port.js';
import { Logger } from '@infrastructure/config/logger.js';

export interface DataCleanupJobDependencies {
  messageQueue: MessageQueue;
  logger: Logger;
  retentionDays?: number;
}

export class DataCleanupJob {
  private readonly messageQueue: MessageQueue;
  private readonly logger: Logger;
  private readonly retentionDays: number;

  constructor(deps: DataCleanupJobDependencies) {
    this.messageQueue = deps.messageQueue;
    this.logger = deps.logger.child({ job: 'DataCleanupJob' });
    this.retentionDays = deps.retentionDays ?? 30;
  }

  async execute(): Promise<void> {
    this.logger.info('Starting data cleanup');

    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
    const queueNames = [
      'orders',
      'orders:dlq',
      'products',
      'products:dlq',
      'notifications',
      'notifications:dlq',
    ];

    let totalCleaned = 0;

    for (const queueName of queueNames) {
      try {
        const completedCleaned = await this.messageQueue.cleanQueue(
          queueName,
          retentionMs,
          'completed'
        );

        const failedCleaned = await this.messageQueue.cleanQueue(
          queueName,
          retentionMs * 2,
          'failed'
        );

        totalCleaned += completedCleaned + failedCleaned;

        this.logger.info(`Cleaned queue ${queueName}`, {
          completedCleaned,
          failedCleaned,
        });
      } catch (error) {
        this.logger.error(`Failed to clean queue ${queueName}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.cleanExpiredSessions();
    await this.cleanTempFiles();

    this.logger.info('Data cleanup completed', { totalJobsCleaned: totalCleaned });
  }

  private async cleanExpiredSessions(): Promise<void> {
    this.logger.info('Cleaning expired sessions');
  }

  private async cleanTempFiles(): Promise<void> {
    this.logger.info('Cleaning temporary files');
  }
}
