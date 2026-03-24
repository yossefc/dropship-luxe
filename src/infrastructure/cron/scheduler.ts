import cron from 'node-cron';
import { Logger } from '@infrastructure/config/logger.js';

export interface CronTask {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled?: boolean;
}

export interface SchedulerConfig {
  stockSyncSchedule: string;
  dataCleanupSchedule: string;
}

export class CronScheduler {
  private readonly tasks: Map<string, cron.ScheduledTask> = new Map();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'CronScheduler' });
  }

  registerTask(task: CronTask): void {
    if (task.enabled === false) {
      this.logger.info(`Task ${task.name} is disabled, skipping registration`);
      return;
    }

    if (!cron.validate(task.schedule)) {
      this.logger.error(`Invalid cron schedule for task ${task.name}: ${task.schedule}`);
      return;
    }

    const scheduledTask = cron.schedule(
      task.schedule,
      async () => {
        const startTime = Date.now();
        this.logger.info(`Starting cron task: ${task.name}`);

        try {
          await task.handler();
          const duration = Date.now() - startTime;
          this.logger.info(`Completed cron task: ${task.name}`, { durationMs: duration });
        } catch (error) {
          const duration = Date.now() - startTime;
          this.logger.error(`Failed cron task: ${task.name}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            durationMs: duration,
          });
        }
      },
      {
        scheduled: false,
        timezone: 'Europe/Paris',
      }
    );

    this.tasks.set(task.name, scheduledTask);
    this.logger.info(`Registered cron task: ${task.name}`, { schedule: task.schedule });
  }

  start(): void {
    for (const [name, task] of this.tasks) {
      task.start();
      this.logger.info(`Started cron task: ${name}`);
    }
  }

  stop(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      this.logger.info(`Stopped cron task: ${name}`);
    }
  }

  runTaskNow(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task == null) {
      this.logger.warn(`Task ${taskName} not found`);
      return;
    }
    this.logger.info(`Manually triggering task: ${taskName}`);
    // Note: node-cron doesn't expose a direct "run now" method,
    // so we'd need to call the handler directly from a stored reference
  }

  getTaskNames(): string[] {
    return Array.from(this.tasks.keys());
  }
}
