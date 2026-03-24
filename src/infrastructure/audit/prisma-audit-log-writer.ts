import { Prisma, PrismaClient } from '@prisma/client';
import { sanitizeLogMeta } from '@shared/utils/log-sanitizer.js';

export interface PersistedAuditLogEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogWriter {
  write(entry: PersistedAuditLogEntry): Promise<void>;
}

export class PrismaAuditLogWriter implements AuditLogWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async write(entry: PersistedAuditLogEntry): Promise<void> {
    const sanitizedChanges = entry.changes != null
      ? sanitizeLogMeta(entry.changes) as Prisma.InputJsonValue
      : undefined;

    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: entry.action,
      entity: entry.entity,
      ...(entry.userId != null ? { userId: entry.userId } : {}),
      ...(entry.entityId != null ? { entityId: entry.entityId } : {}),
      ...(entry.ipAddress != null ? { ipAddress: entry.ipAddress } : {}),
      ...(entry.userAgent != null ? { userAgent: entry.userAgent } : {}),
      ...(sanitizedChanges != null ? { changes: sanitizedChanges } : {}),
    };

    await this.prisma.auditLog.create({ data });
  }
}
