/**
 * Shared Package Entry Point
 * Re-exports all DTOs and constants for use in frontend and backend
 *
 * NOTE: Storage utilities are NOT exported here to keep the bundle browser-safe.
 * Backend should import storage utils directly: import { ... } from '@crm-local/shared/utils/storage'
 */

// DTOs and constants (browser-safe)
export * from './dto';

// Document number utilities (browser-safe)
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
} from './utils/document-number';
