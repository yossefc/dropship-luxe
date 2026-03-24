export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
  }
}

export class PaymentError extends DomainError {
  constructor(message: string) {
    super(message, 'PAYMENT_ERROR');
  }
}

export class ExternalServiceError extends DomainError {
  public readonly serviceName: string;
  public readonly originalError: Error | undefined;

  constructor(serviceName: string, message: string, originalError?: Error) {
    super(`${serviceName}: ${message}`, 'EXTERNAL_SERVICE_ERROR');
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

export class RateLimitError extends DomainError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}
