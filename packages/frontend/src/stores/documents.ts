import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  DocumentDto,
  DocumentSummaryDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentType,
} from '@crm-local/shared';
import * as api from '@/api/client';

export const useDocumentStore = defineStore('documents', () => {
  const documents = ref<DocumentSummaryDto[]>([]);
  const currentDocument = ref<DocumentDto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const offers = computed(() => documents.value.filter((d) => d.documentType === 'offer'));

  const invoices = computed(() => documents.value.filter((d) => d.documentType === 'invoice'));

  async function fetchDocuments(type?: DocumentType): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      documents.value = await api.getDocuments(type);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch documents';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDocument(id: string): Promise<DocumentDto> {
    loading.value = true;
    error.value = null;
    try {
      currentDocument.value = await api.getDocument(id);
      return currentDocument.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch document';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createDocument(data: CreateDocumentDto): Promise<DocumentDto> {
    const doc = await api.createDocument(data);
    // Refresh list to include new document
    await fetchDocuments();
    return doc;
  }

  async function updateDocument(id: string, data: UpdateDocumentDto): Promise<DocumentDto> {
    const updated = await api.updateDocument(id, data);
    currentDocument.value = updated;
    // Update in list
    const index = documents.value.findIndex((d) => d.id === id);
    if (index !== -1) {
      documents.value[index] = {
        id: updated.id,
        documentType: updated.documentType,
        documentNumber: updated.documentNumber,
        customerId: updated.customerId,
        customerName: updated.customer.name,
        total: updated.total,
        status: updated.status,
        createdAt: updated.createdAt,
        dueDate: updated.dueDate,
      };
    }
    return updated;
  }

  async function deleteDocument(id: string): Promise<void> {
    await api.deleteDocument(id);
    documents.value = documents.value.filter((d) => d.id !== id);
    if (currentDocument.value?.id === id) {
      currentDocument.value = null;
    }
  }

  async function convertToInvoice(offerId: string): Promise<DocumentDto> {
    const invoice = await api.convertOfferToInvoice(offerId);
    // Refresh list to include new invoice and update offer status
    await fetchDocuments();
    return invoice;
  }

  return {
    documents,
    currentDocument,
    loading,
    error,
    offers,
    invoices,
    fetchDocuments,
    fetchDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    convertToInvoice,
  };
});
