/**
 * Document DTOs - Shared between Frontend and Backend
 *
 * A "Document" can be either an Offer or an Invoice.
 * They share the same structure, making it easy to convert an offer to an invoice.
 */

/** Document type - offer (quote) or invoice */
export type DocumentType = 'offer' | 'invoice';

/** Offer status - simpler workflow */
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'cancelled';

/** Invoice status - full payment workflow */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/** Document status - union of both for generic handling */
export type DocumentStatus = OfferStatus | InvoiceStatus;

/** Valid statuses for offers */
export const OFFER_STATUSES: OfferStatus[] = ['draft', 'sent', 'accepted', 'cancelled'];

/** Valid statuses for invoices */
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

/** Status display labels */
export const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

/** Status tag types for Naive UI */
export type StatusTagType = 'default' | 'info' | 'success' | 'warning' | 'error';

export const STATUS_TAG_TYPES: Record<DocumentStatus, StatusTagType> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'error',
};

/** Single line item on a document */
export interface DocumentItemDto {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // in cents to avoid floating point issues
  total: number; // quantity * unitPrice (in cents)
}

/** Base document item for creation (without id and computed total) */
export interface CreateDocumentItemDto {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
}

/** Customer snapshot embedded in document (for PDF generation) */
export interface DocumentCustomerSnapshotDto {
  name: string;
  company?: string;
  street?: string;
  postalCode: string;
  city: string;
  country?: string;
}

/**
 * Status change log entry for audit trail and analytics
 * Tracks every status transition with timestamp
 */
export interface StatusLogEntryDto {
  /** When the status changed */
  timestamp: string; // ISO 8601

  /** Previous status (null for initial creation) */
  fromStatus: DocumentStatus | null;

  /** New status */
  toStatus: DocumentStatus;

  /** Optional note explaining the change */
  note?: string;
}

/** Full document entity */
export interface DocumentDto {
  id: string;

  /** Type of document */
  documentType: DocumentType;

  /** Custom title (e.g., "Offerte", "Factuur", "Quote") */
  documentTitle: string;

  /** Document number (e.g., "OFF-2026-0001" or "INV-2026-0001") */
  documentNumber: string;

  /** Reference to customer in database */
  customerId: string;

  /** Snapshot of customer at time of creation (for PDF) */
  customer: DocumentCustomerSnapshotDto;

  /** Line items */
  items: DocumentItemDto[];

  /** Computed totals (in cents) */
  subtotal: number;
  taxRate: number; // percentage (e.g., 21 for 21%)
  taxAmount: number;
  total: number;

  /** Payment term in days (e.g., 14, 30) */
  paymentTermDays: number;

  /** Due date (createdAt + paymentTermDays) */
  dueDate: string; // ISO 8601

  /** Customizable text fields for PDF */
  introText?: string; // Text before line items
  notesText?: string; // Text after line items (e.g., payment instructions)
  footerText?: string; // Footer text

  /** Current status */
  status: DocumentStatus;

  /**
   * Status change history for audit trail and analytics
   * First entry is always the creation (fromStatus: null, toStatus: 'draft')
   */
  statusHistory: StatusLogEntryDto[];

  /** Timestamps */
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  /** If this invoice was created from an offer, reference the original */
  convertedFromOfferId?: string;

  /** If this offer was converted to an invoice, reference the result */
  convertedToInvoiceId?: string;
}

/** DTO for creating a new document */
export interface CreateDocumentDto {
  documentType: DocumentType;
  documentTitle?: string; // Optional, will use default based on type
  customerId: string;
  items: CreateDocumentItemDto[];
  paymentTermDays?: number; // Optional, will use default from settings
  taxRate?: number; // Optional, will use default from settings
  introText?: string;
  notesText?: string;
  footerText?: string;
}

/** DTO for updating a document */
export interface UpdateDocumentDto {
  documentTitle?: string;
  customerId?: string;
  items?: CreateDocumentItemDto[];
  paymentTermDays?: number;
  taxRate?: number;
  introText?: string;
  notesText?: string;
  footerText?: string;
  status?: DocumentStatus;
  /** Note to add to status history when status changes */
  statusNote?: string;
}

/** Summary for list views (without full items) */
export interface DocumentSummaryDto {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  customerId: string;
  customerName: string; // Denormalized for list display
  total: number;
  status: DocumentStatus;
  dueDate: string;
  createdAt: string;
}

/** DTO for document list response */
export interface DocumentListResponseDto {
  documents: DocumentSummaryDto[];
  total: number;
}

/** DTO for single document response */
export interface DocumentResponseDto {
  document: DocumentDto;
}

/** DTO for converting an offer to an invoice */
export interface ConvertOfferToInvoiceDto {
  /** The offer ID to convert */
  offerId: string;

  /** Optional: update payment terms for the invoice */
  paymentTermDays?: number;

  /** Optional: update the notes/footer for invoice */
  notesText?: string;
  footerText?: string;
}
