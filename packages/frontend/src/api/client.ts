/**
 * API Client for CRM Backend
 *
 * All API calls go through this module.
 */

import type {
  CustomerDto,
  CustomerListResponseDto,
  CustomerResponseDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  BusinessDto,
  BusinessResponseDto,
  UpdateBusinessDto,
  SettingsDto,
  SettingsResponseDto,
  UpdateSettingsDto,
  DocumentDto,
  DocumentSummaryDto,
  DocumentListResponseDto,
  DocumentResponseDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentType,
  FinancialOverviewDto,
  FinancialOverviewResponseDto,
  Quarter,
  DashboardStatsDto,
  DashboardResponseDto,
} from '@crm-local/shared';

// API base URL management
// In Electron (file: protocol), we need absolute URLs to the backend
// In browser (with Vite proxy), we use relative URL
let API_BASE = '/api';
let apiBasePromise: Promise<void> | null = null;

// Detect if we're running in Electron (file: protocol)
const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';

async function initializeApiBase(): Promise<void> {
  // Return existing promise if initialization is already in progress
  if (apiBasePromise) return apiBasePromise;

  apiBasePromise = (async () => {
    if (!isElectron) {
      console.log('Browser mode: using relative API path');
      return;
    }

    console.log('Electron mode: waiting for backend port...');
    
    // Wait for electronAPI to be available (preload script may not have run yet)
    let attempts = 0;
    while (!window.electronAPI?.getBackendPort && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    if (window.electronAPI?.getBackendPort) {
      try {
        const port = await window.electronAPI.getBackendPort();
        API_BASE = `http://localhost:${port}/api`;
        console.log(`API initialized with port from Electron: ${API_BASE}`);
      } catch (err) {
        console.error('Failed to get backend port:', err);
        API_BASE = 'http://localhost:3456/api';
        console.log(`API fallback: ${API_BASE}`);
      }
    } else {
      console.warn(`electronAPI not available after ${attempts} attempts, using default`);
      API_BASE = 'http://localhost:3456/api';
    }
  })();

  return apiBasePromise;
}

// Start initialization immediately in Electron mode
if (isElectron) {
  void initializeApiBase();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Ensure API base is initialized
  await initializeApiBase();

  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge additional headers if provided
  if (options.headers) {
    const additionalHeaders = options.headers as Record<string, string>;
    Object.assign(headers, additionalHeaders);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorBody: { error?: string } = { error: 'Unknown error' };
    try {
      errorBody = (await response.json()) as { error?: string };
    } catch {
      // Keep default error message
    }
    throw new Error(errorBody.error ?? `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ============ Customers ============

export async function getCustomers(): Promise<CustomerDto[]> {
  const res = await request<CustomerListResponseDto>('/customers');
  return res.customers;
}

export async function getCustomer(id: string): Promise<CustomerDto> {
  const res = await request<CustomerResponseDto>(`/customers/${id}`);
  return res.customer;
}

export async function createCustomer(data: CreateCustomerDto): Promise<CustomerDto> {
  const res = await request<CustomerResponseDto>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.customer;
}

export async function updateCustomer(id: string, data: UpdateCustomerDto): Promise<CustomerDto> {
  const res = await request<CustomerResponseDto>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await request<undefined>(`/customers/${id}`, { method: 'DELETE' });
}

// ============ Business ============

export async function getBusiness(): Promise<BusinessDto | null> {
  const res = await request<BusinessResponseDto | { business: null }>('/business');
  return res.business;
}

export async function updateBusiness(data: UpdateBusinessDto): Promise<BusinessDto> {
  const res = await request<BusinessResponseDto>('/business', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.business;
}

// ============ Settings ============

export async function getSettings(): Promise<SettingsDto> {
  const res = await request<SettingsResponseDto>('/settings');
  return res.settings;
}

export async function updateSettings(data: UpdateSettingsDto): Promise<SettingsDto> {
  const res = await request<SettingsResponseDto>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.settings;
}

interface ChangeStoragePathResponse {
  success: boolean;
  storagePath: string;
  message?: string;
}

export async function changeStoragePath(
  newPath: string,
  deleteOld: boolean = false
): Promise<ChangeStoragePathResponse> {
  return request<ChangeStoragePathResponse>('/settings/storage-path', {
    method: 'POST',
    body: JSON.stringify({ newPath, deleteOld }),
  });
}

// ============ Documents ============

export async function getDocuments(type?: DocumentType): Promise<DocumentSummaryDto[]> {
  const query = type ? `?type=${type}` : '';
  const res = await request<DocumentListResponseDto>(`/documents${query}`);
  return res.documents;
}

export async function getOffers(): Promise<DocumentSummaryDto[]> {
  const res = await request<DocumentListResponseDto>('/documents/offers');
  return res.documents;
}

export async function getInvoices(): Promise<DocumentSummaryDto[]> {
  const res = await request<DocumentListResponseDto>('/documents/invoices');
  return res.documents;
}

export async function getDocument(id: string): Promise<DocumentDto> {
  const res = await request<DocumentResponseDto>(`/documents/${id}`);
  return res.document;
}

export async function createDocument(data: CreateDocumentDto): Promise<DocumentDto> {
  const res = await request<DocumentResponseDto>('/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.document;
}

export async function updateDocument(id: string, data: UpdateDocumentDto): Promise<DocumentDto> {
  const res = await request<DocumentResponseDto>(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.document;
}

export async function deleteDocument(id: string): Promise<void> {
  await request<undefined>(`/documents/${id}`, { method: 'DELETE' });
}

export async function convertOfferToInvoice(offerId: string): Promise<DocumentDto> {
  const res = await request<DocumentResponseDto>('/documents/convert-to-invoice', {
    method: 'POST',
    body: JSON.stringify({ offerId }),
  });
  return res.document;
}

// ============ Financial ============

export type DatePreset = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'thisYear' | 'yearToDate' | 'allTime' | 'custom';

export interface FinancialOverviewParams {
  year?: number;
  quarter?: Quarter;
  preset?: DatePreset;
  startDate?: string;
  endDate?: string;
}

export async function getFinancialOverview(
  params?: FinancialOverviewParams
): Promise<FinancialOverviewDto> {
  const searchParams = new URLSearchParams();
  if (params?.year !== undefined) searchParams.set('year', String(params.year));
  if (params?.quarter !== undefined) searchParams.set('quarter', params.quarter);
  if (params?.preset !== undefined) searchParams.set('preset', params.preset);
  if (params?.startDate !== undefined) searchParams.set('startDate', params.startDate);
  if (params?.endDate !== undefined) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const res = await request<FinancialOverviewResponseDto>(`/financial/overview${query}`);
  return res.overview;
}

// ============ Dashboard ============

export async function getDashboardStats(): Promise<DashboardStatsDto> {
  const res = await request<DashboardResponseDto>('/dashboard');
  return res.stats;
}
