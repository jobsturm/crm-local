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
  OfferStatus,
  InvoiceStatus,
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

export { OFFER_STATUSES, INVOICE_STATUSES, STATUS_LABELS, STATUS_TAG_TYPES } from './document.dto';
export type { StatusTagType } from './document.dto';

// Legacy Invoice DTOs (kept for reference, use Document DTOs for new code)
export type {
  InvoiceStatus as LegacyInvoiceStatus, // Renamed to avoid conflict with document.dto InvoiceStatus
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
  LanguagePreference,
  FiscalYearStartMonth,
  YearCounters,
  DocumentLabelsDto,
  SettingsDto,
  UpdateSettingsDto,
  SettingsResponseDto,
} from './settings.dto';
export {
  DEFAULT_LABELS,
  DUTCH_LABELS,
  DEFAULT_SETTINGS,
  DEFAULT_DOCUMENT_NUMBER_FORMAT,
} from './settings.dto';

// Financial DTOs
export type {
  Quarter,
  TimeGranularity,
  TimeSeriesRevenueDto,
  MonthlyRevenueDto,
  VatBreakdownDto,
  QuarterlyBtwSummaryDto,
  AgingBucketDto,
  InvoiceStatusBreakdownDto,
  FinancialOverviewDto,
  FinancialOverviewRequestDto,
  FinancialOverviewResponseDto,
} from './financial.dto';

// Dashboard DTOs
export type {
  OverdueInvoiceDto,
  TopInvoiceDto,
  TopCustomerDto,
  DashboardStatsDto,
  DashboardResponseDto,
} from './dashboard.dto';

// Common DTOs
export type {
  ApiErrorDto,
  ApiResponseDto,
  PaginationQueryDto,
  PaginationMetaDto,
  PaginatedResponseDto,
  IdParamDto,
} from './common.dto';

// Product DTOs
export type {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListResponseDto,
} from './product.dto';

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
