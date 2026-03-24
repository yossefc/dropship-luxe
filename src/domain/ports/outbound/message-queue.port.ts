export interface QueueJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  priority?: number;
  createdAt: Date;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QueueOptions {
  attempts?: number;
  delay?: number;
  priority?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export type JobHandler<T, R> = (data: T) => Promise<R>;

export interface MessageQueue {
  addJob<T>(queueName: string, jobName: string, data: T, options?: QueueOptions): Promise<string>;
  addBulkJobs<T>(queueName: string, jobs: Array<{ name: string; data: T; options?: QueueOptions }>): Promise<string[]>;
  getJob<T>(queueName: string, jobId: string): Promise<QueueJob<T> | null>;
  removeJob(queueName: string, jobId: string): Promise<void>;
  pauseQueue(queueName: string): Promise<void>;
  resumeQueue(queueName: string): Promise<void>;
  getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
  getFailedJobs<T>(queueName: string, limit?: number): Promise<QueueJob<T>[]>;
  retryFailedJobs(queueName: string): Promise<number>;
  cleanQueue(queueName: string, olderThan: number, status: 'completed' | 'failed'): Promise<number>;
  registerHandler<T, R>(queueName: string, handler: JobHandler<T, R>): void;
  close(): Promise<void>;
}
