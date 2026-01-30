/**
 * PDF Generator Service
 *
 * Generates PDF documents from DocumentDto using Electron's printToPDF.
 * Uses customizable labels from SettingsDto for all text.
 *
 * In non-Electron environment, opens HTML in a new window for printing.
 */

import type { DocumentDto, BusinessDto, SettingsDto } from '@crm-local/shared';
import { generatePDFHTMLFromTemplate } from './pdf-template';

export interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Sanitizes a string for use in a filename
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

/**
 * Generates HTML content for the PDF
 * Uses Handlebars template with optional interactive mode for preview
 */
export function generatePDFHTML(
  document: DocumentDto,
  business: BusinessDto,
  settings: SettingsDto,
  interactive = false
): string {
  return generatePDFHTMLFromTemplate({
    document,
    business,
    settings,
    interactive,
  });
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
