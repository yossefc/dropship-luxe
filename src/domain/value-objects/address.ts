import { ValidationError } from '@shared/errors/domain-error.js';

export interface AddressProps {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export class Address {
  public readonly street: string;
  public readonly city: string;
  public readonly postalCode: string;
  public readonly country: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly phone: string | undefined;

  private constructor(props: AddressProps) {
    this.street = props.street;
    this.city = props.city;
    this.postalCode = props.postalCode;
    this.country = props.country;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.phone = props.phone;
  }

  static create(props: AddressProps): Address {
    if (props.street.trim().length === 0) {
      throw new ValidationError('Street is required');
    }
    if (props.city.trim().length === 0) {
      throw new ValidationError('City is required');
    }
    if (props.postalCode.trim().length === 0) {
      throw new ValidationError('Postal code is required');
    }
    if (props.country.trim().length === 0) {
      throw new ValidationError('Country is required');
    }
    if (props.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }
    if (props.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    return new Address({
      street: props.street.trim(),
      city: props.city.trim(),
      postalCode: props.postalCode.trim(),
      country: props.country.trim().toUpperCase(),
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      ...(props.phone != null ? { phone: props.phone.trim() } : {}),
    });
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  format(): string {
    return `${this.fullName}\n${this.street}\n${this.postalCode} ${this.city}\n${this.country}`;
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }
}
