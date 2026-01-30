/**
 * Dashboard Routes
 *
 * GET /api/dashboard - Get dashboard statistics
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { StorageService } from '../services/storage.service.js';
import type {
  DashboardResponseDto,
  DashboardStatsDto,
  OverdueInvoiceDto,
  TopInvoiceDto,
  TopCustomerDto,
  DocumentDto,
} from '@crm-local/shared';

export function createDashboardRoutes(storage: StorageService): Router {
  const router = Router();

  router.get(
    '/',
    async (
      _req: Request,
      res: Response<DashboardResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const db = storage.getDatabase();
        const allInvoices = await storage.listDocuments('invoice');
        const allOffers = await storage.listDocuments('offer');

        const now = new Date();
        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth();

        // Filter to non-draft/cancelled invoices for revenue calculations
        const validInvoices = allInvoices.filter(
          (inv) => inv.status !== 'draft' && inv.status !== 'cancelled'
        );

        // Calculate total earnings (paid invoices only)
        const paidInvoices = allInvoices.filter((inv) => inv.status === 'paid');

        const totalEarningsAllTime = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

        const totalEarningsThisYear = paidInvoices
          .filter((inv) => new Date(inv.createdAt).getFullYear() === thisYear)
          .reduce((sum, inv) => sum + inv.total, 0);

        const totalEarningsThisMonth = paidInvoices
          .filter((inv) => {
            const d = new Date(inv.createdAt);
            return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
          })
          .reduce((sum, inv) => sum + inv.total, 0);

        // Outstanding & overdue
        const outstandingInvoices = allInvoices.filter(
          (inv) => inv.status === 'sent' || inv.status === 'overdue'
        );
        const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0);

        const overdueInvoicesList = allInvoices.filter((inv) => {
          if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') {
            return false;
          }
          return new Date(inv.dueDate) < now;
        });

        const overdueAmount = overdueInvoicesList.reduce((sum, inv) => sum + inv.total, 0);

        // Overdue invoices with details
        const overdueInvoices: OverdueInvoiceDto[] = overdueInvoicesList
          .map((inv) => {
            const dueDate = new Date(inv.dueDate);
            const daysOverdue = Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return {
              id: inv.id,
              documentNumber: inv.documentNumber,
              customerName: inv.customer.name,
              total: inv.total,
              dueDate: inv.dueDate,
              daysOverdue,
            };
          })
          .sort((a, b) => b.daysOverdue - a.daysOverdue)
          .slice(0, 5);

        // Top 3 highest paid invoices
        const topPaidInvoices: TopInvoiceDto[] = paidInvoices
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
          .map((inv) => ({
            id: inv.id,
            documentNumber: inv.documentNumber,
            customerName: inv.customer.name,
            total: inv.total,
            paidDate: findPaidDate(inv),
          }));

        // Top 3 customers by revenue
        const customerRevenue = new Map<
          string,
          { id: string; name: string; company?: string; total: number; count: number }
        >();

        for (const inv of paidInvoices) {
          const existing = customerRevenue.get(inv.customerId);
          if (existing) {
            existing.total += inv.total;
            existing.count += 1;
          } else {
            customerRevenue.set(inv.customerId, {
              id: inv.customerId,
              name: inv.customer.name,
              company: inv.customer.company,
              total: inv.total,
              count: 1,
            });
          }
        }

        const topCustomers: TopCustomerDto[] = Array.from(customerRevenue.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
          .map((c) => ({
            id: c.id,
            name: c.name,
            company: c.company,
            totalRevenue: c.total,
            invoiceCount: c.count,
          }));

        // Average invoice value
        const averageInvoiceValue =
          validInvoices.length > 0
            ? validInvoices.reduce((sum, inv) => sum + inv.total, 0) / validInvoices.length
            : 0;

        // Biggest invoice ever
        const biggestInvoice = paidInvoices.sort((a, b) => b.total - a.total)[0];
        const biggestInvoiceEver: TopInvoiceDto | null = biggestInvoice
          ? {
              id: biggestInvoice.id,
              documentNumber: biggestInvoice.documentNumber,
              customerName: biggestInvoice.customer.name,
              total: biggestInvoice.total,
              paidDate: findPaidDate(biggestInvoice),
            }
          : null;

        const stats: DashboardStatsDto = {
          totalEarningsAllTime,
          totalEarningsThisYear,
          totalEarningsThisMonth,
          totalCustomers: db.customers.length,
          totalInvoices: allInvoices.length,
          totalOffers: allOffers.length,
          outstandingAmount,
          overdueAmount,
          overdueCount: overdueInvoicesList.length,
          overdueInvoices,
          topPaidInvoices,
          topCustomers,
          averageInvoiceValue,
          biggestInvoiceEver,
        };

        res.json({ stats });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

// Helper to find when an invoice was marked as paid
function findPaidDate(invoice: DocumentDto): string {
  const paidEntry = invoice.statusHistory?.find((entry) => entry.toStatus === 'paid');
  return paidEntry?.timestamp ?? invoice.updatedAt;
}
