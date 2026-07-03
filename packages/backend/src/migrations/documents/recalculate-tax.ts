/**
 * Document Migration: v1.0.0 → v1.1.0
 *
 * Recomputes taxAmount and total for all stored document files using
 * correct 2-decimal rounding (was previously rounded to whole euros).
 */

import type { DocumentFileDto } from '@crm-local/shared';
import { calculateTax, CURRENT_DOCUMENT_VERSION } from '@crm-local/shared';

export function migrateDocumentFile(file: DocumentFileDto): {
  file: DocumentFileDto;
  changed: boolean;
} {
  if (file.version !== '1.0.0') {
    return { file, changed: false };
  }
  const { subtotal, taxRate } = file.document;
  const { taxAmount, total } = calculateTax(subtotal, taxRate);
  return {
    file: {
      version: CURRENT_DOCUMENT_VERSION,
      document: { ...file.document, taxAmount, total },
    },
    changed: true,
  };
}
