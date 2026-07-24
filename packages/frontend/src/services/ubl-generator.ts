import { create } from './xml-builder';
import type { DocumentDto, BusinessDto, SettingsDto } from '@crm-local/shared';
import { toIso3166Alpha2 } from './ubl-country-codes';

export interface UblValidationWarning {
  field: string;
  i18nKey: string;
  blocking?: boolean;
}

export function validateForUbl(document: DocumentDto, business: BusinessDto): UblValidationWarning[] {
  const warnings: UblValidationWarning[] = [];

  if (document.items.length === 0) {
    warnings.push({ field: 'items', i18nKey: 'ubl.error.noItems', blocking: true });
  }
  if (!business.taxId) {
    warnings.push({ field: 'taxId', i18nKey: 'ubl.warning.noTaxId' });
  }
  if (!toIso3166Alpha2(business.address.country)) {
    warnings.push({ field: 'sellerCountry', i18nKey: 'ubl.warning.sellerCountry' });
  }
  if (!business.bankDetails?.iban) {
    warnings.push({ field: 'iban', i18nKey: 'ubl.warning.noIban' });
  }
  if (!document.customer.country || !toIso3166Alpha2(document.customer.country)) {
    warnings.push({ field: 'buyerCountry', i18nKey: 'ubl.warning.buyerCountry' });
  }

  return warnings;
}

const money = (cents: number): string => (cents / 100).toFixed(2);
const isoDate = (iso: string): string => iso.slice(0, 10);

export function generateUblXml(document: DocumentDto, business: BusinessDto, settings: SettingsDto): string {
  if (document.documentType !== 'invoice') {
    throw new Error('UBL export is only supported for invoices');
  }

  const currency = settings.currency;
  const sellerCountryCode = toIso3166Alpha2(business.address.country);
  const buyerCountryCode = toIso3166Alpha2(document.customer.country);

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Invoice', {
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    });

  root.ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0').up();
  root.ele('cbc:ProfileID').txt('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0').up();
  root.ele('cbc:ID').txt(document.documentNumber).up();
  root.ele('cbc:IssueDate').txt(isoDate(document.createdAt)).up();
  root.ele('cbc:DueDate').txt(isoDate(document.dueDate)).up();
  root.ele('cbc:InvoiceTypeCode').txt('380').up();

  if (document.notesText) {
    root.ele('cbc:Note').txt(document.notesText).up();
  }

  root.ele('cbc:DocumentCurrencyCode').txt(currency).up();
  root.ele('cbc:BuyerReference').txt(document.documentNumber).up();

  // Supplier
  const supplierParty = root.ele('cac:AccountingSupplierParty').ele('cac:Party');
  supplierParty.ele('cac:PartyName').ele('cbc:Name').txt(business.name).up().up();

  const supplierAddress = supplierParty.ele('cac:PostalAddress');
  if (business.address.street) {
    supplierAddress.ele('cbc:StreetName').txt(business.address.street).up();
  }
  supplierAddress.ele('cbc:CityName').txt(business.address.city).up();
  supplierAddress.ele('cbc:PostalZone').txt(business.address.postalCode).up();
  if (sellerCountryCode) {
    supplierAddress.ele('cac:Country').ele('cbc:IdentificationCode').txt(sellerCountryCode).up().up();
  }
  supplierAddress.up();

  if (business.taxId) {
    const taxScheme = supplierParty.ele('cac:PartyTaxScheme');
    taxScheme.ele('cbc:CompanyID').txt(business.taxId).up();
    taxScheme.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
    taxScheme.up();
  }

  const supplierLegal = supplierParty.ele('cac:PartyLegalEntity');
  supplierLegal.ele('cbc:RegistrationName').txt(business.name).up();
  if (business.chamberOfCommerce) {
    supplierLegal.ele('cbc:CompanyID').txt(business.chamberOfCommerce).up();
  }
  supplierLegal.up();
  supplierParty.up().up();

  // Customer
  const buyerName = document.customer.company ?? document.customer.name;
  const customerParty = root.ele('cac:AccountingCustomerParty').ele('cac:Party');
  customerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyerName).up().up();

  const buyerAddress = customerParty.ele('cac:PostalAddress');
  if (document.customer.street) {
    buyerAddress.ele('cbc:StreetName').txt(document.customer.street).up();
  }
  buyerAddress.ele('cbc:CityName').txt(document.customer.city).up();
  buyerAddress.ele('cbc:PostalZone').txt(document.customer.postalCode).up();
  if (buyerCountryCode) {
    buyerAddress.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyerCountryCode).up().up();
  }
  buyerAddress.up();

  customerParty.ele('cac:PartyLegalEntity').ele('cbc:RegistrationName').txt(buyerName).up().up();
  customerParty.up().up();

  // Payment means
  if (business.bankDetails?.iban) {
    const paymentMeans = root.ele('cac:PaymentMeans');
    paymentMeans.ele('cbc:PaymentMeansCode').txt('30').up();
    const account = paymentMeans.ele('cac:PayeeFinancialAccount');
    account.ele('cbc:ID').txt(business.bankDetails.iban).up();
    account.ele('cbc:Name').txt(business.bankDetails.accountHolder).up();
    if (business.bankDetails.bic) {
      account.ele('cac:FinancialInstitutionBranch')
        .ele('cbc:ID').txt(business.bankDetails.bic).up()
        .up();
    }
    account.up();
    paymentMeans.up();
  }

  // Tax total
  const taxCategoryId = document.taxRate === 0 ? 'Z' : 'S';
  const taxTotal = root.ele('cac:TaxTotal');
  taxTotal.ele('cbc:TaxAmount').att('currencyID', currency).txt(money(document.taxAmount)).up();
  const taxSubtotal = taxTotal.ele('cac:TaxSubtotal');
  taxSubtotal.ele('cbc:TaxableAmount').att('currencyID', currency).txt(money(document.subtotal)).up();
  taxSubtotal.ele('cbc:TaxAmount').att('currencyID', currency).txt(money(document.taxAmount)).up();
  const taxCategory = taxSubtotal.ele('cac:TaxCategory');
  taxCategory.ele('cbc:ID').txt(taxCategoryId).up();
  taxCategory.ele('cbc:Percent').txt(String(document.taxRate)).up();
  taxCategory.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
  taxCategory.up();
  taxSubtotal.up();
  taxTotal.up();

  // Legal monetary total
  const legalTotal = root.ele('cac:LegalMonetaryTotal');
  legalTotal.ele('cbc:LineExtensionAmount').att('currencyID', currency).txt(money(document.subtotal)).up();
  legalTotal.ele('cbc:TaxExclusiveAmount').att('currencyID', currency).txt(money(document.subtotal)).up();
  legalTotal.ele('cbc:TaxInclusiveAmount').att('currencyID', currency).txt(money(document.total)).up();
  legalTotal.ele('cbc:PayableAmount').att('currencyID', currency).txt(money(document.total)).up();
  legalTotal.up();

  // Invoice lines
  document.items.forEach((item, index) => {
    const line = root.ele('cac:InvoiceLine');
    line.ele('cbc:ID').txt(String(index + 1)).up();
    line.ele('cbc:InvoicedQuantity').att('unitCode', 'C62').txt(String(item.quantity)).up();
    line.ele('cbc:LineExtensionAmount').att('currencyID', currency).txt(money(item.total)).up();

    const itemEl = line.ele('cac:Item');
    itemEl.ele('cbc:Description').txt(item.description).up();
    itemEl.ele('cbc:Name').txt(item.description.slice(0, 100)).up();
    const classifiedTax = itemEl.ele('cac:ClassifiedTaxCategory');
    classifiedTax.ele('cbc:ID').txt(taxCategoryId).up();
    classifiedTax.ele('cbc:Percent').txt(String(document.taxRate)).up();
    classifiedTax.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
    classifiedTax.up();
    itemEl.up();

    line.ele('cac:Price')
      .ele('cbc:PriceAmount').att('currencyID', currency).txt(money(item.unitPrice)).up()
      .up();

    line.up();
  });

  return root.doc().end({ prettyPrint: true });
}

export async function saveXmlFile(xml: string, fileName: string): Promise<void> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    const saveResult = await window.electronAPI.saveFileDialog({
      title: 'Save UBL XML',
      defaultPath: fileName,
      filters: [{ name: 'UBL XML', extensions: ['xml'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) return;

    const result = await window.electronAPI.saveTextFile(xml, saveResult.filePath);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to save XML file');
    }
  } else {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
