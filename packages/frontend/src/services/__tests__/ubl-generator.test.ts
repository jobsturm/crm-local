import { describe, it, expect } from 'vitest';
import { create } from 'xmlbuilder2';
import { generateUblXml, validateForUbl } from '../ubl-generator';
import type { DocumentDto, BusinessDto, SettingsDto } from '@crm-local/shared';

function makeInvoice(overrides: Record<string, unknown> = {}): DocumentDto {
  return {
    id: 'inv-1',
    documentType: 'invoice' as const,
    documentNumber: 'INV-2026-0001',
    documentTitle: 'Invoice',
    customerId: 'cust-1',
    customer: { name: 'Test Customer', company: 'Test BV', postalCode: '1234AB', city: 'Amsterdam', country: 'NL' },
    items: [
      { id: 'item-1', description: 'Web development', quantity: 10, unitPrice: 10000, total: 100000 },
      { id: 'item-2', description: 'Design', quantity: 5, unitPrice: 8000, total: 40000 },
    ],
    subtotal: 140000,
    taxRate: 21,
    taxAmount: 29400,
    total: 169400,
    paymentTermDays: 14,
    dueDate: '2026-08-07T00:00:00.000Z',
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:00:00.000Z',
    status: 'sent' as const,
    statusHistory: [],
    introText: '',
    notesText: '',
    footerText: '',
    ...overrides,
  } as DocumentDto;
}

function makeBusiness(overrides: Record<string, unknown> = {}): BusinessDto {
  return {
    name: 'My Company BV',
    address: { street: 'Teststraat 1', city: 'Amsterdam', state: '', postalCode: '1234AB', country: 'NL' },
    phone: '0612345678',
    email: 'info@mycompany.nl',
    taxId: 'NL123456789B01',
    chamberOfCommerce: '12345678',
    bankDetails: { bankName: 'ING', accountHolder: 'My Company BV', iban: 'NL91ABNA0417164300', bic: 'ABNANL2A' },
    updatedAt: '2026-07-24T10:00:00.000Z',
    ...overrides,
  } as BusinessDto;
}

function makeSettings(overrides: Record<string, unknown> = {}): SettingsDto {
  return { currency: 'EUR', ...overrides } as SettingsDto;
}

describe('generateUblXml', () => {
  it('produces well-formed XML', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    expect(() => create(xml)).not.toThrow();
  });

  it('maintains correct element order', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    expect(xml.indexOf('CustomizationID')).toBeLessThan(xml.indexOf('ProfileID'));
    expect(xml.indexOf('ProfileID')).toBeLessThan(xml.indexOf('<cbc:ID>'));
  });

  it('includes currencyID attributes', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    expect(xml).toContain('currencyID="EUR"');
  });

  it('includes BuyerReference with document number', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    expect(xml).toContain('<cbc:BuyerReference>INV-2026-0001</cbc:BuyerReference>');
  });

  it('includes unitCode C62', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    expect(xml).toContain('unitCode="C62"');
  });

  it('uses Z tax category for zero tax rate', () => {
    const xml = generateUblXml(
      makeInvoice({ taxRate: 0, taxAmount: 0, total: 140000 }),
      makeBusiness(),
      makeSettings(),
    );
    expect(xml).toContain('<cbc:ID>Z</cbc:ID>');
    expect(xml).not.toContain('<cbc:ID>S</cbc:ID>');
  });

  it('handles XML-unsafe characters without throwing', () => {
    const xml = generateUblXml(
      makeInvoice(),
      makeBusiness({ name: 'Smith & Sons <BV> "quoted"' }),
      makeSettings(),
    );
    expect(() => create(xml)).not.toThrow();
  });

  it('converts cents to decimal amounts', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    expect(xml).toContain('1400.00');
    expect(xml).not.toContain('140000');
  });

  it('omits PartyTaxScheme when taxId is missing', () => {
    const xml = generateUblXml(
      makeInvoice(),
      makeBusiness({ taxId: undefined }),
      makeSettings(),
    );
    expect(xml).not.toContain('PartyTaxScheme');
  });

  it('omits PaymentMeans when bankDetails is missing', () => {
    const xml = generateUblXml(
      makeInvoice(),
      makeBusiness({ bankDetails: undefined }),
      makeSettings(),
    );
    expect(xml).not.toContain('PaymentMeans');
  });

  it('throws for offers', () => {
    expect(() =>
      generateUblXml(makeInvoice({ documentType: 'offer' }), makeBusiness(), makeSettings()),
    ).toThrow('only supported for invoices');
  });

  it('satisfies BR-CO-15 (TaxInclusive = TaxExclusive + TaxAmount)', () => {
    const xml = generateUblXml(makeInvoice(), makeBusiness(), makeSettings());
    const taxExclusiveMatch = xml.match(/<cbc:TaxExclusiveAmount[^>]*>([\d.]+)</);
    const taxInclusiveMatch = xml.match(/<cbc:TaxInclusiveAmount[^>]*>([\d.]+)</);
    const taxAmountMatch = xml.match(/<cac:TaxTotal>\s*<cbc:TaxAmount[^>]*>([\d.]+)</);
    if (!taxExclusiveMatch?.[1] || !taxInclusiveMatch?.[1] || !taxAmountMatch?.[1]) {
      throw new Error('Expected regex matches not found in XML');
    }
    const taxExclusive = parseFloat(taxExclusiveMatch[1] as string);
    const taxInclusive = parseFloat(taxInclusiveMatch[1] as string);
    const taxAmount = parseFloat(taxAmountMatch[1] as string);
    expect(taxInclusive).toBeCloseTo(taxExclusive + taxAmount, 2);
  });

  it('includes Note element when notesText is present', () => {
    const xml = generateUblXml(
      makeInvoice({ notesText: 'Pay within 14 days' }),
      makeBusiness(),
      makeSettings(),
    );
    expect(xml).toContain('<cbc:Note>Pay within 14 days</cbc:Note>');
  });

  it('omits Note element when notesText is empty', () => {
    const xml = generateUblXml(
      makeInvoice({ notesText: '' }),
      makeBusiness(),
      makeSettings(),
    );
    expect(xml).not.toContain('<cbc:Note>');
  });
});

describe('validateForUbl', () => {
  it('returns blocking error for empty items', () => {
    const result = validateForUbl(makeInvoice({ items: [] }), makeBusiness());
    expect(result).toContainEqual(
      expect.objectContaining({ blocking: true, i18nKey: 'ubl.error.noItems' }),
    );
  });

  it('warns when taxId is missing', () => {
    const result = validateForUbl(makeInvoice(), makeBusiness({ taxId: undefined }));
    expect(result).toContainEqual(
      expect.objectContaining({ i18nKey: 'ubl.warning.noTaxId' }),
    );
  });

  it('returns empty array for complete data', () => {
    const result = validateForUbl(makeInvoice(), makeBusiness());
    expect(result).toEqual([]);
  });
});
