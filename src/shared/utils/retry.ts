export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: Array<new (...args: unknown[]) => Error>;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      if (opts.retryableErrors != null && opts.retryableErrors.length > 0) {
        const isRetryable = opts.retryableErrors.some(
          (ErrorClass) => lastError instanceof ErrorClass
        );
        if (!isRetryable) {
          throw lastError;
        }
      }

      opts.onRetry?.(lastError, attempt, delay);

      await sleep(delay);

      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError ?? new Error('Retry failed');
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  return withRetry(fn, {
    maxAttempts,
    initialDelay: 1000,
    maxDelay: 32000,
    backoffMultiplier: 2,
    onRetry: (error, attempt, delay) => {
      onRetry?.(attempt, delay);
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier = 2,
  jitter = true
): number {
  let delay = initialDelay * Math.pow(multiplier, attempt - 1);
  delay = Math.min(delay, maxDelay);

  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.round(delay);
}
