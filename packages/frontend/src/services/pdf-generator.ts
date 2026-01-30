/**
 * PDF Generator Service
 *
 * Generates PDF documents from DocumentDto using Electron's printToPDF.
 * Uses customizable labels from SettingsDto for all text.
 *
 * In non-Electron environment, opens HTML in a new window for printing.
 */

import type { DocumentDto, BusinessDto, SettingsDto } from '@crm-local/shared';

export interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

interface SelectDirectoryOptions {
  title?: string;
  defaultPath?: string;
}

interface SelectDirectoryResult {
  canceled: boolean;
  filePath?: string;
}

interface ElectronAPI {
  saveFileDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  generatePDF: (html: string, filePath: string) => Promise<{ success: boolean; error?: string }>;
  selectDirectory: (options?: SelectDirectoryOptions) => Promise<SelectDirectoryResult>;
}

interface SaveDialogOptions {
  title: string;
  defaultPath: string;
  filters: Array<{ name: string; extensions: string[] }>;
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Replaces placeholders in a string with actual values
 */
function replacePlaceholders(
  text: string,
  values: { company?: string; email?: string; phone?: string }
): string {
  return text
    .replace(/\{company\}/g, values.company ?? '')
    .replace(/\{email\}/g, values.email ?? '')
    .replace(/\{phone\}/g, values.phone ?? '');
}

/**
 * Sanitizes a string for use in a filename
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

/**
 * Formats a number as currency
 */
function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Formats a date string according to a format pattern
 */
function formatDate(dateString: string, format: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return format.replace('DD', day).replace('MM', month).replace('YYYY', String(year));
}

/**
 * Generates HTML content for the PDF
 */
export function generatePDFHTML(
  document: DocumentDto,
  business: BusinessDto,
  settings: SettingsDto
): string {
  const labels = settings.labels;
  const isOffer = document.documentType === 'offer';
  const currencySymbol = settings.currencySymbol;

  // Format dates
  const documentDate = formatDate(document.createdAt, settings.dateFormat);
  const dueDate = formatDate(document.dueDate, settings.dateFormat);

  // Get appropriate labels based on document type
  const documentTitle = document.documentTitle;
  const numberLabel = isOffer ? labels.offerNumberLabel : labels.invoiceNumberLabel;
  const customerSectionTitle = isOffer
    ? labels.customerSectionTitleOffer
    : labels.customerSectionTitleInvoice;
  const paymentTermsTitle = isOffer
    ? labels.paymentTermsTitleOffer
    : labels.paymentTermsTitleInvoice;
  const questionsText = isOffer ? labels.questionsTextOffer : labels.questionsTextInvoice;

  // Build address string (handle optional fields)
  const businessAddress = [
    business.address.street,
    `${business.address.postalCode} ${business.address.city}`,
  ]
    .filter(Boolean)
    .join('<br>');

  const customerAddress = [
    document.customer.street,
    `${document.customer.postalCode} ${document.customer.city}`,
  ]
    .filter(Boolean)
    .join('<br>');

  // Replace footer placeholders
  const thankYouText = replacePlaceholders(labels.thankYouText, {
    company: business.name,
    email: business.email,
    phone: business.phone,
  });

  const questionsTextFinal = replacePlaceholders(questionsText, {
    company: business.name,
    email: business.email,
    phone: business.phone,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentTitle} ${document.documentNumber}</title>
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
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div class="company-logo-section">
                <div class="company-name">${business.name}</div>
            </div>
            
            <div class="invoice-info">
                <div class="invoice-title">${documentTitle}</div>
                <div class="invoice-details">
                    <strong>${numberLabel}:</strong> ${document.documentNumber}<br>
                    <strong>${labels.documentDateLabel}:</strong> ${documentDate}<br>
                    <strong>${labels.dueDateLabel}:</strong> ${dueDate}
                </div>
            </div>
        </div>
        
        <div class="company-details-row">
            <div class="company-address">
                ${businessAddress}
            </div>
            
            <div class="company-contact">
                ${business.phone ? `Tel: <a href="tel:${business.phone.replace(/\s/g, '')}">${business.phone}</a><br>` : ''}
                ${business.email ? `E-mail: <a href="mailto:${business.email}">${business.email}</a>` : ''}
            </div>
            
            <div class="company-business">
                ${business.chamberOfCommerce ? `KvK: ${business.chamberOfCommerce}<br>` : ''}
                ${business.taxId ? `VAT: ${business.taxId}<br>` : ''}
                ${business.bankDetails?.iban ? `IBAN: ${business.bankDetails.iban}` : ''}
            </div>
        </div>
    </div>

    <div class="customer-section">
        <div class="section-title">${customerSectionTitle}</div>
        <div class="customer-info">
            <strong>${document.customer.name}</strong><br>
            ${document.customer.company ? `${document.customer.company}<br>` : ''}
            ${customerAddress}
        </div>
    </div>

    ${
      document.introText
        ? `
    <div class="intro-text">
        <div class="section-title">${labels.introSectionLabel}</div>
        ${document.introText}
    </div>
    `
        : ''
    }

    <table class="products-table">
        <thead>
            <tr>
                <th style="width: 50%">${labels.descriptionLabel}</th>
                <th style="width: 15%" class="text-center">${labels.quantityLabel}</th>
                <th style="width: 15%" class="text-right">${labels.unitPriceLabel}</th>
                <th style="width: 20%" class="text-right">${labels.amountLabel}</th>
            </tr>
        </thead>
        <tbody>
            ${document.items
              .map(
                (item) => `
            <tr>
                <td>${item.description}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unitPrice, currencySymbol)}</td>
                <td class="text-right">${formatCurrency(item.total, currencySymbol)}</td>
            </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>${labels.subtotalLabel}:</span>
            <span>${formatCurrency(document.subtotal, currencySymbol)}</span>
        </div>
        <div class="total-row">
            <span>${labels.taxLabel} (${document.taxRate}%):</span>
            <span>${formatCurrency(document.taxAmount, currencySymbol)}</span>
        </div>
        <div class="total-row final">
            <span>${labels.totalLabel}:</span>
            <span>${formatCurrency(document.total, currencySymbol)}</span>
        </div>
    </div>

    ${
      document.notesText
        ? `
    <div class="notes-text">
        <div class="section-title">${labels.notesSectionLabel}</div>
        ${document.notesText}
    </div>
    `
        : ''
    }

    ${
      document.footerText
        ? `
    <div class="payment-info">
        <strong>${paymentTermsTitle}:</strong><br>
        ${document.footerText}
    </div>
    `
        : ''
    }

    <div class="footer">
        <p>${thankYouText}</p>
        <p>${questionsTextFinal}</p>
    </div>
</body>
</html>`;
}

/**
 * Generates a PDF file using Electron's printToPDF API
 * Falls back to opening a print dialog in non-Electron environment
 */
export async function generatePDF(
  document: DocumentDto,
  business: BusinessDto,
  settings: SettingsDto
): Promise<PDFGenerationResult> {
  const html = generatePDFHTML(document, business, settings);

  // Check if we're in Electron
  if (typeof window !== 'undefined' && window.electronAPI) {
    return generatePDFElectron(document, business, html);
  }

  // Fallback: Open in new window for printing
  return generatePDFBrowser(html);
}

/**
 * Generates PDF using Electron's API
 */
async function generatePDFElectron(
  document: DocumentDto,
  business: BusinessDto,
  html: string
): Promise<PDFGenerationResult> {
  try {
    const docType = document.documentType === 'offer' ? 'Quote' : 'Invoice';
    const companyName = sanitizeFilename(business.name || 'Company');
    const customerName = sanitizeFilename(document.customer.name || 'Customer');
    const docNumber = document.documentNumber;
    const date = new Date().toISOString().split('T')[0];

    const saveDialogOptions: SaveDialogOptions = {
      title: `Save ${docType} as PDF`,
      defaultPath: `${companyName}_${docType}_${customerName}_${docNumber}_${date}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    };

    const electronAPI = window.electronAPI;
    if (!electronAPI) {
      return { success: false, error: 'Electron API not available' };
    }

    const saveResult = await electronAPI.saveFileDialog(saveDialogOptions);

    if (saveResult.canceled || !saveResult.filePath) {
      return {
        success: false,
        error: 'Save operation was cancelled',
      };
    }

    const result = await electronAPI.generatePDF(html, saveResult.filePath);

    if (result.success) {
      return {
        success: true,
        filePath: saveResult.filePath,
      };
    }

    return {
      success: false,
      error: result.error ?? 'Unknown error during PDF generation',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Error generating PDF: ${errorMessage}`,
    };
  }
}

/**
 * Opens HTML in a new window for browser printing
 */
function generatePDFBrowser(html: string): PDFGenerationResult {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    return {
      success: false,
      error: 'Could not open print window. Please allow popups.',
    };
  }

  // Use srcdoc via data URL to avoid deprecated document.write
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  printWindow.location.href = url;

  // Clean up and trigger print after load
  printWindow.onload = (): void => {
    URL.revokeObjectURL(url);
    printWindow.print();
  };

  return {
    success: true,
  };
}

/**
 * Preview the PDF HTML in a new window without printing
 */
export function previewPDF(
  document: DocumentDto,
  business: BusinessDto,
  settings: SettingsDto
): void {
  const html = generatePDFHTML(document, business, settings);
  const previewWindow = window.open('', '_blank');

  if (previewWindow) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    previewWindow.location.href = url;
    previewWindow.onload = (): void => {
      URL.revokeObjectURL(url);
    };
  }
}
