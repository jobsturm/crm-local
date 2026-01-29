/**
 * Document Routes (Offers & Invoices)
 *
 * GET    /api/documents                    - List all documents (with type filter)
 * GET    /api/documents/offers             - List offers only
 * GET    /api/documents/invoices           - List invoices only
 * GET    /api/documents/:id                - Get full document by ID
 * POST   /api/documents                    - Create document
 * PUT    /api/documents/:id                - Update document
 * DELETE /api/documents/:id                - Delete document
 * POST   /api/documents/convert-to-invoice - Convert offer to invoice
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { StorageService } from '../services/storage.service.js';
import type {
  DocumentDto,
  DocumentSummaryDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentListResponseDto,
  DocumentResponseDto,
  StatusLogEntryDto,
  DocumentStatus,
  CustomerDto,
  CreateDocumentItemDto,
  DocumentItemDto,
} from '@crm-local/shared';
import { notFound, badRequest } from '../middleware/error-handler.js';

// Route parameter types
interface IdParams {
  id: string;
}

interface DocumentQueryParams {
  type?: 'offer' | 'invoice';
}

export function createDocumentRoutes(storage: StorageService): Router {
  const router = Router();

  // Helper to create summary from document
  function toSummary(doc: DocumentDto): DocumentSummaryDto {
    return {
      id: doc.id,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      customerId: doc.customerId,
      customerName: doc.customer.name,
      total: doc.total,
      status: doc.status,
      dueDate: doc.dueDate,
      createdAt: doc.createdAt,
    };
  }

  // List all documents (with optional type filter)
  router.get(
    '/',
    async (
      req: Request<object, DocumentListResponseDto, object, DocumentQueryParams>,
      res: Response<DocumentListResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const typeFilter = req.query.type;
        const documents = await storage.listDocuments(typeFilter);
        const summaries = documents.map(toSummary);

        res.json({
          documents: summaries,
          total: summaries.length,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // List offers only
  router.get(
    '/offers',
    async (
      _req: Request,
      res: Response<DocumentListResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const documents = await storage.listDocuments('offer');
        const summaries = documents.map(toSummary);

        res.json({
          documents: summaries,
          total: summaries.length,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // List invoices only
  router.get(
    '/invoices',
    async (
      _req: Request,
      res: Response<DocumentListResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const documents = await storage.listDocuments('invoice');
        const summaries = documents.map(toSummary);

        res.json({
          documents: summaries,
          total: summaries.length,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Get document by ID
  router.get(
    '/:id',
    async (
      req: Request<IdParams>,
      res: Response<DocumentResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Try offers first, then invoices
        let document = await storage.loadDocument('offer', req.params.id);
        if (!document) {
          document = await storage.loadDocument('invoice', req.params.id);
        }

        if (!document) {
          next(notFound(`Document not found: ${req.params.id}`));
          return;
        }

        res.json({ document });
      } catch (error) {
        next(error);
      }
    }
  );

  // Create document
  router.post(
    '/',
    async (
      req: Request<object, DocumentResponseDto, CreateDocumentDto>,
      res: Response<DocumentResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data = req.body;

        // Validate required fields
        if (data.items.length === 0) {
          next(badRequest('At least one item is required'));
          return;
        }

        // Get customer for snapshot
        const db = storage.getDatabase();
        const customer = db.customers.find((c: CustomerDto) => c.id === data.customerId);
        if (!customer) {
          next(notFound(`Customer not found: ${data.customerId}`));
          return;
        }

        // Get settings for defaults
        const settings = db.settings;

        // Generate document number
        const isOffer = data.documentType === 'offer';
        const prefix = isOffer ? settings.offerPrefix : settings.invoicePrefix;
        const nextNumber = isOffer ? settings.nextOfferNumber : settings.nextInvoiceNumber;
        const year = new Date().getFullYear();
        const documentNumber = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;

        // Calculate totals
        const items: DocumentItemDto[] = data.items.map((item: CreateDocumentItemDto) => ({
          id: uuidv4(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        }));

        const subtotal = items.reduce((sum: number, item: DocumentItemDto) => sum + item.total, 0);
        const taxRate = data.taxRate ?? settings.defaultTaxRate;
        const taxAmount = Math.round(subtotal * (taxRate / 100));
        const total = subtotal + taxAmount;

        // Calculate due date
        const paymentTermDays = data.paymentTermDays ?? settings.defaultPaymentTermDays;
        const now = new Date();
        const dueDate = new Date(now.getTime() + paymentTermDays * 24 * 60 * 60 * 1000);

        // Get default title from labels
        const defaultTitle = isOffer ? settings.labels.offerTitle : settings.labels.invoiceTitle;

        // Create initial status log
        const initialStatus: DocumentStatus = 'draft';
        const statusHistory: StatusLogEntryDto[] = [
          {
            timestamp: now.toISOString(),
            fromStatus: null,
            toStatus: initialStatus,
          },
        ];

        const document: DocumentDto = {
          id: uuidv4(),
          documentType: data.documentType,
          documentTitle: data.documentTitle ?? defaultTitle,
          documentNumber,
          customerId: data.customerId,
          customer: {
            name: customer.name,
            company: customer.company,
            street: customer.address?.street ?? '',
            postalCode: customer.address?.postalCode ?? '',
            city: customer.address?.city ?? '',
            country: customer.address?.country ?? '',
          },
          items,
          subtotal,
          taxRate,
          taxAmount,
          total,
          paymentTermDays,
          dueDate: dueDate.toISOString(),
          introText: data.introText ?? settings.defaultIntroText,
          notesText: data.notesText,
          footerText: data.footerText ?? settings.defaultFooterText,
          status: initialStatus,
          statusHistory,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        // Save document file
        await storage.saveDocument(document);

        // Update next number in settings
        await storage.updateDatabase((db) => {
          if (isOffer) {
            db.settings.nextOfferNumber++;
          } else {
            db.settings.nextInvoiceNumber++;
          }
          db.settings.updatedAt = now.toISOString();
        });

        res.status(201).json({ document });
      } catch (error) {
        next(error);
      }
    }
  );

  // Update document
  router.put(
    '/:id',
    async (
      req: Request<IdParams, DocumentResponseDto, UpdateDocumentDto>,
      res: Response<DocumentResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data = req.body;

        // Find existing document
        let document = await storage.loadDocument('offer', req.params.id);
        if (!document) {
          document = await storage.loadDocument('invoice', req.params.id);
        }

        if (!document) {
          next(notFound(`Document not found: ${req.params.id}`));
          return;
        }

        const now = new Date().toISOString();
        const statusHistory = [...document.statusHistory];

        // If status changed, add to history
        if (data.status && data.status !== document.status) {
          statusHistory.push({
            timestamp: now,
            fromStatus: document.status,
            toStatus: data.status,
            note: data.statusNote,
          });
        }

        // Recalculate totals if items changed
        let items = document.items;
        let subtotal = document.subtotal;
        let taxAmount = document.taxAmount;
        let total = document.total;

        if (data.items) {
          items = data.items.map((item: CreateDocumentItemDto) => ({
            id: uuidv4(),
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          }));
          subtotal = items.reduce((sum: number, item: DocumentItemDto) => sum + item.total, 0);
          const taxRate = data.taxRate ?? document.taxRate;
          taxAmount = Math.round(subtotal * (taxRate / 100));
          total = subtotal + taxAmount;
        }

        // Recalculate due date if payment terms changed
        let dueDate = document.dueDate;
        if (data.paymentTermDays && data.paymentTermDays !== document.paymentTermDays) {
          const createdAt = new Date(document.createdAt);
          dueDate = new Date(
            createdAt.getTime() + data.paymentTermDays * 24 * 60 * 60 * 1000
          ).toISOString();
        }

        const updated: DocumentDto = {
          ...document,
          documentTitle: data.documentTitle ?? document.documentTitle,
          items,
          subtotal,
          taxRate: data.taxRate ?? document.taxRate,
          taxAmount,
          total,
          paymentTermDays: data.paymentTermDays ?? document.paymentTermDays,
          dueDate,
          introText: data.introText ?? document.introText,
          notesText: data.notesText ?? document.notesText,
          footerText: data.footerText ?? document.footerText,
          status: data.status ?? document.status,
          statusHistory,
          updatedAt: now,
        };

        // If customer changed, update snapshot
        if (data.customerId && data.customerId !== document.customerId) {
          const db = storage.getDatabase();
          const customer = db.customers.find((c: CustomerDto) => c.id === data.customerId);
          if (!customer) {
            next(notFound(`Customer not found: ${data.customerId}`));
            return;
          }
          updated.customerId = data.customerId;
          updated.customer = {
            name: customer.name,
            company: customer.company,
            street: customer.address?.street ?? '',
            postalCode: customer.address?.postalCode ?? '',
            city: customer.address?.city ?? '',
            country: customer.address?.country ?? '',
          };
        }

        await storage.saveDocument(updated);
        res.json({ document: updated });
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete document
  router.delete(
    '/:id',
    async (req: Request<IdParams>, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Find existing document
        let document = await storage.loadDocument('offer', req.params.id);
        if (!document) {
          document = await storage.loadDocument('invoice', req.params.id);
        }

        if (!document) {
          next(notFound(`Document not found: ${req.params.id}`));
          return;
        }

        await storage.deleteDocument(document);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // Convert offer to invoice
  router.post(
    '/convert-to-invoice',
    async (
      req: Request<object, DocumentResponseDto, { offerId: string; paymentTermDays?: number }>,
      res: Response<DocumentResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { offerId, paymentTermDays } = req.body;

        if (!offerId) {
          next(badRequest('offerId is required'));
          return;
        }

        const offer = await storage.loadDocument('offer', offerId);
        if (!offer) {
          next(notFound(`Offer not found: ${offerId}`));
          return;
        }

        if (offer.documentType !== 'offer') {
          next(badRequest('Document is not an offer'));
          return;
        }

        const db = storage.getDatabase();
        const settings = db.settings;
        const now = new Date();

        // Generate invoice number
        const invoiceNumber = `${settings.invoicePrefix}-${now.getFullYear()}-${String(settings.nextInvoiceNumber).padStart(4, '0')}`;

        // Calculate new due date
        const terms = paymentTermDays ?? offer.paymentTermDays;
        const dueDate = new Date(now.getTime() + terms * 24 * 60 * 60 * 1000);

        // Create invoice from offer
        const invoice: DocumentDto = {
          ...offer,
          id: uuidv4(),
          documentType: 'invoice',
          documentTitle: settings.labels.invoiceTitle,
          documentNumber: invoiceNumber,
          paymentTermDays: terms,
          dueDate: dueDate.toISOString(),
          status: 'draft',
          statusHistory: [
            {
              timestamp: now.toISOString(),
              fromStatus: null,
              toStatus: 'draft',
              note: `Converted from offer ${offer.documentNumber}`,
            },
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          convertedFromOfferId: offer.id,
        };

        // Save invoice
        await storage.saveDocument(invoice);

        // Mark offer as accepted and link to invoice
        const updatedOffer: DocumentDto = {
          ...offer,
          status: 'accepted',
          statusHistory: [
            ...offer.statusHistory,
            {
              timestamp: now.toISOString(),
              fromStatus: offer.status,
              toStatus: 'accepted',
              note: `Converted to invoice ${invoiceNumber}`,
            },
          ],
          updatedAt: now.toISOString(),
          convertedToInvoiceId: invoice.id,
        };
        await storage.saveDocument(updatedOffer);

        // Update next invoice number
        await storage.updateDatabase((db) => {
          db.settings.nextInvoiceNumber++;
          db.settings.updatedAt = now.toISOString();
        });

        res.status(201).json({ document: invoice });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
