/**
 * Settings Routes
 *
 * GET  /api/settings - Get settings
 * PUT  /api/settings - Update settings
 * POST /api/settings/storage-path - Change storage path (migrate data)
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { StorageService } from '../services/storage.service.js';
import type { SettingsDto, UpdateSettingsDto, SettingsResponseDto } from '@crm-local/shared';
import { DEFAULT_SETTINGS } from '@crm-local/shared';

interface ChangeStoragePathRequest {
  newPath: string;
  deleteOld?: boolean;
}

interface ChangeStoragePathResponse {
  success: boolean;
  storagePath: string;
  message?: string;
}

export function createSettingsRoutes(storage: StorageService): Router {
  const router = Router();

  // Get settings
  router.get('/', (_req: Request, res: Response<SettingsResponseDto>): void => {
    const db = storage.getDatabase();
    // Merge with defaults to handle missing fields from older database versions
    const settings: SettingsDto = {
      ...DEFAULT_SETTINGS,
      ...db.settings,
      storagePath: storage.getStoragePath(), // Return actual storage path
      updatedAt: db.settings.updatedAt,
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
          if (data.defaultNotesText !== undefined) {
            db.settings.defaultNotesText = data.defaultNotesText;
          }
          if (data.defaultFooterText !== undefined) {
            db.settings.defaultFooterText = data.defaultFooterText;
          }
          if (data.theme !== undefined) db.settings.theme = data.theme;
          if (data.language !== undefined) db.settings.language = data.language;
          if (data.dateFormat !== undefined) db.settings.dateFormat = data.dateFormat;
          if (data.fiscalYearStartMonth !== undefined) {
            db.settings.fiscalYearStartMonth = data.fiscalYearStartMonth;
          }

          // Merge labels if provided
          if (data.labels) {
            db.settings.labels = {
              ...db.settings.labels,
              ...data.labels,
            };
          }

          db.settings.updatedAt = now;
        });

        // Merge with defaults to handle missing fields
        const settings: SettingsDto = {
          ...DEFAULT_SETTINGS,
          ...db.settings,
          storagePath: '',
          updatedAt: db.settings.updatedAt,
        };

        res.json({ settings });
      } catch (error) {
        next(error);
      }
    }
  );

  // Change storage path (migrate data to new location)
  router.post(
    '/storage-path',
    async (
      req: Request<object, ChangeStoragePathResponse, ChangeStoragePathRequest>,
      res: Response<ChangeStoragePathResponse>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { newPath, deleteOld = false } = req.body;

        if (!newPath || typeof newPath !== 'string') {
          res.status(400).json({
            success: false,
            storagePath: storage.getStoragePath(),
            message: 'Invalid path provided',
          });
          return;
        }

        // Migrate to new path
        const finalPath = await storage.migrateToNewPath(newPath, deleteOld);

        res.json({
          success: true,
          storagePath: finalPath,
          message: deleteOld
            ? 'Data moved to new location'
            : 'Data copied to new location (original files kept)',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
