/**
 * PDF Generator - Reference Implementation from Prototype
 *
 * This is the PDF generation code that the client approved in the prototype.
 * It will be adapted for the final implementation in packages/frontend/src/services/
 *
 * Key approach:
 * - Generates HTML with inline CSS
 * - Uses Electron's printToPDF via IPC (window.electronAPI)
 * - No external PDF library needed
 *
 * TODO: Adapt to use:
 * - DocumentDto instead of custom interfaces
 * - BusinessDto instead of CompanyInfo
 * - DocumentLabelsDto for all text (currently hardcoded Dutch)
 */

// ============================================================================
// ORIGINAL INTERFACES (will be replaced by shared DTOs)
// ============================================================================

interface DocumentData {
  documentType: 'offer' | 'invoice';
  documentTitle: string;
  invoiceNumber: string;
  customer: {
    name: string;
    address?: string;
    postalCode: string;
    city: string;
  };
  products: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentTerm: number;
  introText?: string;
  notesText?: string;
  footerText: string;
}

interface CompanyInfo {
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  kvkNumber: string;
  vatNumber: string;
  iban: string;
}

interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface SaveDialogOptions {
  title: string;
  defaultPath: string;
  filters: Array<{
    name: string;
    extensions: string[];
  }>;
}

// ============================================================================
// PDF GENERATOR CLASS
// ============================================================================

export class PDFGenerator {
  // In the real implementation, these will come from Pinia stores
  // private configStore: ReturnType<typeof useConfigStore>;
  // private invoiceStore: ReturnType<typeof useInvoiceStore>;

  async generatePDF(
    documentData: DocumentData,
    companyInfo: CompanyInfo
  ): Promise<PDFGenerationResult> {
    try {
      // Create HTML content for PDF
      const htmlContent = this.generateHTMLContent(documentData, companyInfo);

      // Use Electron's API to save the PDF
      if (typeof window === 'undefined' || !(window as any).electronAPI) {
        return {
          success: false,
          error: 'Electron API not available',
        };
      }

      const docType = documentData.documentType === 'offer' ? 'Offerte' : 'Factuur';
      const companyName = this.sanitizeFilename(companyInfo.companyName || 'Bedrijf');
      const customerName = documentData.customer?.name
        ? this.sanitizeFilename(documentData.customer.name)
        : 'Klant';
      const docNumber = documentData.invoiceNumber || 'Concept';
      const date = new Date().toISOString().split('T')[0];

      const saveDialogOptions: SaveDialogOptions = {
        title: `${docType} opslaan als PDF`,
        defaultPath: `${companyName}_${docType}_${customerName}_${docNumber}_${date}.pdf`,
        filters: [{ name: 'PDF Bestanden', extensions: ['pdf'] }],
      };

      const saveResult: SaveDialogResult = await (window as any).electronAPI.saveFileDialog(
        saveDialogOptions
      );

      if (saveResult.canceled || !saveResult.filePath) {
        return {
          success: false,
          error: 'Save operation was cancelled by user',
        };
      }

      // Generate actual PDF using Electron's printToPDF
      const result = await (window as any).electronAPI.generatePDF(
        htmlContent,
        saveResult.filePath
      );

      if (result.success) {
        return {
          success: true,
          filePath: saveResult.filePath,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Unknown error occurred during PDF generation',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error generating PDF:', error);
      return {
        success: false,
        error: `Error generating PDF: ${errorMessage}`,
      };
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  }

  private generateHTMLContent(documentData: DocumentData, companyInfo: CompanyInfo): string {
    const currentDate = new Date().toLocaleDateString('nl-NL');
    const dueDate = new Date(
      Date.now() + documentData.paymentTerm * 24 * 60 * 60 * 1000
    ).toLocaleDateString('nl-NL');

    return `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentData.documentTitle} ${documentData.invoiceNumber || 'Draft'}</title>
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
        
        /* PDF-specific optimizations for Electron */
        @page {
            size: A4;
        }
        
        /* Ensure proper page breaks */
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
        
        /* Better font rendering for PDF */
        body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-family: Arial, sans-serif;
        }
        
        /* Ensure consistent colors in PDF */
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
                <div class="company-name">${companyInfo.companyName}</div>
            </div>
            
            <div class="invoice-info">
                <div class="invoice-title">${documentData.documentTitle}</div>
                <div class="invoice-details">
                    <strong>Vervaldatum:</strong> ${dueDate}
                </div>
            </div>
        </div>
        
        <div class="company-details-row">
            <div class="company-address">
                ${companyInfo.address}<br>
                ${companyInfo.postalCode} ${companyInfo.city}
            </div>
            
            <div class="company-contact">
                Tel: <a href="tel:${companyInfo.phone.replace(/\s/g, '')}">${companyInfo.phone}</a><br>
                E-mail: <a href="mailto:${companyInfo.email}">${companyInfo.email}</a>
            </div>
            
            <div class="company-business">
                KvK: ${companyInfo.kvkNumber}<br>
                BTW-ID: ${companyInfo.vatNumber}<br>
                IBAN: ${companyInfo.iban}
            </div>
        </div>
    </div>

    <div class="customer-section">
        <div class="section-title">${documentData.documentType === 'offer' ? 'Klantgegevens' : 'Factuuradres'}</div>
        <div class="customer-info">
            <strong>${documentData.customer.name}</strong><br>
            ${documentData.customer.address ? documentData.customer.address + '<br>' : ''}
            ${documentData.customer.postalCode} ${documentData.customer.city}
        </div>
    </div>

    ${
      documentData.introText
        ? `
    <div class="intro-text">
        <div class="section-title">Omschrijving</div>
        ${documentData.introText}
    </div>
    `
        : ''
    }

    <table class="products-table">
        <thead>
            <tr>
                <th style="width: 50%">Omschrijving</th>
                <th style="width: 15%" class="text-center">Aantal</th>
                <th style="width: 15%" class="text-right">Prijs p/e</th>
                <th style="width: 20%" class="text-right">Totaal</th>
            </tr>
        </thead>
        <tbody>
            ${documentData.products
              .map(
                (product) => `
            <tr>
                <td>${product.description || 'Verhuizing'}</td>
                <td class="text-center">${product.quantity}</td>
                <td class="text-right">€${product.price.toFixed(2)}</td>
                <td class="text-right">€${(product.quantity * product.price).toFixed(2)}</td>
            </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotaal:</span>
            <span>€${documentData.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>BTW (21%):</span>
            <span>€${documentData.taxAmount.toFixed(2)}</span>
        </div>
        <div class="total-row final">
            <span>Totaal:</span>
            <span>€${documentData.total.toFixed(2)}</span>
        </div>
    </div>

    ${
      documentData.notesText && documentData.notesText.trim()
        ? `
    <div class="notes-text">
        <div class="section-title">Aanvullende informatie</div>
        ${documentData.notesText}
    </div>
    `
        : ''
    }

    <div class="payment-info">
        <strong>${documentData.documentType === 'offer' ? 'Voorwaarden:' : 'Betalingsvoorwaarden:'}</strong><br>
        ${documentData.footerText}
    </div>

    <div class="footer">
        <p>Bedankt voor het vertrouwen in ${companyInfo.companyName}!</p>
        <p>Bij vragen over deze ${documentData.documentType === 'offer' ? 'offerte' : 'factuur'} kunt u contact opnemen via <a href="mailto:${companyInfo.email}">${companyInfo.email}</a> of <a href="tel:${companyInfo.phone.replace(/\s/g, '')}">${companyInfo.phone}</a>.</p>
    </div>
</body>
</html>`;
  }
}

// ============================================================================
// EXPORT HELPER (will be replaced with proper service pattern)
// ============================================================================

export async function generateDocumentPDF(
  documentData: DocumentData,
  companyInfo: CompanyInfo
): Promise<PDFGenerationResult> {
  const generator = new PDFGenerator();
  return await generator.generatePDF(documentData, companyInfo);
}
