/**
 * Migration: v1.0.0 → v1.1.0
 *
 * Adds document number templating system:
 * - invoiceNumberFormat: template string for invoice numbers
 * - offerNumberFormat: template string for offer numbers
 * - invoiceCountersByYear: per-year invoice counters
 * - offerCountersByYear: per-year offer counters
 */

import type { DatabaseDto } from '@crm-local/shared';

/** Database shape before migration (v1.0.0) */
interface DatabaseV1_0_0 {
  version: string;
  customers: unknown[];
  business: unknown | null;
  settings: {
    currency: string;
    currencySymbol: string;
    defaultTaxRate: number;
    defaultPaymentTermDays: number;
    offerPrefix: string;
    nextOfferNumber: number;
    invoicePrefix: string;
    nextInvoiceNumber: number;
    defaultIntroText?: string;
    defaultNotesText?: string;
    defaultFooterText?: string;
    labels: Record<string, string>;
    theme: string;
    language: string;
    dateFormat: string;
    fiscalYearStartMonth: number;
    updatedAt: string;
  };
}

/** Default format that matches the legacy hardcoded format */
const DEFAULT_FORMAT = '{PREFIX}-{YEAR}-{NUMBER:4}';

/**
 * Migrate database from v1.0.0 to v1.1.0
 */
export function migrate(data: DatabaseV1_0_0): DatabaseDto {
  return {
    ...data,
    version: '1.1.0',
    settings: {
      ...data.settings,
      // Add new template format fields with default that matches old behavior
      invoiceNumberFormat: DEFAULT_FORMAT,
      offerNumberFormat: DEFAULT_FORMAT,
      // Add empty per-year counters (will be populated on first use)
      invoiceCountersByYear: {},
      offerCountersByYear: {},
    },
  } as unknown as DatabaseDto;
}

/** Source version this migration handles */
export const fromVersion = '1.0.0';

/** Target version after migration */
export const toVersion = '1.1.0';
