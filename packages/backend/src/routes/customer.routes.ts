/**
 * Customer Routes
 *
 * GET    /api/customers        - List all customers
 * GET    /api/customers/:id    - Get customer by ID
 * POST   /api/customers        - Create customer
 * PUT    /api/customers/:id    - Update customer
 * DELETE /api/customers/:id    - Delete customer
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { StorageService } from '../services/storage.service.js';
import type {
  CustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerListResponseDto,
  CustomerResponseDto,
} from '@crm-local/shared';
import { notFound, badRequest } from '../middleware/error-handler.js';

// Route parameter types
interface IdParams {
  id: string;
}

export function createCustomerRoutes(storage: StorageService): Router {
  const router = Router();

  // List all customers
  router.get('/', (_req: Request, res: Response<CustomerListResponseDto>): void => {
    const db = storage.getDatabase();
    res.json({
      customers: db.customers,
      total: db.customers.length,
    });
  });

  // Get customer by ID
  router.get(
    '/:id',
    (req: Request<IdParams>, res: Response<CustomerResponseDto>, next: NextFunction): void => {
      const db = storage.getDatabase();
      const customer = db.customers.find((c: CustomerDto) => c.id === req.params.id);

      if (!customer) {
        next(notFound(`Customer not found: ${req.params.id}`));
        return;
      }

      res.json({ customer });
    }
  );

  // Create customer
  router.post(
    '/',
    async (
      req: Request<object, CustomerResponseDto, CreateCustomerDto>,
      res: Response<CustomerResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data: CreateCustomerDto = req.body;

        // Validate required fields
        if (!data.name || !data.email) {
          next(badRequest('Name and email are required'));
          return;
        }

        const now = new Date().toISOString();
        const customer: CustomerDto = {
          id: uuidv4(),
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          company: data.company,
          address: data.address,
          notes: data.notes,
          createdAt: now,
          updatedAt: now,
        };

        await storage.updateDatabase((db) => {
          db.customers.push(customer);
        });

        res.status(201).json({ customer });
      } catch (error) {
        next(error);
      }
    }
  );

  // Update customer
  router.put(
    '/:id',
    async (
      req: Request<IdParams, CustomerResponseDto, UpdateCustomerDto>,
      res: Response<CustomerResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data: UpdateCustomerDto = req.body;
        const db = storage.getDatabase();
        const index = db.customers.findIndex((c: CustomerDto) => c.id === req.params.id);

        if (index === -1) {
          next(notFound(`Customer not found: ${req.params.id}`));
          return;
        }

        const existing = db.customers[index];
        if (!existing) {
          next(notFound(`Customer not found: ${req.params.id}`));
          return;
        }

        const updated: CustomerDto = {
          ...existing,
          ...data,
          address: data.address ? { ...existing.address, ...data.address } : existing.address,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateDatabase((db) => {
          db.customers[index] = updated;
        });

        res.json({ customer: updated });
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete customer
  router.delete(
    '/:id',
    async (req: Request<IdParams>, res: Response, next: NextFunction): Promise<void> => {
      try {
        const db = storage.getDatabase();
        const index = db.customers.findIndex((c: CustomerDto) => c.id === req.params.id);

        if (index === -1) {
          next(notFound(`Customer not found: ${req.params.id}`));
          return;
        }

        await storage.updateDatabase((db) => {
          db.customers.splice(index, 1);
        });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
