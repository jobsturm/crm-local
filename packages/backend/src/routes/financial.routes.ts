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
  TimeSeriesRevenueDto,
  TimeGranularity,
} from '@crm-local/shared';
import { DEFAULT_SETTINGS } from '@crm-local/shared';

type DatePreset = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'thisYear' | 'yearToDate' | 'allTime' | 'custom';

interface OverviewQueryParams {
  year?: string;
  quarter?: Quarter;
  // New date range parameters
  preset?: DatePreset;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
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
 * Get current quarter based on fiscal year
 */
function getCurrentQuarter(fiscalYearStart: number): Quarter {
  const now = new Date();
  return getQuarterFromMonth(now.getMonth() + 1, fiscalYearStart);
}

/**
 * Resolve date range from preset or custom dates
 */
function resolveDateRange(
  preset: DatePreset | undefined,
  year: number,
  startDateStr?: string,
  endDateStr?: string
): { startDate: Date; endDate: Date; label: string } {
  const now = new Date();
  const currentYear = now.getFullYear();

  switch (preset) {
    case 'Q1':
      return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 2, 31),
        label: `Q1 ${year}`,
      };
    case 'Q2':
      return {
        startDate: new Date(year, 3, 1),
        endDate: new Date(year, 5, 30),
        label: `Q2 ${year}`,
      };
    case 'Q3':
      return {
        startDate: new Date(year, 6, 1),
        endDate: new Date(year, 8, 30),
        label: `Q3 ${year}`,
      };
    case 'Q4':
      return {
        startDate: new Date(year, 9, 1),
        endDate: new Date(year, 11, 31),
        label: `Q4 ${year}`,
      };
    case 'thisYear':
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        label: `${currentYear}`,
      };
    case 'yearToDate':
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: now,
        label: `YTD ${currentYear}`,
      };
    case 'allTime':
      // Will be refined to actual invoice dates in the route handler
      return {
        startDate: new Date(2000, 0, 1), // Placeholder - refined later
        endDate: now, // At most until today
        label: 'All Time',
      };
    case 'custom':
      if (startDateStr && endDateStr) {
        return {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
          label: 'Custom Range',
        };
      }
      // No custom dates provided, fall back to current quarter
      break;
    default:
      break;
  }

  // Default: current quarter
  const currentQuarter = getCurrentQuarter(1);
  const qIndex = parseInt(currentQuarter.charAt(1)) - 1;
  return {
    startDate: new Date(currentYear, qIndex * 3, 1),
    endDate: new Date(currentYear, qIndex * 3 + 3, 0),
    label: `${currentQuarter} ${currentYear}`,
  };
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
        const preset = req.query.preset as DatePreset | undefined;
        
        // Resolve date range from preset or legacy quarter param
        let dateRange: { startDate: Date; endDate: Date; label: string };
        if (preset) {
          dateRange = resolveDateRange(preset, year, req.query.startDate, req.query.endDate);
        } else if (req.query.quarter) {
          // Legacy: convert quarter to preset
          dateRange = resolveDateRange(req.query.quarter as DatePreset, year);
        } else {
          // Default to current quarter
          dateRange = resolveDateRange(getCurrentQuarter(fiscalYearStartMonth) as DatePreset, year);
        }

        // Load all invoices
        const allInvoices = await storage.listDocuments('invoice');

        // For 'allTime' preset, refine the date range to actual invoice dates
        if (preset === 'allTime' && allInvoices.length > 0) {
          const invoiceDates = allInvoices.map((inv) => new Date(inv.createdAt).getTime());
          const minDate = new Date(Math.min(...invoiceDates));
          const maxDate = new Date(Math.max(...invoiceDates));
          // Start from beginning of the earliest month
          dateRange.startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
          // End at the end of current month or latest invoice month, whichever is later
          const now = new Date();
          const latestEndDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
          const currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          dateRange.endDate = latestEndDate > currentEndDate ? latestEndDate : currentEndDate;
        }

        // Filter invoices by date range
        const filteredInvoices = allInvoices.filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return invDate >= dateRange.startDate && invDate <= dateRange.endDate;
        });

        // For monthly/YTD stats, we need the full year's data
        const yearInvoices = allInvoices.filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return invDate.getFullYear() === year;
        });

        // Calculate period summary (uses filtered date range)
        const quarterSummary = calculatePeriodSummary(
          filteredInvoices,
          dateRange.startDate,
          dateRange.endDate,
          dateRange.label
        );

        // Calculate monthly revenue (full year for chart context)
        const monthlyRevenue = calculateMonthlyRevenue(yearInvoices, year);

        // Calculate YTD totals
        const ytdStats = calculateYTDStats(yearInvoices);

        // Calculate aging buckets (all unpaid invoices)
        const aging = calculateAging(allInvoices);

        // Calculate status breakdown (filtered period)
        const statusBreakdown = calculateStatusBreakdown(filteredInvoices);

        // Calculate previous period comparison
        const periodDuration = dateRange.endDate.getTime() - dateRange.startDate.getTime();
        const prevPeriodEnd = new Date(dateRange.startDate.getTime() - 1);
        const prevPeriodStart = new Date(prevPeriodEnd.getTime() - periodDuration);
        const prevPeriodInvoices = allInvoices.filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return invDate >= prevPeriodStart && invDate <= prevPeriodEnd;
        });
        const previousYearComparison = calculatePreviousYearComparisonFromPeriod(
          quarterSummary,
          prevPeriodInvoices
        );

        // Calculate time-series data with appropriate granularity
        const { granularity, data: timeSeriesRevenue } = calculateTimeSeriesRevenue(
          filteredInvoices,
          dateRange.startDate,
          dateRange.endDate
        );

        const overview: FinancialOverviewDto = {
          quarterSummary,
          monthlyRevenue,
          timeSeriesRevenue,
          timeSeriesGranularity: granularity,
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

/**
 * Calculate summary for any date period
 */
function calculatePeriodSummary(
  invoices: DocumentDto[],
  startDate: Date,
  endDate: Date,
  label: string
): QuarterlyBtwSummaryDto {
  // Calculate totals
  let totalRevenue = 0;
  let totalVat = 0;
  let paidAmount = 0;
  let outstandingAmount = 0;
  let overdueAmount = 0;
  const vatByRate = new Map<number, { revenue: number; vat: number }>();

  const now = new Date();

  for (const inv of invoices) {
    // Only count PAID invoices for revenue (cash basis accounting)
    if (inv.status === 'paid') {
      totalRevenue += inv.subtotal;
      totalVat += inv.taxAmount;
      paidAmount += inv.total;

      // Track by VAT rate (only for paid invoices)
      const rate = inv.taxRate;
      const existing = vatByRate.get(rate) ?? { revenue: 0, vat: 0 };
      existing.revenue += inv.subtotal;
      existing.vat += inv.taxAmount;
      vatByRate.set(rate, existing);
    } else if (inv.status !== 'cancelled' && inv.status !== 'draft') {
      // Track outstanding/overdue for sent invoices
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
    .sort((a, b) => b.rate - a.rate);

  // Determine quarter from label or date
  const quarter = (label.match(/Q[1-4]/)?.[0] as Quarter) ?? 'Q1';
  const year = startDate.getFullYear();

  return {
    quarter,
    year,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalRevenue,
    totalVat,
    vatBreakdown,
    invoiceCount: invoices.length,
    paidAmount,
    outstandingAmount,
    overdueAmount,
  };
}

/**
 * Calculate comparison with previous period
 */
function calculatePreviousYearComparisonFromPeriod(
  currentPeriod: QuarterlyBtwSummaryDto,
  previousPeriodInvoices: DocumentDto[]
): { revenue: number; percentageChange: number } | undefined {
  // Calculate previous period revenue (paid invoices only)
  let prevRevenue = 0;
  for (const inv of previousPeriodInvoices) {
    if (inv.status === 'paid') {
      prevRevenue += inv.subtotal;
    }
  }

  if (prevRevenue === 0) {
    return undefined;
  }

  const percentageChange =
    ((currentPeriod.totalRevenue - prevRevenue) / prevRevenue) * 100;

  return {
    revenue: prevRevenue,
    percentageChange,
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
      // Only count PAID invoices for revenue (cash basis accounting)
      if (inv.status === 'paid') {
        revenue += inv.subtotal;
        vatAmount += inv.taxAmount;
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

/**
 * Determine appropriate time granularity based on date range
 */
function determineGranularity(startDate: Date, endDate: Date): TimeGranularity {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffWeeks = diffDays / 7;
  const diffMonths = diffDays / 30;

  if (diffWeeks < 4) {
    return 'day';
  } else if (diffMonths < 4) {
    return 'week';
  } else {
    return 'month';
  }
}

/**
 * Calculate time-series revenue data with appropriate granularity
 */
function calculateTimeSeriesRevenue(
  invoices: DocumentDto[],
  startDate: Date,
  endDate: Date
): { granularity: TimeGranularity; data: TimeSeriesRevenueDto[] } {
  const granularity = determineGranularity(startDate, endDate);
  const data: TimeSeriesRevenueDto[] = [];

  // Generate time periods
  const periods: { start: Date; end: Date; label: string }[] = [];
  let current = new Date(startDate);

  if (granularity === 'day') {
    while (current <= endDate) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);
      periodEnd.setHours(23, 59, 59, 999);
      
      const label = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      periods.push({ start: periodStart, end: periodEnd, label });
      
      current.setDate(current.getDate() + 1);
    }
  } else if (granularity === 'week') {
    // Start from beginning of week containing startDate
    const dayOfWeek = current.getDay();
    current.setDate(current.getDate() - dayOfWeek); // Move to Sunday
    
    let weekNum = 1;
    while (current <= endDate) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);
      periodEnd.setDate(periodEnd.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
      
      const label = `Week ${weekNum}`;
      periods.push({ start: periodStart, end: periodEnd, label });
      
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
  } else {
    // Month granularity
    current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (current <= endDate) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
      
      const label = periodStart.toLocaleDateString('en-US', { month: 'short' });
      periods.push({ start: periodStart, end: periodEnd, label });
      
      current.setMonth(current.getMonth() + 1);
    }
  }

  // Calculate stats for each period
  for (const period of periods) {
    const periodInvoices = invoices.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      return invDate >= period.start && invDate <= period.end;
    });

    let revenue = 0;
    let vatAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;

    for (const inv of periodInvoices) {
      if (inv.status === 'paid') {
        revenue += inv.subtotal;
        vatAmount += inv.taxAmount;
        paidAmount += inv.total;
      } else if (inv.status !== 'cancelled' && inv.status !== 'draft') {
        outstandingAmount += inv.total;
      }
    }

    data.push({
      label: period.label,
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
      revenue,
      vatAmount,
      invoiceCount: periodInvoices.length,
      paidAmount,
      outstandingAmount,
    });
  }

  return { granularity, data };
}

function calculateYTDStats(invoices: DocumentDto[]): { revenue: number; vat: number; count: number } {
  let revenue = 0;
  let vat = 0;
  let count = 0;

  // Only count PAID invoices for YTD revenue (cash basis accounting)
  for (const inv of invoices) {
    if (inv.status === 'paid') {
      revenue += inv.subtotal;
      vat += inv.taxAmount;
      count++;
    }
  }

  return { revenue, vat, count };
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
