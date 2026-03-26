// ============================================================================
// Logger Re-export for @shared/utils/logger
// ============================================================================
// Re-exports the logger from infrastructure/config for backwards compatibility

export { logger, createLogger, Logger, LoggerConfig, AuditLogger } from '@infrastructure/config/logger.js';
