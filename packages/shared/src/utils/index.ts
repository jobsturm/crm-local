/**
 * Utils Index - Export all utility functions
 */

export {
  readJsonFile,
  safeReadJsonFile,
  writeJsonFile,
  safeWriteJsonFile,
  fileExists,
  listJsonFiles,
  listSubdirectories,
  extractInvoiceNumberFromFilename,
  StorageError,
  type StorageErrorCode,
  type StorageResult,
} from './storage';

export {
  formatDocumentNumber,
  buildDocumentNumberVariables,
  validateTemplate,
  previewDocumentNumber,
  TEMPLATE_VARIABLES,
  DEFAULT_INVOICE_NUMBER_FORMAT,
  DEFAULT_OFFER_NUMBER_FORMAT,
  type TemplateVariable,
  type DocumentNumberVariables,
  type TemplateValidationResult,
} from './document-number';
