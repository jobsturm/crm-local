/**
 * Financial Overview DTOs - For Dutch BTW/VAT reporting
 */

/** Quarter identifier */
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** Monthly revenue data */
export interface MonthlyRevenueDto {
  /** Month (1-12) */
  month: number;
  /** Year */
  year: number;
  /** Month name for display */
  monthName: string;
  /** Total revenue (excl. VAT) */
  revenue: number;
  /** Total VAT amount */
  vatAmount: number;
  /** Number of invoices */
  invoiceCount: number;
  /** Paid amount */
  paidAmount: number;
  /** Outstanding amount */
  outstandingAmount: number;
}

/** VAT breakdown by rate */
export interface VatBreakdownDto {
  /** VAT rate percentage */
  rate: number;
  /** Revenue at this rate (excl. VAT) */
  revenue: number;
  /** VAT amount at this rate */
  vatAmount: number;
}

/** Quarterly BTW summary (maps to Dutch BTW-aangifte) */
export interface QuarterlyBtwSummaryDto {
  /** Quarter (Q1, Q2, Q3, Q4) */
  quarter: Quarter;
  /** Year */
  year: number;
  /** Start date of quarter */
  startDate: string;
  /** End date of quarter */
  endDate: string;
  /** Total revenue (excl. VAT) - Omzet */
  totalRevenue: number;
  /** Total VAT collected - Verschuldigde BTW */
  totalVat: number;
  /** Breakdown by VAT rate */
  vatBreakdown: VatBreakdownDto[];
  /** Number of invoices in this quarter */
  invoiceCount: number;
  /** Paid invoices amount */
  paidAmount: number;
  /** Outstanding amount */
  outstandingAmount: number;
  /** Overdue amount */
  overdueAmount: number;
}

/** Invoice aging bucket */
export interface AgingBucketDto {
  /** Bucket label (e.g., "0-30 days", "31-60 days") */
  label: string;
  /** Number of invoices */
  count: number;
  /** Total amount */
  amount: number;
  /** Invoice IDs in this bucket */
  invoiceIds: string[];
}

/** Invoice status breakdown */
export interface InvoiceStatusBreakdownDto {
  status: string;
  count: number;
  amount: number;
}

/** Full financial overview response */
export interface FinancialOverviewDto {
  /** Selected quarter summary */
  quarterSummary: QuarterlyBtwSummaryDto;
  /** Monthly breakdown for the year */
  monthlyRevenue: MonthlyRevenueDto[];
  /** Year-to-date totals */
  ytdRevenue: number;
  ytdVat: number;
  ytdInvoiceCount: number;
  /** Invoice aging report */
  aging: AgingBucketDto[];
  /** Invoice status breakdown */
  statusBreakdown: InvoiceStatusBreakdownDto[];
  /** Comparison with same quarter previous year */
  previousYearComparison?: {
    revenue: number;
    percentageChange: number;
  };
  /** Fiscal year settings used */
  fiscalYearStartMonth: number;
}

/** Request params for financial overview */
export interface FinancialOverviewRequestDto {
  /** Year to query */
  year: number;
  /** Quarter to focus on (optional, defaults to current quarter) */
  quarter?: Quarter;
}

/** Response wrapper */
export interface FinancialOverviewResponseDto {
  overview: FinancialOverviewDto;
}
