/**
 * Dashboard DTOs
 *
 * Statistics and insights for the dashboard view.
 */

export interface OverdueInvoiceDto {
  id: string;
  documentNumber: string;
  customerName: string;
  total: number;
  dueDate: string;
  daysOverdue: number;
}

export interface TopInvoiceDto {
  id: string;
  documentNumber: string;
  customerName: string;
  total: number;
  paidDate: string;
}

export interface TopCustomerDto {
  id: string;
  name: string;
  company?: string;
  totalRevenue: number;
  invoiceCount: number;
}

export interface DashboardStatsDto {
  // Earnings
  totalEarningsAllTime: number;
  totalEarningsThisYear: number;
  totalEarningsThisMonth: number;

  // Counts
  totalCustomers: number;
  totalInvoices: number;
  totalOffers: number;

  // Outstanding
  outstandingAmount: number;
  overdueAmount: number;
  overdueCount: number;

  // Lists
  overdueInvoices: OverdueInvoiceDto[];
  topPaidInvoices: TopInvoiceDto[];
  topCustomers: TopCustomerDto[];

  // Fun stats
  averageInvoiceValue: number;
  biggestInvoiceEver: TopInvoiceDto | null;
}

export interface DashboardResponseDto {
  stats: DashboardStatsDto;
}
