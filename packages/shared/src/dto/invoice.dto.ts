/**
 * Invoice DTOs - Shared between Frontend and Backend
 */

/** Invoice status enum */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/** Single line item on an invoice */
export interface InvoiceItemDto {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // in cents to avoid floating point issues
  total: number; // quantity * unitPrice (in cents)
}

/** Base invoice item for creation (without id and computed total) */
export interface CreateInvoiceItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** Base invoice data without system fields */
export interface InvoiceBaseDto {
  customerId: string;
  items: InvoiceItemDto[];
  notes?: string;
  dueDate: string; // ISO 8601 date string
  taxRate: number; // percentage (e.g., 21 for 21%)
}

/** Full invoice entity with system fields and computed values */
export interface InvoiceDto extends Omit<InvoiceBaseDto, 'items'> {
  id: string;
  invoiceNumber: string; // e.g., "INV-2026-0001"
  items: InvoiceItemDto[];
  subtotal: number; // sum of all item totals (in cents)
  taxAmount: number; // subtotal * (taxRate / 100) (in cents)
  total: number; // subtotal + taxAmount (in cents)
  status: InvoiceStatus;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  paidAt?: string; // ISO 8601 date string (when status changed to paid)
}

/** DTO for creating a new invoice */
export interface CreateInvoiceDto {
  customerId: string;
  items: CreateInvoiceItemDto[];
  notes?: string;
  dueDate: string;
  taxRate?: number; // optional, will use default from settings
}

/** DTO for updating an existing invoice */
export interface UpdateInvoiceDto {
  customerId?: string;
  items?: CreateInvoiceItemDto[];
  notes?: string;
  dueDate?: string;
  taxRate?: number;
  status?: InvoiceStatus;
}

/** DTO for invoice list response */
export interface InvoiceListResponseDto {
  invoices: InvoiceDto[];
  total: number;
}

/** DTO for single invoice response */
export interface InvoiceResponseDto {
  invoice: InvoiceDto;
}

/** DTO for invoice with customer details (for display/printing) */
export interface InvoiceWithCustomerDto extends InvoiceDto {
  customer: {
    id: string;
    name: string;
    email: string;
    company?: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}
