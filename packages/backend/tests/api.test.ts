/**
 * Backend API Integration Tests
 *
 * Tests all API endpoints by spinning up a real server
 * with a temporary storage directory.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Express } from 'express';
import type {
  CustomerListResponseDto,
  CustomerResponseDto,
  BusinessResponseDto,
  SettingsResponseDto,
  DocumentListResponseDto,
  DocumentResponseDto,
} from '@crm-local/shared';
import type { StorageService } from '../src/services/storage.service.js';

// We need to dynamically import the app to set the storage path
let app: Express;
let testDataPath: string;

describe('CRM Backend API', () => {
  beforeAll(async () => {
    // Create temporary test directory
    testDataPath = join(tmpdir(), `crm-test-${Date.now()}`);
    await mkdir(testDataPath, { recursive: true });

    // Dynamically import the app
    const { createApp } = await import('../src/index.js');
    app = createApp(testDataPath);

    // Initialize storage service
    const storageService = (app as Express & { storageService: StorageService }).storageService;
    await storageService.initialize();
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDataPath, { recursive: true, force: true });
  });

  describe('Customers API', () => {
    let createdCustomerId: string;

    it('GET /api/customers - should return empty list initially', async () => {
      const res = await request(app).get('/api/customers');

      expect(res.status).toBe(200);
      const body = res.body as CustomerListResponseDto;
      expect(body.customers).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('POST /api/customers - should create a customer', async () => {
      const customerData = {
        name: 'Test Company BV',
        email: 'info@testcompany.nl',
        phone: '06-12345678',
        company: 'Test Company BV',
        address: {
          street: 'Teststraat 123',
          postalCode: '1234 AB',
          city: 'Amsterdam',
          country: 'Netherlands',
        },
      };

      const res = await request(app)
        .post('/api/customers')
        .send(customerData)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      const body = res.body as CustomerResponseDto;
      expect(body.customer).toBeDefined();
      expect(body.customer.name).toBe(customerData.name);
      expect(body.customer.email).toBe(customerData.email);
      expect(body.customer.id).toBeDefined();
      expect(body.customer.createdAt).toBeDefined();

      createdCustomerId = body.customer.id;
    });

    it('GET /api/customers - should return the created customer', async () => {
      const res = await request(app).get('/api/customers');

      expect(res.status).toBe(200);
      const body = res.body as CustomerListResponseDto;
      expect(body.customers).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.customers[0].name).toBe('Test Company BV');
    });

    it('GET /api/customers/:id - should return customer by ID', async () => {
      const res = await request(app).get(`/api/customers/${createdCustomerId}`);

      expect(res.status).toBe(200);
      const body = res.body as CustomerResponseDto;
      expect(body.customer.id).toBe(createdCustomerId);
    });

    it('GET /api/customers/:id - should return 404 for non-existent customer', async () => {
      const res = await request(app).get('/api/customers/non-existent-id');

      expect(res.status).toBe(404);
    });

    it('PUT /api/customers/:id - should update customer', async () => {
      const res = await request(app)
        .put(`/api/customers/${createdCustomerId}`)
        .send({ phone: '020-9876543' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      const body = res.body as CustomerResponseDto;
      expect(body.customer.phone).toBe('020-9876543');
      expect(body.customer.name).toBe('Test Company BV'); // unchanged
    });

    it('POST /api/customers - should require name and email', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({ phone: '123' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
    });
  });

  describe('Business API', () => {
    it('GET /api/business - should return null initially', async () => {
      const res = await request(app).get('/api/business');

      expect(res.status).toBe(200);
      const body = res.body as { business: BusinessDto | null };
      expect(body.business).toBeNull();
    });

    it('PUT /api/business - should create business info', async () => {
      const businessData = {
        name: 'My CRM Company',
        address: {
          street: 'Hoofdstraat 1',
          postalCode: '5678 CD',
          city: 'Rotterdam',
          country: 'Netherlands',
        },
        email: 'info@mycrm.nl',
        phone: '010-1234567',
        chamberOfCommerce: '12345678',
        taxId: 'NL123456789B01',
        bankDetails: {
          bankName: 'ING',
          iban: 'NL12INGB0001234567',
          bic: 'INGBNL2A',
        },
      };

      const res = await request(app)
        .put('/api/business')
        .send(businessData)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      const body = res.body as BusinessResponseDto;
      expect(body.business).toBeDefined();
      expect(body.business.name).toBe(businessData.name);
      expect(body.business.email).toBe(businessData.email);
    });

    it('GET /api/business - should return created business', async () => {
      const res = await request(app).get('/api/business');

      expect(res.status).toBe(200);
      const body = res.body as BusinessResponseDto;
      expect(body.business).toBeDefined();
      expect(body.business.name).toBe('My CRM Company');
    });

    it('PUT /api/business - should update existing business', async () => {
      const res = await request(app)
        .put('/api/business')
        .send({ phone: '010-9999999' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      const body = res.body as BusinessResponseDto;
      expect(body.business.phone).toBe('010-9999999');
      expect(body.business.name).toBe('My CRM Company'); // unchanged
    });
  });

  describe('Settings API', () => {
    it('GET /api/settings - should return default settings', async () => {
      const res = await request(app).get('/api/settings');

      expect(res.status).toBe(200);
      const body = res.body as SettingsResponseDto;
      expect(body.settings).toBeDefined();
      expect(body.settings.currency).toBe('EUR');
      expect(body.settings.currencySymbol).toBe('€');
      expect(body.settings.defaultTaxRate).toBe(21);
      expect(body.settings.offerPrefix).toBe('OFF');
      expect(body.settings.invoicePrefix).toBe('INV');
      expect(body.settings.labels).toBeDefined();
    });

    it('PUT /api/settings - should update settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send({ defaultTaxRate: 19, currency: 'USD' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      const body = res.body as SettingsResponseDto;
      expect(body.settings.defaultTaxRate).toBe(19);
      expect(body.settings.currency).toBe('USD');
    });
  });

  describe('Documents API', () => {
    let customerId: string;
    let offerId: string;
    let offerNumber: string;

    beforeAll(async () => {
      // Create a customer for document tests
      const res = await request(app)
        .post('/api/customers')
        .send({
          name: 'Document Test Customer',
          email: 'docs@test.nl',
        })
        .set('Content-Type', 'application/json');

      customerId = (res.body as CustomerResponseDto).customer.id;
    });

    it('GET /api/documents - should return empty list initially', async () => {
      const res = await request(app).get('/api/documents');

      expect(res.status).toBe(200);
      const body = res.body as DocumentListResponseDto;
      expect(body.documents).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('POST /api/documents - should create an offer', async () => {
      const offerData = {
        documentType: 'offer',
        customerId,
        items: [
          { description: 'Web Development', quantity: 40, unitPrice: 85 },
          { description: 'Design Work', quantity: 20, unitPrice: 75 },
        ],
        introText: 'Thank you for your interest.',
        footerText: 'Valid for 30 days.',
      };

      const res = await request(app)
        .post('/api/documents')
        .send(offerData)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      const body = res.body as DocumentResponseDto;
      expect(body.document).toBeDefined();
      expect(body.document.documentType).toBe('offer');
      expect(body.document.documentNumber).toMatch(/^OFF-\d{4}-\d{4}$/);
      expect(body.document.status).toBe('draft');
      expect(body.document.items).toHaveLength(2);

      // Verify calculations
      expect(body.document.subtotal).toBe(4900); // 40*85 + 20*75
      expect(body.document.taxRate).toBe(19); // we changed it in settings
      expect(body.document.taxAmount).toBe(931); // 4900 * 0.19
      expect(body.document.total).toBe(5831);

      // Verify customer snapshot
      expect(body.document.customer.name).toBe('Document Test Customer');

      // Verify status history
      expect(body.document.statusHistory).toHaveLength(1);
      expect(body.document.statusHistory[0].fromStatus).toBeNull();
      expect(body.document.statusHistory[0].toStatus).toBe('draft');

      offerId = body.document.id;
      offerNumber = body.document.documentNumber;
    });

    it('GET /api/documents - should list documents with filter', async () => {
      // List all
      let res = await request(app).get('/api/documents');
      expect(res.status).toBe(200);
      expect((res.body as DocumentListResponseDto).total).toBe(1);

      // Filter by type
      res = await request(app).get('/api/documents?type=offer');
      expect(res.status).toBe(200);
      expect((res.body as DocumentListResponseDto).total).toBe(1);

      res = await request(app).get('/api/documents?type=invoice');
      expect(res.status).toBe(200);
      expect((res.body as DocumentListResponseDto).total).toBe(0);
    });

    it('GET /api/documents/offers - should list offers only', async () => {
      const res = await request(app).get('/api/documents/offers');

      expect(res.status).toBe(200);
      const body = res.body as DocumentListResponseDto;
      expect(body.total).toBe(1);
      expect(body.documents[0].documentType).toBe('offer');
    });

    it('GET /api/documents/:id - should return document by ID', async () => {
      const res = await request(app).get(`/api/documents/${offerId}`);

      expect(res.status).toBe(200);
      const body = res.body as DocumentResponseDto;
      expect(body.document.id).toBe(offerId);
    });

    it('PUT /api/documents/:id - should update status with history', async () => {
      const res = await request(app)
        .put(`/api/documents/${offerId}`)
        .send({ status: 'sent', statusNote: 'Sent via email' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      const body = res.body as DocumentResponseDto;
      expect(body.document.status).toBe('sent');
      expect(body.document.statusHistory).toHaveLength(2);
      expect(body.document.statusHistory[1].fromStatus).toBe('draft');
      expect(body.document.statusHistory[1].toStatus).toBe('sent');
      expect(body.document.statusHistory[1].note).toBe('Sent via email');
    });

    it('POST /api/documents/convert-to-invoice - should convert offer', async () => {
      const res = await request(app)
        .post('/api/documents/convert-to-invoice')
        .send({ offerId })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      const body = res.body as DocumentResponseDto;
      expect(body.document).toBeDefined();
      expect(body.document.documentType).toBe('invoice');
      expect(body.document.documentNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(body.document.convertedFromOfferId).toBe(offerId);
      expect(body.document.status).toBe('draft');

      // Verify the offer was updated to accepted
      const offerRes = await request(app).get(`/api/documents/${offerId}`);
      const offerBody = offerRes.body as DocumentResponseDto;
      expect(offerBody.document.status).toBe('accepted');
    });

    it('GET /api/documents/invoices - should list invoices', async () => {
      const res = await request(app).get('/api/documents/invoices');

      expect(res.status).toBe(200);
      const body = res.body as DocumentListResponseDto;
      expect(body.total).toBe(1);
      expect(body.documents[0].documentType).toBe('invoice');
    });

    it('POST /api/documents - should create an invoice directly', async () => {
      const invoiceData = {
        documentType: 'invoice',
        customerId,
        items: [{ description: 'Consulting', quantity: 10, unitPrice: 100 }],
      };

      const res = await request(app)
        .post('/api/documents')
        .send(invoiceData)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      const body = res.body as DocumentResponseDto;
      expect(body.document.documentType).toBe('invoice');
      expect(body.document.convertedFromOfferId).toBeUndefined();
    });

    it('DELETE /api/documents/:id - should delete document', async () => {
      // Create a document to delete
      const createRes = await request(app)
        .post('/api/documents')
        .send({
          documentType: 'offer',
          customerId,
          items: [{ description: 'To Delete', quantity: 1, unitPrice: 1 }],
        })
        .set('Content-Type', 'application/json');

      const docId = (createRes.body as DocumentResponseDto).document.id;

      const res = await request(app).delete(`/api/documents/${docId}`);
      expect(res.status).toBe(204);

      // Verify it's deleted
      const getRes = await request(app).get(`/api/documents/${docId}`);
      expect(getRes.status).toBe(404);
    });

    it('POST /api/documents - should require at least one item', async () => {
      const res = await request(app)
        .post('/api/documents')
        .send({
          documentType: 'offer',
          customerId,
          items: [],
        })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
    });

    it('POST /api/documents - should fail for non-existent customer', async () => {
      const res = await request(app)
        .post('/api/documents')
        .send({
          documentType: 'offer',
          customerId: 'non-existent-id',
          items: [{ description: 'Test', quantity: 1, unitPrice: 1 }],
        })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(404);
    });
  });

  describe('Customer Deletion with Documents', () => {
    it('DELETE /api/customers/:id - should delete customer', async () => {
      // Get the first customer
      const listRes = await request(app).get('/api/customers');
      const customers = (listRes.body as CustomerListResponseDto).customers;
      const firstCustomerId = customers[0].id;

      const res = await request(app).delete(`/api/customers/${firstCustomerId}`);
      expect(res.status).toBe(204);
    });
  });
});
