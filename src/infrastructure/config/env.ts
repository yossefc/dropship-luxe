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
  REDIS_URL: z.string().url().optional(),  // Full Redis URL (e.g., redis://user:pass@host:port)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // ============================================================================
  // Hyp (YaadPay) Payment Gateway - Remplace Stripe (Optional until account created)
  // ============================================================================
  HYP_MASOF: z.string().optional(),                // Merchant ID (Terminal ID)
  HYP_PASSP: z.string().optional(),                // Terminal Password
  HYP_API_SIGNATURE_KEY: z.string().optional(),    // API Signature Key for HMAC
  HYP_SUCCESS_URL: z.string().url().optional(),    // Return URL after successful payment
  HYP_ERROR_URL: z.string().url().optional(),      // Return URL after failed payment
  HYP_NOTIFY_URL: z.string().url().optional(),     // Webhook notification URL

  // ============================================================================
  // AliExpress (Optional until configured)
  // ============================================================================
  ALIEXPRESS_APP_KEY: z.string().optional(),
  ALIEXPRESS_APP_SECRET: z.string().optional(),
  ALIEXPRESS_ACCESS_TOKEN: z.string().default(''),
  ALIEXPRESS_TRACKING_ID: z.string().default(''),
  ALIEXPRESS_CALLBACK_URL: z.string().url().optional(),

  // ============================================================================
  // OpenAI (Optional - needed for AI translations)
  // ============================================================================
  OPENAI_API_KEY: z.string().optional(),

  // ============================================================================
  // Security
  // ============================================================================
  ENCRYPTION_KEY: z.string().default('0'.repeat(64)),  // 256-bit AES key (64 hex chars) - CHANGE IN PRODUCTION!
  JWT_SECRET: z.string().default('change-this-secret-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  ADMIN_PASSWORD: z.string().min(8).optional(),

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
