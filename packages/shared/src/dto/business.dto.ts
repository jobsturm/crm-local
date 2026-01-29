/**
 * Business DTOs - Shared between Frontend and Backend
 * Represents the user's business information shown on invoices
 */

/** Bank account details for payment information */
export interface BankDetailsDto {
  bankName: string;
  accountHolder: string;
  iban: string;
  bic?: string; // SWIFT/BIC code
}

/** Business address */
export interface BusinessAddressDto {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Full business information */
export interface BusinessDto {
  name: string;
  address: BusinessAddressDto;
  phone: string;
  email: string;
  website?: string;
  taxId?: string; // VAT number, EIN, etc.
  chamberOfCommerce?: string; // KvK number (NL) or equivalent
  logo?: string; // Base64 encoded image or file path
  bankDetails?: BankDetailsDto;
  updatedAt: string; // ISO 8601 date string
}

/** DTO for updating business information */
export interface UpdateBusinessDto {
  name?: string;
  address?: Partial<BusinessAddressDto>;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  chamberOfCommerce?: string;
  logo?: string;
  bankDetails?: Partial<BankDetailsDto>;
}

/** DTO for business response */
export interface BusinessResponseDto {
  business: BusinessDto;
}
