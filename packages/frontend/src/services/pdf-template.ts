/**
 * PDF Template Service
 *
 * Uses Handlebars for templating with an 'editable' helper
 * that makes fields clickable in preview mode.
 */

import Handlebars from 'handlebars';
import type { DocumentDto, BusinessDto, SettingsDto } from '@crm-local/shared';

// Context type for Handlebars templates
interface TemplateContext {
  document: DocumentDto;
  business: BusinessDto;
  settings: SettingsDto;
  labels: SettingsDto['labels'];
  currencySymbol: string;
  isOffer: boolean;
  interactive: boolean;
}

// Helper to safely get root context
function getRootContext(options: Handlebars.HelperOptions): TemplateContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return options.data.root as TemplateContext;
}

// Register custom helpers
Handlebars.registerHelper('editable', function (
  this: unknown,
  fieldKey: string,
  text: string,
  options: Handlebars.HelperOptions
) {
  const root = getRootContext(options);
  const interactive = root.interactive;
  const escaped = Handlebars.escapeExpression(text);

  if (interactive && text) {
    return new Handlebars.SafeString(
      `<span class="editable" data-field="${fieldKey}" ` +
        `style="cursor:pointer;border-bottom:1px dashed #3b82f6;transition:background 0.2s;" ` +
        `onmouseover="this.style.background='#dbeafe'" ` +
        `onmouseout="this.style.background='transparent'" ` +
        `onclick="window.parent.postMessage({type:'editLabel',field:'${fieldKey}'},'*')"` +
        `>${escaped}</span>`
    );
  }
  return text;
});

Handlebars.registerHelper('currency', function (
  this: unknown,
  amount: number,
  symbol: string,
  options: Handlebars.HelperOptions
) {
  const root = getRootContext(options);
  const formatted = `${symbol}${amount.toFixed(2)}`;
  
  // In interactive mode, make the currency symbol clickable
  if (root.interactive) {
    const escapedSymbol = Handlebars.escapeExpression(symbol);
    const clickableSymbol = 
      `<span class="editable" data-field="settings.currencySymbol" ` +
      `style="cursor:pointer;border-bottom:1px dashed #3b82f6;transition:background 0.2s;" ` +
      `onmouseover="this.style.background='#dbeafe'" ` +
      `onmouseout="this.style.background='transparent'" ` +
      `onclick="window.parent.postMessage({type:'editLabel',field:'settings.currencySymbol'},'*')"` +
      `>${escapedSymbol}</span>`;
    return new Handlebars.SafeString(`${clickableSymbol}${amount.toFixed(2)}`);
  }
  
  return formatted;
});

Handlebars.registerHelper('formatNumber', function (amount: number) {
  return amount.toFixed(2);
});

Handlebars.registerHelper('formatDate', function (dateString: string, format: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return format.replace('DD', day).replace('MM', month).replace('YYYY', String(year));
});

Handlebars.registerHelper('ifOffer', function (this: unknown, options: Handlebars.HelperOptions) {
  const ctx = this as { isOffer: boolean };
  return ctx.isOffer ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('replacePlaceholders', function (text: string | Handlebars.SafeString, options: Handlebars.HelperOptions) {
  const root = getRootContext(options);
  // Convert SafeString to string if needed
  const textStr = typeof text === 'string' ? text : text.toString();
  const result = textStr
    .replace(/\{company\}/g, root.business.name)
    .replace(/\{email\}/g, root.business.email)
    .replace(/\{phone\}/g, root.business.phone);
  // Preserve SafeString if input was SafeString (to keep HTML intact)
  return typeof text === 'string' ? result : new Handlebars.SafeString(result);
});

// The Handlebars template
const templateSource = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{document.documentTitle}} {{document.documentNumber}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
        }
        
        .header {
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .header::after {
            content: "";
            display: table;
            clear: both;
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
        }
        
        .company-logo-section {
            text-align: left;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .company-details-row {
            display: flex;
            justify-content: flex-start;
            gap: 80px;
        }
        
        .company-address,
        .company-contact,
        .company-business {
            text-align: left;
            font-size: 11px;
            color: #6b7280;
        }
        
        .invoice-title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .invoice-details {
            font-size: 11px;
            color: #6b7280;
        }
        
        .customer-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .customer-info {
            background-color: #f9fafb;
            padding: 15px;
            border-left: 4px solid #3b82f6;
        }
        
        .intro-text, .notes-text {
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 4px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .products-table th {
            background-color: #f3f4f6;
            padding: 8px 10px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #d1d5db;
            font-size: 10px;
        }
        
        .products-table td {
            padding: 6px 10px;
            border: 1px solid #d1d5db;
            font-size: 10px;
        }
        
        .products-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .total-section {
            float: right;
            width: 250px;
            margin-bottom: 20px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
        }
        
        .total-row.final {
            background-color: #1f2937;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        
        .footer {
            clear: both;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
        }
        
        .payment-info {
            margin-bottom: 20px;
            font-size: 11px;
            color: #4b5563;
        }
        
        a {
            color: #3b82f6;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        @media print {
            body {
                padding: 0;
            }
        }
        
        @page {
            size: A4;
            margin: 20mm;
        }
        
        .products-table {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .total-section {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .header {
            page-break-after: avoid;
            break-after: avoid;
        }
        
        body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        * {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }

        .editable:hover {
            background: #dbeafe;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div class="company-logo-section">
                <div class="company-name">{{editable "business.name" business.name}}</div>
            </div>
            
            <div class="invoice-info">
                <div class="invoice-title">{{#ifOffer}}{{editable "offerTitle" labels.offerTitle}}{{else}}{{editable "invoiceTitle" labels.invoiceTitle}}{{/ifOffer}}</div>
                <div class="invoice-details">
                    <strong>{{#ifOffer}}{{editable "offerNumberLabel" labels.offerNumberLabel}}{{else}}{{editable "invoiceNumberLabel" labels.invoiceNumberLabel}}{{/ifOffer}}:</strong> {{#ifOffer}}{{editable "settings.offerPrefix" settings.offerPrefix}}{{else}}{{editable "settings.invoicePrefix" settings.invoicePrefix}}{{/ifOffer}}-{{documentYear}}-{{documentSeq}}<br>
                    <strong>{{editable "documentDateLabel" labels.documentDateLabel}}:</strong> {{formatDate document.createdAt settings.dateFormat}}<br>
                    <strong>{{editable "dueDateLabel" labels.dueDateLabel}}:</strong> {{formatDate document.dueDate settings.dateFormat}}
                </div>
            </div>
        </div>
        
        <div class="company-details-row">
            <div class="company-address">
                {{editable "business.address.street" business.address.street}}<br>
                {{editable "business.address.postalCode" business.address.postalCode}} {{editable "business.address.city" business.address.city}}
            </div>
            
            <div class="company-contact">
                {{#if business.phone}}{{editable "telLabel" labels.telLabel}} {{editable "business.phone" business.phone}}<br>{{/if}}
                {{#if business.email}}{{editable "emailLabel" labels.emailLabel}} {{editable "business.email" business.email}}{{/if}}
            </div>
            
            <div class="company-business">
                {{#if business.chamberOfCommerce}}{{editable "kvkLabel" labels.kvkLabel}} {{editable "business.chamberOfCommerce" business.chamberOfCommerce}}<br>{{/if}}
                {{#if business.taxId}}{{editable "vatIdLabel" labels.vatIdLabel}} {{editable "business.taxId" business.taxId}}<br>{{/if}}
                {{#if business.bankDetails.iban}}{{editable "ibanLabel" labels.ibanLabel}} {{editable "business.bankDetails.iban" business.bankDetails.iban}}{{/if}}
            </div>
        </div>
    </div>

    <div class="customer-section">
        <div class="section-title">{{#ifOffer}}{{editable "customerSectionTitleOffer" labels.customerSectionTitleOffer}}{{else}}{{editable "customerSectionTitleInvoice" labels.customerSectionTitleInvoice}}{{/ifOffer}}</div>
        <div class="customer-info">
            <strong>{{document.customer.name}}</strong><br>
            {{#if document.customer.company}}{{document.customer.company}}<br>{{/if}}
            {{document.customer.street}}<br>
            {{document.customer.postalCode}} {{document.customer.city}}
        </div>
    </div>

    {{#if document.introText}}
    <div class="intro-text">
        <div class="section-title">{{editable "introSectionLabel" labels.introSectionLabel}}</div>
        {{editable "settings.defaultIntroText" document.introText}}
    </div>
    {{/if}}

    <table class="products-table">
        <thead>
            <tr>
                <th style="width: 50%">{{editable "descriptionLabel" labels.descriptionLabel}}</th>
                <th style="width: 15%" class="text-center">{{editable "quantityLabel" labels.quantityLabel}}</th>
                <th style="width: 15%" class="text-right">{{editable "unitPriceLabel" labels.unitPriceLabel}}</th>
                <th style="width: 20%" class="text-right">{{editable "amountLabel" labels.amountLabel}}</th>
            </tr>
        </thead>
        <tbody>
            {{#each document.items}}
            <tr>
                <td>{{this.description}}</td>
                <td class="text-center">{{this.quantity}}</td>
                <td class="text-right">{{currency this.unitPrice ../currencySymbol}}</td>
                <td class="text-right">{{currency this.total ../currencySymbol}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>{{editable "subtotalLabel" labels.subtotalLabel}}:</span>
            <span>{{editable "settings.currencySymbol" currencySymbol}}{{formatNumber document.subtotal}}</span>
        </div>
        <div class="total-row">
            <span>{{editable "taxLabel" labels.taxLabel}} ({{editable "settings.defaultTaxRate" document.taxRate}}%):</span>
            <span>{{editable "settings.currencySymbol" currencySymbol}}{{formatNumber document.taxAmount}}</span>
        </div>
        <div class="total-row final">
            <span>{{editable "totalLabel" labels.totalLabel}}:</span>
            <span>{{editable "settings.currencySymbol" currencySymbol}}{{formatNumber document.total}}</span>
        </div>
    </div>

    {{#if document.notesText}}
    <div class="notes-text">
        <div class="section-title">{{editable "notesSectionLabel" labels.notesSectionLabel}}</div>
        {{editable "settings.defaultNotesText" document.notesText}}
    </div>
    {{/if}}

    {{#if document.footerText}}
    <div class="payment-info">
        <strong>{{#ifOffer}}{{editable "paymentTermsTitleOffer" labels.paymentTermsTitleOffer}}{{else}}{{editable "paymentTermsTitleInvoice" labels.paymentTermsTitleInvoice}}{{/ifOffer}}:</strong><br>
        {{editable "settings.defaultFooterText" document.footerText}}
    </div>
    {{/if}}

    <div class="footer">
        <p>{{replacePlaceholders (editable "thankYouText" labels.thankYouText)}}</p>
        <p>{{#ifOffer}}{{replacePlaceholders (editable "questionsTextOffer" labels.questionsTextOffer)}}{{else}}{{replacePlaceholders (editable "questionsTextInvoice" labels.questionsTextInvoice)}}{{/ifOffer}}</p>
    </div>
</body>
</html>`;

// Compile the template once
const compiledTemplate = Handlebars.compile(templateSource);

// Register concat helper for dynamic field names
Handlebars.registerHelper('concat', function (...args: unknown[]) {
  // Remove the options object (last argument)
  args.pop();
  return args.join('');
});

// Register if helper that returns value
Handlebars.registerHelper('if', function (this: unknown, conditional: unknown, options: Handlebars.HelperOptions) {
  if (conditional) {
    return options.fn(this);
  }
  return options.inverse(this);
});

export interface PDFTemplateOptions {
  document: DocumentDto;
  business: BusinessDto;
  settings: SettingsDto;
  interactive?: boolean;
}

/**
 * Generate PDF HTML using Handlebars template
 */
export function generatePDFHTMLFromTemplate(options: PDFTemplateOptions): string {
  const { document, business, settings, interactive = false } = options;
  const isOffer = document.documentType === 'offer';

  // Extract year and sequence from document number (e.g., "INV-2026-0042" -> year: "2026", seq: "0042")
  const numberParts = document.documentNumber.split('-');
  const documentYear = numberParts.length >= 2 ? numberParts[1] : new Date().getFullYear().toString();
  const documentSeq = numberParts.length >= 3 ? numberParts[2] : '0001';

  const context = {
    document,
    business,
    settings,
    labels: settings.labels,
    currencySymbol: settings.currencySymbol,
    isOffer,
    interactive,
    documentYear,
    documentSeq,
  };

  return compiledTemplate(context);
}
