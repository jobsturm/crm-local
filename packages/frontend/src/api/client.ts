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
} from '@crm-local/shared';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
