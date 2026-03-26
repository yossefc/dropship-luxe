import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { env } from '@infrastructure/config/env.js';
import { Logger, AuditLogger } from '@infrastructure/config/logger.js';
import { DomainError } from '@shared/errors/domain-error.js';
import { createAliExpressOAuthRouter } from './controllers/aliexpress-oauth.controller.js';
import { createOrderRouter } from './controllers/order.controller.js';
import { createProductRouter } from './controllers/product.controller.js';
import { HypAdapter, createHypAdapter } from '@infrastructure/adapters/outbound/payment/hyp.adapter.js';

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export function createServer(
  logger: Logger,
  auditLogger?: AuditLogger,
  prisma?: PrismaClient
): Express {
  const app = express();

  // Cookie parser for OAuth state management
  app.use(cookieParser());

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  app.use(cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }));

  app.use(compression());

  app.use('/webhooks', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    skip: (req) => req.path === '/health',
  });
  app.use(limiter);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    req.requestId = requestId;

    _res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('HTTP Request', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: _res.statusCode,
        durationMs: duration,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });

      if (auditLogger != null && shouldAuditRequest(req)) {
        const userAgent = req.get('user-agent');
        auditLogger.logAccess({
          userId: resolveAuditActor(req),
          action: req.method.toLowerCase(),
          resource: 'http_request',
          resourceId: requestId,
          success: _res.statusCode < 400,
          ...(req.ip != null ? { ip: req.ip } : {}),
          ...(userAgent != null ? { userAgent } : {}),
          details: {
            path: req.path,
            statusCode: _res.statusCode,
            durationMs: duration,
          },
        });
      }
    });

    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '1.0.0',
    });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // AliExpress OAuth Routes
  // ============================================================================
  // Callback URL: https://your-domain.com/api/aliexpress/callback
  // ============================================================================
  if (prisma) {
    app.use('/api/aliexpress', createAliExpressOAuthRouter(prisma));
    logger.info('AliExpress OAuth routes mounted at /api/aliexpress');

    // ============================================================================
    // Product Routes
    // ============================================================================
    app.use('/api/v1/products', createProductRouter(prisma));
    logger.info('Product routes mounted at /api/v1/products');

    // ============================================================================
    // Order Routes
    // ============================================================================
    try {
      const hypAdapter = createHypAdapter(logger);
      app.use('/api/v1/orders', createOrderRouter(prisma, hypAdapter, logger));
      logger.info('Order routes mounted at /api/v1/orders');
    } catch (error) {
      logger.warn('Hyp adapter not configured, order routes disabled', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return app;
}

function shouldAuditRequest(req: Request): boolean {
  return req.path.startsWith('/webhooks/hyp')
    || req.path.startsWith('/api/aliexpress')
    || ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
}

function resolveAuditActor(req: Request): string {
  const headerValue = req.headers['x-user-id'];

  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }

  if (req.path.startsWith('/webhooks/hyp')) {
    return 'hyp_webhook';
  }

  if (req.path.startsWith('/api/aliexpress')) {
    return 'aliexpress_oauth';
  }

  return 'anonymous';
}

export function setupErrorHandling(app: Express, logger: Logger): void {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId ?? 'unknown';

    if (err instanceof DomainError) {
      logger.warn('Domain error', {
        requestId,
        code: err.code,
        message: err.message,
      });

      const statusCode = getStatusCodeForError(err.code);
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error('Unhandled error', {
      requestId,
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      },
      timestamp: new Date().toISOString(),
    });
  });
}

function getStatusCodeForError(code: string): number {
  const statusCodes: Record<string, number> = {
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    PAYMENT_ERROR: 402,
    RATE_LIMIT_EXCEEDED: 429,
    EXTERNAL_SERVICE_ERROR: 502,
  };
  return statusCodes[code] ?? 500;
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
