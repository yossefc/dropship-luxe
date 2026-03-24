const SENSITIVE_KEY_PATTERNS = [
  /authorization/i,
  /api[-_]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /^pass$/i,
  /signature/i,
  /cookie/i,
  /session/i,
];

const PCI_KEY_PATTERNS = [
  /\bpan\b/i,
  /card[-_ ]?number/i,
  /\bccv\b/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /security[-_ ]?code/i,
  /expiry/i,
  /exp[-_ ]?(month|year|date)?/i,
];

const REDACTED = '[REDACTED]';

export function redactSensitiveText(value: string): string {
  let sanitized = value;

  sanitized = sanitized.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/\bBasic\s+[A-Za-z0-9._~+/=-]+\b/gi, 'Basic [REDACTED]');
  sanitized = sanitized.replace(/\b(?:sk|pk|rk)_(?:test|live)_[A-Za-z0-9]+\b/g, REDACTED);
  sanitized = sanitized.replace(/\bwhsec_[A-Za-z0-9]+\b/g, REDACTED);
  sanitized = sanitized.replace(/\b(?:\d[ -]?){13,19}\b/g, (candidate) => {
    return looksLikePrimaryAccountNumber(candidate) ? maskPrimaryAccountNumber(candidate) : candidate;
  });

  return sanitized;
}

export function sanitizeLogMeta<T>(value: T): T {
  return sanitizeValue(value, undefined, new WeakSet<object>()) as T;
}

function sanitizeValue(value: unknown, key: string | undefined, seen: WeakSet<object>): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    if (key != null && isSensitiveKey(key)) {
      return redactValueForKey(key, value);
    }
    return redactSensitiveText(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    if (key != null && isSensitiveKey(key)) {
      return REDACTED;
    }
    return value;
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSensitiveText(value.message),
      stack: value.stack != null ? redactSensitiveText(value.stack) : undefined,
    };
  }

  if (Buffer.isBuffer(value)) {
    return `[BUFFER:${value.length}]`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    const sanitizedObject: Record<string, unknown> = {};

    for (const [childKey, childValue] of Object.entries(value)) {
      sanitizedObject[childKey] = sanitizeValue(childValue, childKey, seen);
    }

    seen.delete(value);
    return sanitizedObject;
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
    || PCI_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValueForKey(key: string, value: string): string {
  if (PCI_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
    if (looksLikePrimaryAccountNumber(value)) {
      return maskPrimaryAccountNumber(value);
    }
    return REDACTED;
  }

  if (/authorization/i.test(key)) {
    return value.startsWith('Bearer ') ? 'Bearer [REDACTED]' : REDACTED;
  }

  return REDACTED;
}

function looksLikePrimaryAccountNumber(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19 && passesLuhnCheck(digits);
}

function maskPrimaryAccountNumber(candidate: string): string {
  const digits = candidate.replace(/\D/g, '');
  let digitIndex = 0;

  return candidate.replace(/\d/g, (digit) => {
    const maskedDigit = digitIndex < digits.length - 4 ? '*' : digit;
    digitIndex += 1;
    return maskedDigit;
  });
}

function passesLuhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const char = digits[index];
    if (char == null) {
      return false;
    }

    let digit = Number(char);
    if (Number.isNaN(digit)) {
      return false;
    }

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
