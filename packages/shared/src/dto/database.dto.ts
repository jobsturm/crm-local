/**
 * Database DTOs - Represents the JSON storage structure
 * 
 * Storage Layout:
 * /data/
 * ├── database.json          # Main database (customers, business, settings)
 * ├── offers/
 * │   └── {year}/
 * │       ├── OFF-2026-0001.json
 * │       └── ...
 * └── invoices/
 *     └── {year}/
 *         ├── INV-2026-0001.json
 *         └── ...
 */

import type { CustomerDto } from './customer.dto';
import type { BusinessDto } from './business.dto';
import type { SettingsDto } from './settings.dto';
import type { DocumentDto } from './document.dto';

/** 
 * Main database file schema (excludes documents - stored separately)
 * Stored at: {storagePath}/database.json
 */
export interface DatabaseDto {
  /** Semantic version for database migrations */
  version: string;

  /** All customers */
  customers: CustomerDto[];

  /** Business information */
  business: BusinessDto | null;

  /** Application settings (storagePath stored separately in app config) */
  settings: Omit<SettingsDto, 'storagePath'>;
}

/**
 * Document file schema (one file per offer/invoice)
 * Stored at: 
 *   - {storagePath}/offers/{year}/{documentNumber}.json
 *   - {storagePath}/invoices/{year}/{documentNumber}.json
 */
export interface DocumentFileDto {
  /** Semantic version for document file format migrations */
  version: string;

  /** The document data (offer or invoice) */
  document: DocumentDto;
}

/**
 * @deprecated Use DocumentFileDto instead
 * Legacy invoice file schema - kept for backwards compatibility
 */
export interface InvoiceFileDto {
  /** Semantic version for invoice file format migrations */
  version: string;

  /** The invoice data */
  invoice: import('./invoice.dto').InvoiceDto;
}

/** Current database version */
export const CURRENT_DATABASE_VERSION = '1.0.0';

/** Current document file version */
export const CURRENT_DOCUMENT_VERSION = '1.0.0';

/** @deprecated Use CURRENT_DOCUMENT_VERSION */
export const CURRENT_INVOICE_VERSION = '1.0.0';

/** Empty database template */
export const EMPTY_DATABASE: DatabaseDto = {
  version: CURRENT_DATABASE_VERSION,
  customers: [],
  business: null,
  settings: {
    currency: 'EUR',
    currencySymbol: '€',
    defaultTaxRate: 21,
    defaultPaymentTermDays: 14,
    offerPrefix: 'OFF',
    nextOfferNumber: 1,
    invoicePrefix: 'INV',
    nextInvoiceNumber: 1,
    defaultIntroText: undefined,
    defaultFooterText: undefined,
    labels: {
      // Document type titles
      offerTitle: 'Quote',
      invoiceTitle: 'Invoice',
      // Document metadata
      documentDateLabel: 'Date',
      dueDateLabel: 'Due Date',
      offerNumberLabel: 'Quote Number',
      invoiceNumberLabel: 'Invoice Number',
      // Customer section
      customerSectionTitleOffer: 'Customer Details',
      customerSectionTitleInvoice: 'Billing Address',
      // Intro section
      introSectionLabel: 'Description',
      // Line items table
      descriptionLabel: 'Description',
      quantityLabel: 'Qty',
      unitPriceLabel: 'Unit Price',
      amountLabel: 'Amount',
      // Totals
      subtotalLabel: 'Subtotal',
      taxLabel: 'VAT',
      totalLabel: 'Total',
      // Notes section
      notesSectionLabel: 'Additional Information',
      // Payment terms
      paymentTermsTitleOffer: 'Terms',
      paymentTermsTitleInvoice: 'Payment Terms',
      // Footer
      thankYouText: 'Thank you for your business with {company}!',
      questionsTextOffer: 'If you have questions about this quote, please contact us at {email} or {phone}.',
      questionsTextInvoice: 'If you have questions about this invoice, please contact us at {email} or {phone}.',
    },
    theme: 'system',
    dateFormat: 'DD-MM-YYYY',
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Create a document file wrapper
 */
export function createDocumentFile(document: DocumentDto): DocumentFileDto {
  return {
    version: CURRENT_DOCUMENT_VERSION,
    document,
  };
}

/**
 * @deprecated Use createDocumentFile instead
 * Create an invoice file wrapper
 */
export function createInvoiceFile(invoice: import('./invoice.dto').InvoiceDto): InvoiceFileDto {
  return {
    version: CURRENT_INVOICE_VERSION,
    invoice,
  };
}
