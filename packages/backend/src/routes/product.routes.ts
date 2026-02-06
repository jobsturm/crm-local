/**
 * Product Routes
 *
 * GET    /api/products        - List all products
 * GET    /api/products/:id    - Get product by ID
 * POST   /api/products        - Create product
 * PUT    /api/products/:id    - Update product
 * DELETE /api/products/:id    - Delete product
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { StorageService } from '../services/storage.service.js';
import type {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  ProductListResponseDto,
  ProductResponseDto,
} from '@crm-local/shared';
import { notFound, badRequest } from '../middleware/error-handler.js';

// Route parameter types
interface IdParams {
  id: string;
}

export function createProductRoutes(storage: StorageService): Router {
  const router = Router();

  // List all products
  router.get('/', (_req: Request, res: Response<ProductListResponseDto>): void => {
    const db = storage.getDatabase();
    res.json({
      products: db.products,
    });
  });

  // Get product by ID
  router.get(
    '/:id',
    (req: Request<IdParams>, res: Response<ProductResponseDto>, next: NextFunction): void => {
      const db = storage.getDatabase();
      const product = db.products.find((p: ProductDto) => p.id === req.params.id);

      if (!product) {
        next(notFound(`Product not found: ${req.params.id}`));
        return;
      }

      res.json({ product });
    }
  );

  // Create product
  router.post(
    '/',
    async (
      req: Request<object, ProductResponseDto, CreateProductDto>,
      res: Response<ProductResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data: CreateProductDto = req.body;

        // Validate required fields
        if (!data.description) {
          next(badRequest('Description is required'));
          return;
        }

        if (data.defaultPrice === undefined || data.defaultPrice < 0) {
          next(badRequest('Default price is required and must be non-negative'));
          return;
        }

        const now = new Date().toISOString();
        const product: ProductDto = {
          id: uuidv4(),
          description: data.description,
          defaultPrice: data.defaultPrice,
          createdAt: now,
          updatedAt: now,
        };

        await storage.updateDatabase((db) => {
          db.products.push(product);
        });

        res.status(201).json({ product });
      } catch (error) {
        next(error);
      }
    }
  );

  // Update product
  router.put(
    '/:id',
    async (
      req: Request<IdParams, ProductResponseDto, UpdateProductDto>,
      res: Response<ProductResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data: UpdateProductDto = req.body;
        const db = storage.getDatabase();
        const index = db.products.findIndex((p: ProductDto) => p.id === req.params.id);

        if (index === -1) {
          next(notFound(`Product not found: ${req.params.id}`));
          return;
        }

        const existing = db.products[index];
        if (!existing) {
          next(notFound(`Product not found: ${req.params.id}`));
          return;
        }

        const updated: ProductDto = {
          ...existing,
          description: data.description ?? existing.description,
          defaultPrice: data.defaultPrice ?? existing.defaultPrice,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateDatabase((db) => {
          db.products[index] = updated;
        });

        res.json({ product: updated });
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete product
  router.delete(
    '/:id',
    async (req: Request<IdParams>, res: Response, next: NextFunction): Promise<void> => {
      try {
        const db = storage.getDatabase();
        const index = db.products.findIndex((p: ProductDto) => p.id === req.params.id);

        if (index === -1) {
          next(notFound(`Product not found: ${req.params.id}`));
          return;
        }

        await storage.updateDatabase((db) => {
          db.products.splice(index, 1);
        });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
