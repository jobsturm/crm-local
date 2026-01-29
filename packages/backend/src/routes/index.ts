/**
 * API Routes
 *
 * All routes are prefixed with /api
 */

import { Router } from 'express';
import type { StorageService } from '../services/storage.service.js';
import { createCustomerRoutes } from './customer.routes.js';
import { createDocumentRoutes } from './document.routes.js';
import { createBusinessRoutes } from './business.routes.js';
import { createSettingsRoutes } from './settings.routes.js';

export function createRoutes(storage: StorageService): Router {
  const router = Router();

  router.use('/customers', createCustomerRoutes(storage));
  router.use('/documents', createDocumentRoutes(storage));
  router.use('/business', createBusinessRoutes(storage));
  router.use('/settings', createSettingsRoutes(storage));

  return router;
}
