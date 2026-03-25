import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // ============================================================================
  // Application
  // ============================================================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // ============================================================================
  // Database
  // ============================================================================
  DATABASE_URL: z.string().url(),

  // ============================================================================
  // Redis
  // ============================================================================
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // ============================================================================
  // Hyp (YaadPay) Payment Gateway - Remplace Stripe
  // ============================================================================
  HYP_MASOF: z.string().min(1),                    // Merchant ID (Terminal ID)
  HYP_PASSP: z.string().min(1),                    // Terminal Password
  HYP_API_SIGNATURE_KEY: z.string().min(16),       // API Signature Key for HMAC
  HYP_SUCCESS_URL: z.string().url(),               // Return URL after successful payment
  HYP_ERROR_URL: z.string().url(),                 // Return URL after failed payment
  HYP_NOTIFY_URL: z.string().url(),                // Webhook notification URL

  // ============================================================================
  // AliExpress
  // ============================================================================
  ALIEXPRESS_APP_KEY: z.string(),
  ALIEXPRESS_APP_SECRET: z.string(),
  ALIEXPRESS_ACCESS_TOKEN: z.string().default(''),
  ALIEXPRESS_TRACKING_ID: z.string().default(''),
  ALIEXPRESS_CALLBACK_URL: z.string().url().optional(),

  // ============================================================================
  // OpenAI
  // ============================================================================
  OPENAI_API_KEY: z.string().startsWith('sk-'),

  // ============================================================================
  // Security
  // ============================================================================
  ENCRYPTION_KEY: z.string().length(64),           // 256-bit AES key (64 hex chars)
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // ============================================================================
  // CORS & Rate Limiting
  // ============================================================================
  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // ============================================================================
  // Logging
  // ============================================================================
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_RETENTION_DAYS: z.string().transform(Number).default('365'),
  LOGS_DIR: z.string().default('./logs'),

  // ============================================================================
  // Cron Schedules
  // ============================================================================
  CRON_STOCK_SYNC: z.string().default('0 */6 * * *'),      // Every 6 hours
  CRON_DATA_CLEANUP: z.string().default('0 0 * * *'),      // Daily at midnight

  // ============================================================================
  // Business Rules
  // ============================================================================
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
