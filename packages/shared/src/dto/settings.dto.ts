/**
 * Settings DTOs - Shared between Frontend and Backend
 */

/** Available currency codes */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'AUD';

/** Theme preference */
export type ThemePreference = 'light' | 'dark' | 'system';

/** UI language preference */
export type LanguagePreference = 'en-US' | 'nl-NL';

/** Fiscal year start month (1-12) */
export type FiscalYearStartMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Customizable labels for PDF documents
 * Users can edit these in settings to use their preferred language/terminology
 *
 * Based on the proven PDF template from the prototype
 */
export interface DocumentLabelsDto {
  // === Document type titles (defaults for new documents) ===
  offerTitle: string; // "Offerte" / "Quote"
  invoiceTitle: string; // "Factuur" / "Invoice"

  // === Document metadata labels ===
  documentDateLabel: string; // "Datum" / "Date"
  dueDateLabel: string; // "Vervaldatum" / "Due Date"
  offerNumberLabel: string; // "Offertenummer" / "Quote Number"
  invoiceNumberLabel: string; // "Factuurnummer" / "Invoice Number"

  // === Customer section ===
  customerSectionTitleOffer: string; // "Klantgegevens" / "Customer Details"
  customerSectionTitleInvoice: string; // "Factuuradres" / "Billing Address"

  // === Intro/description section ===
  introSectionLabel: string; // "Omschrijving" / "Description"

  // === Line items table headers ===
  descriptionLabel: string; // "Omschrijving" / "Description"
  quantityLabel: string; // "Aantal" / "Qty"
  unitPriceLabel: string; // "Prijs p/e" / "Unit Price"
  amountLabel: string; // "Totaal" / "Amount"

  // === Totals section ===
  subtotalLabel: string; // "Subtotaal" / "Subtotal"
  taxLabel: string; // "BTW" / "VAT" / "Tax"
  totalLabel: string; // "Totaal" / "Total"

  // === Notes section ===
  notesSectionLabel: string; // "Aanvullende informatie" / "Additional Information"

  // === Payment terms section ===
  paymentTermsTitleOffer: string; // "Voorwaarden" / "Terms"
  paymentTermsTitleInvoice: string; // "Betalingsvoorwaarden" / "Payment Terms"

  // === Company details labels ===
  telLabel: string; // "Tel:" / "Phone:"
  emailLabel: string; // "E-mail:" / "Email:"
  kvkLabel: string; // "KvK:" / "Chamber of Commerce:"
  vatIdLabel: string; // "VAT:" / "VAT ID:"
  ibanLabel: string; // "IBAN:"

  // === Footer ===
  // Use {company} placeholder for company name, {email} for email, {phone} for phone
  thankYouText: string; // "Bedankt voor het vertrouwen in {company}!"
  questionsTextOffer: string; // "Bij vragen over deze offerte kunt u contact opnemen via {email} of {phone}."
  questionsTextInvoice: string; // "Bij vragen over deze factuur kunt u contact opnemen via {email} of {phone}."
}

/**
 * Per-year counter storage
 * Keys are year strings (e.g., "2026"), values are the next number for that year
 */
export type YearCounters = Record<string, number>;

/** Full settings object */
export interface SettingsDto {
  /** Path to the JSON database file */
  storagePath: string;

  /** Default currency for documents */
  currency: CurrencyCode;

  /** Currency symbol to display (e.g., "€", "$", "£") */
  currencySymbol: string;

  /** Default tax rate percentage (e.g., 21 for 21%) */
  defaultTaxRate: number;

  /** Default payment term in days */
  defaultPaymentTermDays: number;

  // === Offer Numbering ===

  /** Prefix for offer numbers (used by {PREFIX} variable) */
  offerPrefix: string;

  /**
   * Template format for offer numbers
   * Variables: {PREFIX}, {YEAR}, {YY}, {MONTH}, {DAY}, {NUMBER}, {NUMBER_YEAR}
   * Padding: {NUMBER:4} pads to 4 digits with zeros
   * @example "{PREFIX}-{YEAR}-{NUMBER:4}" → "OFF-2026-0042"
   * @example "{YY}.{NUMBER_YEAR:3}" → "26.005"
   */
  offerNumberFormat: string;

  /** Next offer number counter (global, all-time) - used by {NUMBER} */
  nextOfferNumber: number;

  /** Per-year offer counters - used by {NUMBER_YEAR} */
  offerCountersByYear: YearCounters;

  // === Invoice Numbering ===

  /** Prefix for invoice numbers (used by {PREFIX} variable) */
  invoicePrefix: string;

  /**
   * Template format for invoice numbers
   * Variables: {PREFIX}, {YEAR}, {YY}, {MONTH}, {DAY}, {NUMBER}, {NUMBER_YEAR}
   * Padding: {NUMBER:4} pads to 4 digits with zeros
   * @example "{PREFIX}-{YEAR}-{NUMBER:4}" → "INV-2026-0042"
   * @example "{YY}.{NUMBER_YEAR:3}" → "26.005"
   */
  invoiceNumberFormat: string;

  /** Next invoice number counter (global, all-time) - used by {NUMBER} */
  nextInvoiceNumber: number;

  /** Per-year invoice counters - used by {NUMBER_YEAR} */
  invoiceCountersByYear: YearCounters;

  // === Default Texts ===

  /** Default intro text for new documents */
  defaultIntroText?: string;

  /** Default notes text for new documents */
  defaultNotesText?: string;

  /** Default footer text for new documents */
  defaultFooterText?: string;

  /** Customizable labels for PDF documents */
  labels: DocumentLabelsDto;

  /** UI theme preference */
  theme: ThemePreference;

  /** UI language preference */
  language: LanguagePreference;

  /** Date format preference */
  dateFormat: string; // e.g., "DD-MM-YYYY" or "MM/DD/YYYY"

  /** Fiscal year start month (1 = January, default for Netherlands) */
  fiscalYearStartMonth: FiscalYearStartMonth;

  /** Last updated timestamp */
  updatedAt: string; // ISO 8601 date string
}

/** DTO for updating settings */
export interface UpdateSettingsDto {
  storagePath?: string;
  currency?: CurrencyCode;
  currencySymbol?: string;
  defaultTaxRate?: number;
  defaultPaymentTermDays?: number;

  // Offer numbering
  offerPrefix?: string;
  offerNumberFormat?: string;
  nextOfferNumber?: number;
  offerCountersByYear?: YearCounters;

  // Invoice numbering
  invoicePrefix?: string;
  invoiceNumberFormat?: string;
  nextInvoiceNumber?: number;
  invoiceCountersByYear?: YearCounters;

  // Default texts
  defaultIntroText?: string;
  defaultNotesText?: string;
  defaultFooterText?: string;
  labels?: Partial<DocumentLabelsDto>;

  // UI preferences
  theme?: ThemePreference;
  language?: LanguagePreference;
  dateFormat?: string;
  fiscalYearStartMonth?: FiscalYearStartMonth;
}

/** DTO for settings response */
export interface SettingsResponseDto {
  settings: SettingsDto;
}

/** Default labels (English) */
export const DEFAULT_LABELS: DocumentLabelsDto = {
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

  // Company details labels
  telLabel: 'Tel:',
  emailLabel: 'E-mail:',
  kvkLabel: 'CoC:',
  vatIdLabel: 'VAT:',
  ibanLabel: 'IBAN:',

  // Footer (use {company}, {email}, {phone} as placeholders)
  thankYouText: 'Thank you for your business with {company}!',
  questionsTextOffer:
    'If you have questions about this quote, please contact us at {email} or {phone}.',
  questionsTextInvoice:
    'If you have questions about this invoice, please contact us at {email} or {phone}.',
};

/** Dutch labels preset */
export const DUTCH_LABELS: DocumentLabelsDto = {
  // Document type titles
  offerTitle: 'Offerte',
  invoiceTitle: 'Factuur',

  // Document metadata
  documentDateLabel: 'Datum',
  dueDateLabel: 'Vervaldatum',
  offerNumberLabel: 'Offertenummer',
  invoiceNumberLabel: 'Factuurnummer',

  // Customer section
  customerSectionTitleOffer: 'Klantgegevens',
  customerSectionTitleInvoice: 'Factuuradres',

  // Intro section
  introSectionLabel: 'Omschrijving',

  // Line items table
  descriptionLabel: 'Omschrijving',
  quantityLabel: 'Aantal',
  unitPriceLabel: 'Prijs p/e',
  amountLabel: 'Totaal',

  // Totals
  subtotalLabel: 'Subtotaal',
  taxLabel: 'BTW',
  totalLabel: 'Totaal',

  // Notes section
  notesSectionLabel: 'Aanvullende informatie',

  // Payment terms
  paymentTermsTitleOffer: 'Voorwaarden',
  paymentTermsTitleInvoice: 'Betalingsvoorwaarden',

  // Company details labels
  telLabel: 'Tel:',
  emailLabel: 'E-mail:',
  kvkLabel: 'KvK:',
  vatIdLabel: 'BTW:',
  ibanLabel: 'IBAN:',

  // Footer
  thankYouText: 'Bedankt voor het vertrouwen in {company}!',
  questionsTextOffer: 'Bij vragen over deze offerte kunt u contact opnemen via {email} of {phone}.',
  questionsTextInvoice:
    'Bij vragen over deze factuur kunt u contact opnemen via {email} of {phone}.',
};

/** Default document number format (matches legacy hardcoded format) */
export const DEFAULT_DOCUMENT_NUMBER_FORMAT = '{PREFIX}-{YEAR}-{NUMBER:4}';

/** Default settings values */
export const DEFAULT_SETTINGS: Omit<SettingsDto, 'storagePath' | 'updatedAt'> = {
  currency: 'EUR',
  currencySymbol: '€',
  defaultTaxRate: 21,
  defaultPaymentTermDays: 14,

  // Offer numbering
  offerPrefix: 'OFF',
  offerNumberFormat: DEFAULT_DOCUMENT_NUMBER_FORMAT,
  nextOfferNumber: 1,
  offerCountersByYear: {},

  // Invoice numbering
  invoicePrefix: 'INV',
  invoiceNumberFormat: DEFAULT_DOCUMENT_NUMBER_FORMAT,
  nextInvoiceNumber: 1,
  invoiceCountersByYear: {},

  // Default texts
  defaultIntroText: undefined,
  defaultNotesText: undefined,
  defaultFooterText: undefined,
  labels: DEFAULT_LABELS,

  // UI preferences
  theme: 'system',
  language: 'en-US',
  dateFormat: 'DD-MM-YYYY',
  fiscalYearStartMonth: 1, // January - default for Netherlands
};
