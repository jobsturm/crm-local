<script setup lang="ts">
import { h, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  NCard,
  NDataTable,
  NButton,
  NSpace,
  NTabs,
  NTabPane,
  NTag,
  NEmpty,
  NSpin,
  NText,
  useMessage,
  useDialog,
  type DataTableColumns,
} from 'naive-ui';
import { Add } from '@vicons/ionicons5';
import type { DocumentSummaryDto } from '@crm-local/shared';
import { STATUS_TAG_TYPES } from '@crm-local/shared';
import { useDocumentStore } from '@/stores/documents';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const store = useDocumentStore();

const activeTab = ref<'all' | 'offers' | 'invoices'>('all');

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL');
}

const columns: DataTableColumns<DocumentSummaryDto> = [
  {
    title: 'Number',
    key: 'documentNumber',
    sorter: 'default',
    minWidth: 140,
  },
  {
    title: 'Type',
    key: 'documentType',
    minWidth: 80,
    render: (row) =>
      h(
        NTag,
        { type: row.documentType === 'offer' ? 'info' : 'success', size: 'small' },
        { default: () => (row.documentType === 'offer' ? 'Offer' : 'Invoice') }
      ),
  },
  {
    title: 'Customer',
    key: 'customerName',
    sorter: 'default',
    minWidth: 150,
  },
  {
    title: 'Total',
    key: 'total',
    sorter: 'default',
    minWidth: 100,
    render: (row) => formatCurrency(row.total),
  },
  {
    title: 'Status',
    key: 'status',
    minWidth: 100,
    render: (row) =>
      h(
        NTag,
        { type: STATUS_TAG_TYPES[row.status], size: 'small' },
        { default: () => row.status.charAt(0).toUpperCase() + row.status.slice(1) }
      ),
  },
  {
    title: 'Due Date',
    key: 'dueDate',
    minWidth: 110,
    render: (row) => formatDate(row.dueDate),
  },
  {
    title: 'Actions',
    key: 'actions',
    minWidth: 200,
    render: (row) => {
      const buttons = [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => router.push(`/documents/${row.id}`),
          },
          { default: () => 'View' }
        ),
      ];

      if (row.documentType === 'offer' && row.status !== 'accepted' && row.status !== 'cancelled') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => handleConvert(row),
            },
            { default: () => 'Convert' }
          )
        );
      }

      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => 'Delete' }
        )
      );

      return h(NSpace, { size: 'small' }, () => buttons);
    },
  },
];

function handleConvert(doc: DocumentSummaryDto) {
  dialog.info({
    title: 'Convert to Invoice',
    content: `Convert offer "${doc.documentNumber}" to an invoice?`,
    positiveText: 'Convert',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        const invoice = await store.convertToInvoice(doc.id);
        message.success(`Created invoice ${invoice.documentNumber}`);
      } catch {
        message.error('Failed to convert offer');
      }
    },
  });
}

function handleDelete(doc: DocumentSummaryDto) {
  dialog.warning({
    title: 'Delete Document',
    content: `Are you sure you want to delete "${doc.documentNumber}"?`,
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        await store.deleteDocument(doc.id);
        message.success('Document deleted');
      } catch {
        message.error('Failed to delete document');
      }
    },
  });
}

const displayedDocuments = computed(() => {
  switch (activeTab.value) {
    case 'offers':
      return store.offers;
    case 'invoices':
      return store.invoices;
    default:
      return store.documents;
  }
});

onMounted(() => {
  store.fetchDocuments();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace justify="space-between" align="center">
      <NText tag="h1" strong style="font-size: 24px; margin: 0">Documents</NText>
      <NButton type="primary" @click="router.push('/documents/new')">
        <template #icon>
          <Add />
        </template>
        New Document
      </NButton>
    </NSpace>

    <NCard>
      <NTabs v-model:value="activeTab" type="line">
        <NTabPane name="all" tab="All" />
        <NTabPane name="offers" tab="Offers" />
        <NTabPane name="invoices" tab="Invoices" />
      </NTabs>

      <NSpin :show="store.loading">
        <NDataTable
          v-if="displayedDocuments.length > 0"
          :columns="columns"
          :data="displayedDocuments"
          :row-key="(row: DocumentSummaryDto) => row.id"
          :pagination="{ pageSize: 20 }"
          :scroll-x="880"
        />
        <NEmpty v-else-if="!store.loading" description="No documents found" />
      </NSpin>
    </NCard>
  </NSpace>
</template>
