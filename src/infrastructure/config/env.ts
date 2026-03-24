import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  ALIEXPRESS_APP_KEY: z.string(),
  ALIEXPRESS_APP_SECRET: z.string(),
  ALIEXPRESS_ACCESS_TOKEN: z.string(),
  ALIEXPRESS_TRACKING_ID: z.string(),

  OPENAI_API_KEY: z.string().startsWith('sk-'),

  ENCRYPTION_KEY: z.string().length(64),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),

  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_RETENTION_DAYS: z.string().transform(Number).default('365'),
  LOGS_DIR: z.string().default('./logs'),

  CRON_STOCK_SYNC: z.string().default('0 */6 * * *'),
  CRON_DATA_CLEANUP: z.string().default('0 0 * * *'),

  MIN_PRODUCT_RATING: z.string().transform(Number).default('4.5'),
  MIN_ORDER_VOLUME: z.string().transform(Number).default('100'),
  MIN_PROFIT_MARGIN: z.string().transform(Number).default('0.30'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('Environment validation failed:');
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}
