import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { AuditLogWriter, PersistedAuditLogEntry } from '@infrastructure/audit/prisma-audit-log-writer.js';
import { redactSensitiveText, sanitizeLogMeta } from '@shared/utils/log-sanitizer.js';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  child(meta: Record<string, unknown>): Logger;
}

export interface LoggerConfig {
  level: string;
  logsDir?: string;
  retentionDays?: number;
}

class WinstonLogger implements Logger {
  private readonly logger: winston.Logger;

  constructor(config: LoggerConfig) {
    const auditOnlyFormat = winston.format((info) => {
      return info['type'] === 'audit' ? info : false;
    });

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${String(timestamp)} [${level}]: ${String(message)}${metaStr}`;
      })
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ];

    if (config.logsDir != null) {
      fs.mkdirSync(config.logsDir, { recursive: true });

      transports.push(
        new winston.transports.File({
          filename: path.join(config.logsDir, 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: 10 * 1024 * 1024,
          maxFiles: 30,
        }),
        new winston.transports.File({
          filename: path.join(config.logsDir, 'combined.log'),
          format: logFormat,
          maxsize: 10 * 1024 * 1024,
          maxFiles: 30,
        }),
        new winston.transports.File({
          filename: path.join(config.logsDir, 'audit.log'),
          level: 'info',
          format: winston.format.combine(
            auditOnlyFormat(),
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 50 * 1024 * 1024,
          maxFiles: config.retentionDays ?? 365,
        })
      );
    }

    this.logger = winston.createLogger({
      level: config.level,
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(redactSensitiveText(message), sanitizeLogMeta(meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(redactSensitiveText(message), sanitizeLogMeta(meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(redactSensitiveText(message), sanitizeLogMeta(meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(redactSensitiveText(message), sanitizeLogMeta(meta));
  }

  child(meta: Record<string, unknown>): Logger {
    const childMeta = sanitizeLogMeta(meta);
    const childLogger = this.logger.child(childMeta);
    return {
      info: (msg: string, m?: Record<string, unknown>) => childLogger.info(redactSensitiveText(msg), sanitizeLogMeta(m)),
      warn: (msg: string, m?: Record<string, unknown>) => childLogger.warn(redactSensitiveText(msg), sanitizeLogMeta(m)),
      error: (msg: string, m?: Record<string, unknown>) => childLogger.error(redactSensitiveText(msg), sanitizeLogMeta(m)),
      debug: (msg: string, m?: Record<string, unknown>) => childLogger.debug(redactSensitiveText(msg), sanitizeLogMeta(m)),
      child: (m: Record<string, unknown>) => this.child({ ...meta, ...m }),
    };
  }
}

export function createLogger(config: LoggerConfig): Logger {
  return new WinstonLogger(config);
}

export const logger: Logger = createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  logsDir: process.env['LOGS_DIR'] ?? './logs',
  retentionDays: Number(process.env['LOG_RETENTION_DAYS'] ?? '365'),
});

export class AuditLogger {
  private readonly logger: Logger;
  private readonly fallbackLogger: Logger;
  private readonly writer: AuditLogWriter | undefined;

  constructor(baseLogger: Logger, writer?: AuditLogWriter) {
    this.logger = baseLogger.child({ type: 'audit' });
    this.fallbackLogger = baseLogger.child({ component: 'AuditLogger' });
    this.writer = writer;
  }

  logAccess(params: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    details?: Record<string, unknown>;
  }): void {
    const payload = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    this.logger.info('access_log', payload);
    this.persist({
      userId: params.userId,
      action: params.action,
      entity: params.resource,
      ...(params.resourceId != null ? { entityId: params.resourceId } : {}),
      ...(params.ip != null ? { ipAddress: params.ip } : {}),
      ...(params.userAgent != null ? { userAgent: params.userAgent } : {}),
      changes: {
        category: 'access',
        success: params.success,
        details: params.details,
      },
    });
  }

  logDataChange(params: {
    userId: string;
    action: 'create' | 'update' | 'delete';
    entity: string;
    entityId: string;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
  }): void {
    const payload = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    this.logger.info('data_change', payload);
    this.persist({
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      changes: {
        category: 'data_change',
        before: params.changes?.before,
        after: params.changes?.after,
      },
    });
  }

  logSecurityEvent(params: {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ip?: string;
    details?: Record<string, unknown>;
  }): void {
    const payload = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn('security_event', payload);
    this.persist({
      action: params.event,
      entity: 'security_event',
      ...(params.userId != null ? { userId: params.userId } : {}),
      ...(params.ip != null ? { ipAddress: params.ip } : {}),
      changes: {
        category: 'security',
        severity: params.severity,
        details: params.details,
      },
    });
  }

  logPayment(params: {
    orderId: string;
    customerId: string;
    action: string;
    amount: number;
    currency: string;
    paymentIntentId?: string;
    success: boolean;
    error?: string;
  }): void {
    const payload = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    this.logger.info('payment_log', payload);
    this.persist({
      userId: params.customerId,
      action: params.action,
      entity: 'payment',
      entityId: params.orderId,
      changes: {
        category: 'payment',
        amount: params.amount,
        currency: params.currency,
        success: params.success,
        ...(params.paymentIntentId != null ? { paymentIntentId: params.paymentIntentId } : {}),
        ...(params.error != null ? { error: params.error } : {}),
      },
    });
  }

  private persist(entry: PersistedAuditLogEntry): void {
    if (this.writer == null) {
      return;
    }

    void this.writer.write(entry).catch((error: unknown) => {
      this.fallbackLogger.error('audit_log_persistence_failed', {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }
}
