import { UUID } from '@shared/types/index.js';
import { Email } from '@domain/value-objects/email.js';
import { Address } from '@domain/value-objects/address.js';
import { ValidationError } from '@shared/errors/domain-error.js';

export interface CustomerProps {
  id: UUID;
  email: Email;
  firstName: string;
  lastName: string;
  phone?: string;
  stripeCustomerId?: string;
  addresses: Address[];
  defaultAddressIndex: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer {
  private constructor(private props: CustomerProps) {}

  static create(props: Omit<CustomerProps, 'createdAt' | 'updatedAt' | 'addresses' | 'defaultAddressIndex' | 'isVerified' | 'stripeCustomerId'>): Customer {
    if (props.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }
    if (props.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    return new Customer({
      ...props,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      ...(props.phone != null ? { phone: props.phone.trim() } : {}),
      addresses: [],
      defaultAddressIndex: -1,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get id(): UUID { return this.props.id; }
  get email(): Email { return this.props.email; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get phone(): string | undefined { return this.props.phone; }
  get stripeCustomerId(): string | undefined { return this.props.stripeCustomerId; }
  get addresses(): Address[] { return [...this.props.addresses]; }
  get defaultAddress(): Address | undefined {
    if (this.props.defaultAddressIndex >= 0 && this.props.defaultAddressIndex < this.props.addresses.length) {
      return this.props.addresses[this.props.defaultAddressIndex];
    }
    return this.props.addresses[0];
  }
  get isVerified(): boolean { return this.props.isVerified; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  setStripeCustomerId(stripeCustomerId: string): void {
    this.props.stripeCustomerId = stripeCustomerId;
    this.props.updatedAt = new Date();
  }

  addAddress(address: Address): void {
    this.props.addresses.push(address);
    if (this.props.defaultAddressIndex < 0) {
      this.props.defaultAddressIndex = 0;
    }
    this.props.updatedAt = new Date();
  }

  setDefaultAddress(index: number): void {
    if (index < 0 || index >= this.props.addresses.length) {
      throw new ValidationError('Invalid address index');
    }
    this.props.defaultAddressIndex = index;
    this.props.updatedAt = new Date();
  }

  removeAddress(index: number): void {
    if (index < 0 || index >= this.props.addresses.length) {
      throw new ValidationError('Invalid address index');
    }
    this.props.addresses.splice(index, 1);
    if (this.props.defaultAddressIndex >= this.props.addresses.length) {
      this.props.defaultAddressIndex = this.props.addresses.length - 1;
    }
    this.props.updatedAt = new Date();
  }

  updateProfile(firstName: string, lastName: string, phone?: string): void {
    if (firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }
    if (lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }
    this.props.firstName = firstName.trim();
    this.props.lastName = lastName.trim();
    if (phone != null && phone.trim().length > 0) {
      this.props.phone = phone.trim();
    } else {
      delete this.props.phone;
    }
    this.props.updatedAt = new Date();
  }

  verify(): void {
    this.props.isVerified = true;
    this.props.updatedAt = new Date();
  }

  toJSON(): CustomerProps {
    return { ...this.props };
  }
}
