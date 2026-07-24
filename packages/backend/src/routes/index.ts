/**
 * API Routes
 *
 * All routes are prefixed with /api
 */

import { Router } from 'express';
import type { StorageService } from '../services/storage.service.js';
import type { BackupService } from '../services/backup.service.js';
import { createCustomerRoutes } from './customer.routes.js';
import { createDocumentRoutes } from './document.routes.js';
import { createBusinessRoutes } from './business.routes.js';
import { createSettingsRoutes } from './settings.routes.js';
import { createFinancialRoutes } from './financial.routes.js';
import { createDashboardRoutes } from './dashboard.routes.js';
import { createProductRoutes } from './product.routes.js';
import { createBackupRoutes } from './backup.routes.js';

export function createRoutes(storage: StorageService, backup: BackupService): Router {
  const router = Router();

  router.use('/customers', createCustomerRoutes(storage));
  router.use('/documents', createDocumentRoutes(storage));
  router.use('/business', createBusinessRoutes(storage));
  router.use('/settings', createSettingsRoutes(storage));
  router.use('/financial', createFinancialRoutes(storage));
  router.use('/dashboard', createDashboardRoutes(storage));
  router.use('/products', createProductRoutes(storage));
  router.use('/backup', createBackupRoutes(storage, backup));

  return router;
}
