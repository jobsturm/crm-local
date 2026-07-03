import { describe, it, expect } from 'vitest';
import { migrateDocumentFile } from '../src/migrations/documents/recalculate-tax.js';
import type { DocumentFileDto } from '@crm-local/shared';

// Minimal DocumentDto shape for testing — only fields used by the migration
function makeDocumentFile(overrides: {
  version: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}): DocumentFileDto {
  return {
    version: overrides.version,
    document: {
      id: 'test-id',
      documentType: 'invoice',
      documentNumber: 'INV-2026-0001',
      documentTitle: 'Invoice',
      customerId: 'cust-1',
      customer: {
        name: 'Test Customer',
        postalCode: '',
        city: '',
      },
      items: [],
      subtotal: overrides.subtotal,
      taxRate: overrides.taxRate,
      taxAmount: overrides.taxAmount,
      total: overrides.total,
      status: 'draft',
      statusHistory: [],
      paymentTermDays: 30,
      dueDate: '2026-01-31T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as DocumentFileDto['document'],
  };
}

describe('migrateDocumentFile', () => {
  it('migrates v1.0.0 document with wrong whole-euro taxAmount', () => {
    const input = makeDocumentFile({
      version: '1.0.0',
      subtotal: 1351.25,
      taxRate: 21,
      taxAmount: 284, // wrong: was Math.round(283.7625) = 284
      total: 1635, // wrong: 1351.25 + 284
    });
    const { file, changed } = migrateDocumentFile(input);
    expect(changed).toBe(true);
    expect(file.version).toBe('1.1.0');
    expect(file.document.taxAmount).toBe(283.76);
    expect(file.document.total).toBe(1635.01);
  });

  it('preserves subtotal unchanged', () => {
    const input = makeDocumentFile({
      version: '1.0.0',
      subtotal: 1351.25,
      taxRate: 21,
      taxAmount: 284,
      total: 1635,
    });
    const { file } = migrateDocumentFile(input);
    expect(file.document.subtotal).toBe(1351.25);
  });

  it('is idempotent: v1.1.0 documents are returned unchanged', () => {
    const input = makeDocumentFile({
      version: '1.1.0',
      subtotal: 1351.25,
      taxRate: 21,
      taxAmount: 283.76,
      total: 1635.01,
    });
    const { file, changed } = migrateDocumentFile(input);
    expect(changed).toBe(false);
    expect(file).toBe(input); // same reference — not a copy
  });

  it('handles zero tax rate', () => {
    const input = makeDocumentFile({
      version: '1.0.0',
      subtotal: 1000,
      taxRate: 0,
      taxAmount: 0,
      total: 1000,
    });
    const { file, changed } = migrateDocumentFile(input);
    expect(changed).toBe(true);
    expect(file.document.taxAmount).toBe(0);
    expect(file.document.total).toBe(1000);
  });
});
