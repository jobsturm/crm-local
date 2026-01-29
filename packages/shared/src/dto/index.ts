/**
 * DTO Index - Export all DTOs from a single entry point
 */

// Customer DTOs
export type {
  AddressDto,
  CustomerBaseDto,
  CustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerListResponseDto,
  CustomerResponseDto,
} from './customer.dto';

// Document DTOs (Offers & Invoices)
export type {
  DocumentType,
  DocumentStatus,
  StatusLogEntryDto,
  DocumentItemDto,
  CreateDocumentItemDto,
  DocumentCustomerSnapshotDto,
  DocumentDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentSummaryDto,
  DocumentListResponseDto,
  DocumentResponseDto,
  ConvertOfferToInvoiceDto,
} from './document.dto';

// Legacy Invoice DTOs (kept for reference, use Document DTOs for new code)
export type {
  InvoiceStatus,
  InvoiceItemDto,
  CreateInvoiceItemDto,
  InvoiceBaseDto,
  InvoiceDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceListResponseDto,
  InvoiceResponseDto,
  InvoiceWithCustomerDto,
} from './invoice.dto';

// Business DTOs
export type {
  BankDetailsDto,
  BusinessAddressDto,
  BusinessDto,
  UpdateBusinessDto,
  BusinessResponseDto,
} from './business.dto';

// Settings DTOs
export type {
  CurrencyCode,
  ThemePreference,
  DocumentLabelsDto,
  SettingsDto,
  UpdateSettingsDto,
  SettingsResponseDto,
} from './settings.dto';
export { DEFAULT_LABELS, DUTCH_LABELS, DEFAULT_SETTINGS } from './settings.dto';

// Common DTOs
export type {
  ApiErrorDto,
  ApiResponseDto,
  PaginationQueryDto,
  PaginationMetaDto,
  PaginatedResponseDto,
  IdParamDto,
} from './common.dto';

// Database DTOs
export type { DatabaseDto, DocumentFileDto, InvoiceFileDto } from './database.dto';
export { 
  CURRENT_DATABASE_VERSION,
  CURRENT_DOCUMENT_VERSION,
  CURRENT_INVOICE_VERSION,
  EMPTY_DATABASE,
  createDocumentFile,
  createInvoiceFile,
} from './database.dto';
