/**
 * Customer DTOs - Shared between Frontend and Backend
 */

/** Address structure for customers and business */
export interface AddressDto {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Base customer data without system fields */
export interface CustomerBaseDto {
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: AddressDto;
  notes?: string;
}

/** Full customer entity with system fields */
export interface CustomerDto extends CustomerBaseDto {
  id: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}

/** DTO for creating a new customer */
export interface CreateCustomerDto extends CustomerBaseDto {}

/** DTO for updating an existing customer (all fields optional) */
export interface UpdateCustomerDto extends Partial<CustomerBaseDto> {}

/** DTO for customer list response */
export interface CustomerListResponseDto {
  customers: CustomerDto[];
  total: number;
}

/** DTO for single customer response */
export interface CustomerResponseDto {
  customer: CustomerDto;
}
