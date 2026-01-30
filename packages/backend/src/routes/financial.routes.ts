/**
 * Financial Routes
 *
 * GET  /api/financial/overview - Get financial overview
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { StorageService } from '../services/storage.service.js';
import type {
  FinancialOverviewDto,
  FinancialOverviewResponseDto,
  QuarterlyBtwSummaryDto,
  MonthlyRevenueDto,
  VatBreakdownDto,
  AgingBucketDto,
  InvoiceStatusBreakdownDto,
  Quarter,
  DocumentDto,
} from '@crm-local/shared';
import { DEFAULT_SETTINGS } from '@crm-local/shared';

interface OverviewQueryParams {
  year?: string;
  quarter?: Quarter;
}

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Get quarter from month (1-12) based on fiscal year start
 */
function getQuarterFromMonth(month: number, fiscalYearStart: number): Quarter {
  // Normalize month to fiscal year (0-11)
  const fiscalMonth = (month - fiscalYearStart + 12) % 12;
  if (fiscalMonth < 3) return 'Q1';
  if (fiscalMonth < 6) return 'Q2';
  if (fiscalMonth < 9) return 'Q3';
  return 'Q4';
}

/**
 * Get quarter date range
 * For simplicity, assume fiscal year matches calendar year (fiscalYearStart = 1)
 * For other fiscal years, adjust year accordingly
 */
function getQuarterDateRange(
  quarter: Quarter,
  year: number,
  _fiscalYearStart: number
): { startDate: Date; endDate: Date } {
  // For now, use calendar quarters (Jan=Q1)
  // TODO: Support custom fiscal year starts
  const quarterIndex = parseInt(quarter.charAt(1)) - 1;
  const startMonth = quarterIndex * 3; // 0, 3, 6, or 9 (0-indexed)
  const endMonth = startMonth + 2;

  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, endMonth + 1, 0); // Last day of the end month

  return { startDate, endDate };
}

/**
 * Get current quarter based on fiscal year
 */
function getCurrentQuarter(fiscalYearStart: number): Quarter {
  const now = new Date();
  return getQuarterFromMonth(now.getMonth() + 1, fiscalYearStart);
}

export function createFinancialRoutes(storage: StorageService): Router {
  const router = Router();

  // Get financial overview
  router.get(
    '/overview',
    async (
      req: Request<object, FinancialOverviewResponseDto, object, OverviewQueryParams>,
      res: Response<FinancialOverviewResponseDto>,
      next: NextFunction
    ): Promise<void> => {
      try {
        const db = storage.getDatabase();
        // fiscalYearStartMonth defaults to 1 (January) - for older databases without this field
        const fiscalYearStartMonth =
          (db.settings as { fiscalYearStartMonth?: number }).fiscalYearStartMonth ??
          DEFAULT_SETTINGS.fiscalYearStartMonth;

        // Parse query params
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const quarter = req.query.quarter ?? getCurrentQuarter(fiscalYearStartMonth);

        // Load all invoices for the year
        const allInvoices = await storage.listDocuments('invoice');

        // Filter invoices by year (based on document date)
        const yearInvoices = allInvoices.filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return invDate.getFullYear() === year;
        });

        // Calculate quarter summary
        const quarterSummary = calculateQuarterSummary(
          yearInvoices,
          quarter,
          year,
          fiscalYearStartMonth
        );

        // Calculate monthly revenue
        const monthlyRevenue = calculateMonthlyRevenue(yearInvoices, year);

        // Calculate YTD totals
        const ytdStats = calculateYTDStats(yearInvoices);

        // Calculate aging buckets
        const aging = calculateAging(yearInvoices);

        // Calculate status breakdown
        const statusBreakdown = calculateStatusBreakdown(yearInvoices);

        // Calculate previous year comparison
        const prevYearFiltered = allInvoices.filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return invDate.getFullYear() === year - 1;
        });
        const previousYearComparison = calculatePreviousYearComparison(
          quarterSummary,
          prevYearFiltered,
          quarter,
          year - 1,
          fiscalYearStartMonth
        );

        const overview: FinancialOverviewDto = {
          quarterSummary,
          monthlyRevenue,
          ytdRevenue: ytdStats.revenue,
          ytdVat: ytdStats.vat,
          ytdInvoiceCount: ytdStats.count,
          aging,
          statusBreakdown,
          previousYearComparison,
          fiscalYearStartMonth,
        };

        res.json({ overview });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

function calculateQuarterSummary(
  invoices: DocumentDto[],
  quarter: Quarter,
  year: number,
  fiscalYearStart: number
): QuarterlyBtwSummaryDto {
  const { startDate, endDate } = getQuarterDateRange(quarter, year, fiscalYearStart);

  // Filter invoices in this quarter
  const quarterInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.createdAt);
    return invDate >= startDate && invDate <= endDate;
  });

  // Calculate totals
  let totalRevenue = 0;
  let totalVat = 0;
  let paidAmount = 0;
  let outstandingAmount = 0;
  let overdueAmount = 0;
  const vatByRate = new Map<number, { revenue: number; vat: number }>();

  const now = new Date();

  for (const inv of quarterInvoices) {
    totalRevenue += inv.subtotal;
    totalVat += inv.taxAmount;

    // Track by VAT rate
    const rate = inv.taxRate;
    const existing = vatByRate.get(rate) ?? { revenue: 0, vat: 0 };
    existing.revenue += inv.subtotal;
    existing.vat += inv.taxAmount;
    vatByRate.set(rate, existing);

    // Track payment status
    if (inv.status === 'paid') {
      paidAmount += inv.total;
    } else if (inv.status !== 'cancelled' && inv.status !== 'draft') {
      outstandingAmount += inv.total;
      const dueDate = new Date(inv.dueDate);
      if (dueDate < now) {
        overdueAmount += inv.total;
      }
    }
  }

  // Convert VAT breakdown to array
  const vatBreakdown: VatBreakdownDto[] = Array.from(vatByRate.entries())
    .map(([rate, data]) => ({
      rate,
      revenue: data.revenue,
      vatAmount: data.vat,
    }))
    .sort((a, b) => b.rate - a.rate); // Sort by rate descending (21% first)

  return {
    quarter,
    year,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalRevenue,
    totalVat,
    vatBreakdown,
    invoiceCount: quarterInvoices.length,
    paidAmount,
    outstandingAmount,
    overdueAmount,
  };
}

function calculateMonthlyRevenue(invoices: DocumentDto[], year: number): MonthlyRevenueDto[] {
  const monthlyData: MonthlyRevenueDto[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthInvoices = invoices.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      return invDate.getMonth() + 1 === month && invDate.getFullYear() === year;
    });

    let revenue = 0;
    let vatAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;

    for (const inv of monthInvoices) {
      revenue += inv.subtotal;
      vatAmount += inv.taxAmount;

      if (inv.status === 'paid') {
        paidAmount += inv.total;
      } else if (inv.status !== 'cancelled' && inv.status !== 'draft') {
        outstandingAmount += inv.total;
      }
    }

    monthlyData.push({
      month,
      year,
      monthName: MONTH_NAMES_EN[month - 1] ?? `Month ${String(month)}`,
      revenue,
      vatAmount,
      invoiceCount: monthInvoices.length,
      paidAmount,
      outstandingAmount,
    });
  }

  return monthlyData;
}

function calculateYTDStats(invoices: DocumentDto[]): { revenue: number; vat: number; count: number } {
  let revenue = 0;
  let vat = 0;

  for (const inv of invoices) {
    if (inv.status !== 'cancelled' && inv.status !== 'draft') {
      revenue += inv.subtotal;
      vat += inv.taxAmount;
    }
  }

  return {
    revenue,
    vat,
    count: invoices.filter((inv) => inv.status !== 'cancelled' && inv.status !== 'draft').length,
  };
}

function calculateAging(invoices: DocumentDto[]): AgingBucketDto[] {
  const now = new Date();
  const buckets: AgingBucketDto[] = [
    { label: '0-30 days', count: 0, amount: 0, invoiceIds: [] },
    { label: '31-60 days', count: 0, amount: 0, invoiceIds: [] },
    { label: '61-90 days', count: 0, amount: 0, invoiceIds: [] },
    { label: '90+ days', count: 0, amount: 0, invoiceIds: [] },
  ];

  // Only consider unpaid, non-cancelled invoices
  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'draft'
  );

  for (const inv of unpaidInvoices) {
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let bucketIndex: number;
    if (daysOverdue <= 30) {
      bucketIndex = 0;
    } else if (daysOverdue <= 60) {
      bucketIndex = 1;
    } else if (daysOverdue <= 90) {
      bucketIndex = 2;
    } else {
      bucketIndex = 3;
    }

    const bucket = buckets[bucketIndex];
    if (bucket) {
      bucket.count++;
      bucket.amount += inv.total;
      bucket.invoiceIds.push(inv.id);
    }
  }

  return buckets;
}

function calculateStatusBreakdown(invoices: DocumentDto[]): InvoiceStatusBreakdownDto[] {
  const statusMap = new Map<string, { count: number; amount: number }>();

  for (const inv of invoices) {
    const existing = statusMap.get(inv.status) ?? { count: 0, amount: 0 };
    existing.count++;
    existing.amount += inv.total;
    statusMap.set(inv.status, existing);
  }

  return Array.from(statusMap.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    amount: data.amount,
  }));
}

function calculatePreviousYearComparison(
  currentQuarter: QuarterlyBtwSummaryDto,
  previousYearInvoices: DocumentDto[],
  quarter: Quarter,
  previousYear: number,
  fiscalYearStart: number
): { revenue: number; percentageChange: number } | undefined {
  const prevQuarterSummary = calculateQuarterSummary(
    previousYearInvoices,
    quarter,
    previousYear,
    fiscalYearStart
  );

  if (prevQuarterSummary.totalRevenue === 0) {
    return undefined;
  }

  const percentageChange =
    ((currentQuarter.totalRevenue - prevQuarterSummary.totalRevenue) /
      prevQuarterSummary.totalRevenue) *
    100;

  return {
    revenue: prevQuarterSummary.totalRevenue,
    percentageChange,
  };
}
