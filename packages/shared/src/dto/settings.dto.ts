/**
 * Settings DTOs - Shared between Frontend and Backend
 */

/** Available currency codes */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'AUD';

/** Theme preference */
export type ThemePreference = 'light' | 'dark' | 'system';

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

  // === Footer ===
  // Use {company} placeholder for company name, {email} for email, {phone} for phone
  thankYouText: string; // "Bedankt voor het vertrouwen in {company}!"
  questionsTextOffer: string; // "Bij vragen over deze offerte kunt u contact opnemen via {email} of {phone}."
  questionsTextInvoice: string; // "Bij vragen over deze factuur kunt u contact opnemen via {email} of {phone}."
}

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

  /** Prefix for offer numbers (e.g., "OFF" for "OFF-2026-0001") */
  offerPrefix: string;

  /** Next offer number counter */
  nextOfferNumber: number;

  /** Prefix for invoice numbers (e.g., "INV" for "INV-2026-0001") */
  invoicePrefix: string;

  /** Next invoice number counter */
  nextInvoiceNumber: number;

  /** Default intro text for new documents */
  defaultIntroText?: string;

  /** Default footer text for new documents */
  defaultFooterText?: string;

  /** Customizable labels for PDF documents */
  labels: DocumentLabelsDto;

  /** UI theme preference */
  theme: ThemePreference;

  /** Date format preference */
  dateFormat: string; // e.g., "DD-MM-YYYY" or "MM/DD/YYYY"

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
  offerPrefix?: string;
  invoicePrefix?: string;
  defaultIntroText?: string;
  defaultFooterText?: string;
  labels?: Partial<DocumentLabelsDto>;
  theme?: ThemePreference;
  dateFormat?: string;
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

  // Footer
  thankYouText: 'Bedankt voor het vertrouwen in {company}!',
  questionsTextOffer: 'Bij vragen over deze offerte kunt u contact opnemen via {email} of {phone}.',
  questionsTextInvoice:
    'Bij vragen over deze factuur kunt u contact opnemen via {email} of {phone}.',
};

/** Default settings values */
export const DEFAULT_SETTINGS: Omit<SettingsDto, 'storagePath' | 'updatedAt'> = {
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
  labels: DEFAULT_LABELS,
  theme: 'system',
  dateFormat: 'DD-MM-YYYY',
};
