/**
 * PDF Preview Service
 *
 * Provides sample data and utilities for live PDF preview in settings.
 */

import type { DocumentDto, BusinessDto, SettingsDto, DocumentLabelsDto, CurrencyCode } from '@crm-local/shared';
import { DEFAULT_LABELS, formatDocumentNumber, buildDocumentNumberVariables, DEFAULT_INVOICE_NUMBER_FORMAT, DEFAULT_OFFER_NUMBER_FORMAT } from '@crm-local/shared';
import { generatePDFHTML } from './pdf-generator';

/**
 * Sample business info for PDF preview
 */
export const SAMPLE_BUSINESS: BusinessDto = {
  name: 'Acme Solutions BV',
  address: {
    street: 'Voorbeeldstraat 123',
    city: 'Amsterdam',
    state: '',
    postalCode: '1234 AB',
    country: 'Netherlands',
  },
  phone: '+31 20 123 4567',
  email: 'info@acme-solutions.nl',
  website: 'https://acme-solutions.nl',
  taxId: 'NL123456789B01',
  chamberOfCommerce: '12345678',
  bankDetails: {
    bankName: 'ING Bank',
    accountHolder: 'Acme Solutions BV',
    iban: 'NL00INGB0001234567',
    bic: 'INGBNL2A',
  },
  updatedAt: new Date().toISOString(),
};

/**
 * Sample invoice document for PDF preview
 */
export const SAMPLE_INVOICE: DocumentDto = {
  id: 'preview-001',
  documentType: 'invoice',
  documentNumber: 'INV-2026-0042',
  documentTitle: 'Invoice',
  customerId: 'customer-001',
  customer: {
    name: 'Jan de Vries',
    company: 'De Vries Consultancy',
    street: 'Klantweg 456',
    postalCode: '5678 CD',
    city: 'Rotterdam',
    country: 'Netherlands',
  },
  items: [
    {
      id: 'item-1',
      description: 'Website Development',
      quantity: 40,
      unitPrice: 95.0,
      total: 3800.0,
    },
    {
      id: 'item-2',
      description: 'UI/UX Design',
      quantity: 16,
      unitPrice: 85.0,
      total: 1360.0,
    },
    {
      id: 'item-3',
      description: 'Project Management',
      quantity: 8,
      unitPrice: 75.0,
      total: 600.0,
    },
  ],
  subtotal: 5760.0,
  taxRate: 21,
  taxAmount: 1209.6,
  total: 6969.6,
  status: 'sent',
  statusHistory: [],
  paymentTermDays: 14,
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  introText: 'Thank you for your business. Please find the details of our services below.',
  notesText: 'All prices are in EUR.',
  footerText: 'Payment within 14 days to IBAN: NL00INGB0001234567',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Sample offer document for PDF preview
 */
export const SAMPLE_OFFER: DocumentDto = {
  ...SAMPLE_INVOICE,
  id: 'preview-002',
  documentType: 'offer',
  documentNumber: 'OFF-2026-0015',
  documentTitle: 'Quote',
  status: 'draft',
  introText: 'We are pleased to present you with our quote for the requested services.',
  footerText: 'This quote is valid for 30 days from the date of issue.',
};

/**
 * Preview options for customizing the PDF preview
 */
export interface PreviewOptions {
  labels?: Partial<DocumentLabelsDto>;
  documentType?: 'offer' | 'invoice';
  business?: BusinessDto;
  currency?: CurrencyCode;
  currencySymbol?: string;
  defaultTaxRate?: number;
  defaultPaymentTermDays?: number;
  defaultIntroText?: string;
  defaultNotesText?: string;
  defaultFooterText?: string;
  /** Document number prefixes */
  offerPrefix?: string;
  invoicePrefix?: string;
  /** Document number format templates */
  offerNumberFormat?: string;
  invoiceNumberFormat?: string;
  /** Document number counters */
  nextOfferNumber?: number;
  nextInvoiceNumber?: number;
  offerCountersByYear?: Record<string, number>;
  invoiceCountersByYear?: Record<string, number>;
  /** Enable interactive mode - makes labels clickable for editing */
  interactive?: boolean;
}

/**
 * Generate preview HTML with custom labels and settings
 */
export function generatePreviewHTML(options: PreviewOptions = {}): string {
  const {
    labels = {},
    documentType = 'invoice',
    business,
    currency = 'EUR',
    currencySymbol = '€',
    defaultTaxRate = 21,
    defaultPaymentTermDays = 14,
    defaultIntroText,
    defaultNotesText,
    defaultFooterText,
    offerPrefix = 'OFF',
    invoicePrefix = 'INV',
    offerNumberFormat = DEFAULT_OFFER_NUMBER_FORMAT,
    invoiceNumberFormat = DEFAULT_INVOICE_NUMBER_FORMAT,
    nextOfferNumber = 1,
    nextInvoiceNumber = 1,
    offerCountersByYear = {},
    invoiceCountersByYear = {},
    interactive = false,
  } = options;

  const baseDocument = documentType === 'offer' ? SAMPLE_OFFER : SAMPLE_INVOICE;
  
  // Generate document number using the template system
  const isOffer = documentType === 'offer';
  const prefix = isOffer ? offerPrefix : invoicePrefix;
  const format = isOffer ? offerNumberFormat : invoiceNumberFormat;
  const globalCounter = isOffer ? nextOfferNumber : nextInvoiceNumber;
  const countersByYear = isOffer ? offerCountersByYear : invoiceCountersByYear;
  const currentYear = new Date().getFullYear().toString();
  const yearCounter = countersByYear[currentYear] ?? 1;
  
  const variables = buildDocumentNumberVariables(prefix, globalCounter, yearCounter);
  const updatedDocumentNumber = formatDocumentNumber(format, variables);

  // Update document with custom settings
  const updatedDocument: DocumentDto = {
    ...baseDocument,
    documentNumber: updatedDocumentNumber,
    documentTitle: documentType === 'offer' 
      ? (labels.offerTitle ?? DEFAULT_LABELS.offerTitle)
      : (labels.invoiceTitle ?? DEFAULT_LABELS.invoiceTitle),
    taxRate: defaultTaxRate,
    paymentTermDays: defaultPaymentTermDays,
    // Recalculate tax and total based on new tax rate
    taxAmount: baseDocument.subtotal * (defaultTaxRate / 100),
    total: baseDocument.subtotal * (1 + defaultTaxRate / 100),
    // Use custom texts if provided
    introText: defaultIntroText ?? baseDocument.introText,
    notesText: defaultNotesText ?? baseDocument.notesText,
    footerText: defaultFooterText ?? baseDocument.footerText,
  };

  const settings: SettingsDto = {
    storagePath: '',
    currency,
    currencySymbol,
    defaultTaxRate,
    defaultPaymentTermDays,
    // Offer numbering
    offerPrefix,
    offerNumberFormat,
    nextOfferNumber,
    offerCountersByYear,
    // Invoice numbering
    invoicePrefix,
    invoiceNumberFormat,
    nextInvoiceNumber,
    invoiceCountersByYear,
    labels: {
      ...DEFAULT_LABELS,
      ...labels,
    },
    theme: 'system',
    language: 'en-US',
    dateFormat: 'DD-MM-YYYY',
    fiscalYearStartMonth: 1,
    updatedAt: new Date().toISOString(),
  };

  return generatePDFHTML(updatedDocument, business ?? SAMPLE_BUSINESS, settings, interactive);
}
