<script setup lang="ts">
import { h, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
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
  NInput,
  useMessage,
  useDialog,
  type DataTableColumns,
} from 'naive-ui';
import { Add, SearchOutline } from '@vicons/ionicons5';
import type { DocumentSummaryDto } from '@crm-local/shared';
import { STATUS_TAG_TYPES, STATUS_LABELS } from '@crm-local/shared';
import { useDocumentStore } from '@/stores/documents';

const router = useRouter();
const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useDocumentStore();

const activeTab = ref<'all' | 'offers' | 'invoices'>('all');
const searchQuery = ref('');

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL');
}

function getStatusLabel(status: string): string {
  return t(`status.${status}`, STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status);
}

const columns = computed<DataTableColumns<DocumentSummaryDto>>(() => [
  {
    title: t('documentList.col.number'),
    key: 'documentNumber',
    sorter: 'default',
    minWidth: 140,
  },
  {
    title: t('documentList.col.type'),
    key: 'documentType',
    minWidth: 80,
    render: (row) =>
      h(
        NTag,
        { type: row.documentType === 'offer' ? 'info' : 'success', size: 'small' },
        { default: () => t(`documentList.type.${row.documentType}`) }
      ),
  },
  {
    title: t('documentList.col.customer'),
    key: 'customerName',
    sorter: 'default',
    minWidth: 150,
  },
  {
    title: t('documentList.col.total'),
    key: 'total',
    sorter: 'default',
    minWidth: 100,
    render: (row) => formatCurrency(row.total),
  },
  {
    title: t('documentList.col.status'),
    key: 'status',
    minWidth: 100,
    render: (row) =>
      h(
        NTag,
        { type: STATUS_TAG_TYPES[row.status], size: 'small' },
        { default: () => getStatusLabel(row.status) }
      ),
  },
  {
    title: t('documentList.col.dueDate'),
    key: 'dueDate',
    minWidth: 110,
    render: (row) => formatDate(row.dueDate),
  },
  {
    title: t('documentList.col.actions'),
    key: 'actions',
    minWidth: 200,
    render: (row) => {
      const buttons = [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => void router.push(`/documents/${row.id}`),
          },
          { default: () => t('view') }
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
            { default: () => t('confirm') }
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
          { default: () => t('delete') }
        )
      );

      return h(NSpace, { size: 'small' }, () => buttons);
    },
  },
]);

function handleConvert(doc: DocumentSummaryDto) {
  dialog.info({
    title: t('documentList.convertTitle'),
    content: t('documentList.convertConfirm', { number: doc.documentNumber }),
    positiveText: t('confirm'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      try {
        const invoice = await store.convertToInvoice(doc.id);
        message.success(t('documentList.converted', { number: invoice.documentNumber }));
      } catch {
        message.error(t('documentList.convertFailed'));
      }
    },
  });
}

function handleDelete(doc: DocumentSummaryDto) {
  dialog.warning({
    title: t('documentList.deleteTitle'),
    content: t('documentList.deleteConfirm', { number: doc.documentNumber }),
    positiveText: t('delete'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      try {
        await store.deleteDocument(doc.id);
        message.success(t('documentList.deleted'));
      } catch {
        message.error(t('documentList.deleteFailed'));
      }
    },
  });
}

const filteredByTab = computed(() => {
  switch (activeTab.value) {
    case 'offers':
      return store.offers;
    case 'invoices':
      return store.invoices;
    default:
      return store.documents;
  }
});

const displayedDocuments = computed(() => {
  if (!searchQuery.value) return filteredByTab.value;
  
  const query = searchQuery.value.toLowerCase();
  return filteredByTab.value.filter(
    (doc) =>
      doc.documentNumber.toLowerCase().includes(query) ||
      doc.customerName.toLowerCase().includes(query) ||
      doc.status.toLowerCase().includes(query)
  );
});

onMounted(() => {
  void store.fetchDocuments();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace justify="space-between" align="center">
      <NText tag="h1" strong style="font-size: 24px; margin: 0">{{ t('documentList.title') }}</NText>
      <NButton type="primary" @click="router.push('/documents/new')">
        <template #icon>
          <Add />
        </template>
        {{ t('documentList.newDocument') }}
      </NButton>
    </NSpace>

    <NCard>
      <NSpace vertical :size="16">
        <NSpace justify="space-between" align="center">
          <NTabs v-model:value="activeTab" type="line" style="margin: 0">
            <NTabPane name="all" :tab="t('documentList.tab.all')" />
            <NTabPane name="offers" :tab="t('documentList.tab.offers')" />
            <NTabPane name="invoices" :tab="t('documentList.tab.invoices')" />
          </NTabs>
          <NInput
            v-model:value="searchQuery"
            :placeholder="t('documentList.searchPlaceholder')"
            clearable
            style="width: 300px"
          >
            <template #prefix>
              <SearchOutline />
            </template>
          </NInput>
        </NSpace>

        <NSpin :show="store.loading">
          <NDataTable
          v-if="displayedDocuments.length > 0"
          :columns="columns"
          :data="displayedDocuments"
          :row-key="(row: DocumentSummaryDto) => row.id"
          :pagination="{ pageSize: 20 }"
          :scroll-x="880"
        />
          <NEmpty v-else-if="!store.loading" :description="t('documentList.noDocuments')" />
        </NSpin>
      </NSpace>
    </NCard>
  </NSpace>
</template>
