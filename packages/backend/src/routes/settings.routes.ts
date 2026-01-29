/**
 * Settings Routes
 *
 * GET  /api/settings - Get settings
 * PUT  /api/settings - Update settings
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { StorageService } from '../services/storage.service.js';
import type { SettingsDto, UpdateSettingsDto, SettingsResponseDto } from '@crm-local/shared';

export function createSettingsRoutes(storage: StorageService): Router {
  const router = Router();

  // Get settings
  router.get('/', (_req: Request, res: Response<SettingsResponseDto>): void => {
    const db = storage.getDatabase();
    // Add storagePath which is not stored in the database
    const settings: SettingsDto = {
      ...db.settings,
      storagePath: '', // Will be set by the frontend/electron
    };
    res.json({ settings });
  });

  // Update settings
  router.put(
    '/',
    async (
      req: Request<object, SettingsResponseDto, UpdateSettingsDto>,
      res: Response<SettingsResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data = req.body;
        const db = storage.getDatabase();
        const now = new Date().toISOString();

        await storage.updateDatabase((db) => {
          // Update individual fields if provided
          if (data.currency !== undefined) db.settings.currency = data.currency;
          if (data.currencySymbol !== undefined) db.settings.currencySymbol = data.currencySymbol;
          if (data.defaultTaxRate !== undefined) db.settings.defaultTaxRate = data.defaultTaxRate;
          if (data.defaultPaymentTermDays !== undefined) {
            db.settings.defaultPaymentTermDays = data.defaultPaymentTermDays;
          }
          if (data.offerPrefix !== undefined) db.settings.offerPrefix = data.offerPrefix;
          if (data.invoicePrefix !== undefined) db.settings.invoicePrefix = data.invoicePrefix;
          if (data.defaultIntroText !== undefined) {
            db.settings.defaultIntroText = data.defaultIntroText;
          }
          if (data.defaultFooterText !== undefined) {
            db.settings.defaultFooterText = data.defaultFooterText;
          }
          if (data.theme !== undefined) db.settings.theme = data.theme;
          if (data.dateFormat !== undefined) db.settings.dateFormat = data.dateFormat;

          // Merge labels if provided
          if (data.labels) {
            db.settings.labels = {
              ...db.settings.labels,
              ...data.labels,
            };
          }

          db.settings.updatedAt = now;
        });

        const settings: SettingsDto = {
          ...db.settings,
          storagePath: '',
        };

        res.json({ settings });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
