/**
 * Business Routes
 *
 * GET  /api/business - Get business info
 * PUT  /api/business - Update business info
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { StorageService } from '../services/storage.service.js';
import type { BusinessDto, UpdateBusinessDto, BusinessResponseDto } from '@crm-local/shared';

export function createBusinessRoutes(storage: StorageService): Router {
  const router = Router();

  // Get business info
  router.get(
    '/',
    (_req: Request, res: Response<BusinessResponseDto | { business: null }>): void => {
      const db = storage.getDatabase();
      res.json({ business: db.business });
    }
  );

  // Update business info
  router.put(
    '/',
    async (
      req: Request<object, BusinessResponseDto, UpdateBusinessDto>,
      res: Response<BusinessResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const data = req.body;
        const db = storage.getDatabase();
        const now = new Date().toISOString();

        let business: BusinessDto;

        if (db.business) {
          // Update existing
          const existingBankDetails = db.business.bankDetails;
          business = {
            ...db.business,
            ...data,
            address: data.address
              ? { ...db.business.address, ...data.address }
              : db.business.address,
            bankDetails:
              data.bankDetails && existingBankDetails
                ? {
                    bankName: data.bankDetails.bankName ?? existingBankDetails.bankName,
                    accountHolder:
                      data.bankDetails.accountHolder ?? existingBankDetails.accountHolder,
                    iban: data.bankDetails.iban ?? existingBankDetails.iban,
                    bic: data.bankDetails.bic ?? existingBankDetails.bic,
                  }
                : existingBankDetails,
            updatedAt: now,
          };
        } else {
          // Create new - require all fields
          if (!data.name || !data.address || !data.phone || !data.email) {
            res.status(400).json({
              business: null as unknown as BusinessDto,
            });
            return;
          }

          business = {
            name: data.name,
            address: {
              street: data.address.street ?? '',
              city: data.address.city ?? '',
              state: data.address.state ?? '',
              postalCode: data.address.postalCode ?? '',
              country: data.address.country ?? '',
            },
            phone: data.phone,
            email: data.email,
            website: data.website,
            taxId: data.taxId,
            chamberOfCommerce: data.chamberOfCommerce,
            logo: data.logo,
            bankDetails: data.bankDetails
              ? {
                  bankName: data.bankDetails.bankName ?? '',
                  accountHolder: data.bankDetails.accountHolder ?? '',
                  iban: data.bankDetails.iban ?? '',
                  bic: data.bankDetails.bic,
                }
              : undefined,
            updatedAt: now,
          };
        }

        await storage.updateDatabase((db) => {
          db.business = business;
        });

        res.json({ business });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
