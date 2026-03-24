import { Currency } from '@shared/types/index.js';
import { ValidationError } from '@shared/errors/domain-error.js';

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: Currency
  ) {}

  static create(amount: number, currency: Currency): Money {
    if (amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }
    if (!['EUR', 'USD', 'GBP'].includes(currency)) {
      throw new ValidationError(`Invalid currency: ${currency}`);
    }
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new ValidationError('Result cannot be negative');
    }
    return Money.create(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new ValidationError('Factor cannot be negative');
    }
    return Money.create(this.amount * factor, this.currency);
  }

  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  format(): string {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    });
    return formatter.format(this.amount);
  }

  toCents(): number {
    return Math.round(this.amount * 100);
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new ValidationError(
        `Currency mismatch: ${this.currency} vs ${other.currency}`
      );
    }
  }
}
