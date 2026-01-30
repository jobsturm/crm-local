<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NButton,
  NButtonGroup,
  NSpace,
  NSpin,
  NText,
  NEmpty,
  NTag,
  NDivider,
  NDataTable,
  NTimeline,
  NTimelineItem,
  NSelect,
  useMessage,
  useDialog,
  type DataTableColumns,
  type SelectOption,
} from 'naive-ui';
import {
  ArrowBackOutline,
  DownloadOutline,
  SwapHorizontalOutline,
  CreateOutline,
} from '@vicons/ionicons5';
import type { DocumentItemDto, DocumentStatus } from '@crm-local/shared';
import {
  OFFER_STATUSES,
  INVOICE_STATUSES,
  STATUS_TAG_TYPES,
} from '@crm-local/shared';
import { useI18n } from 'vue-i18n';
import { useDocumentStore } from '@/stores/documents';
import { useSettingsStore } from '@/stores/settings';
import { generatePDF } from '@/services/pdf-generator';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const { t } = useI18n();
const store = useDocumentStore();
const settingsStore = useSettingsStore();

const documentId = computed(() => route.params.id as string);

// Get translated status label
function getStatusLabel(status: DocumentStatus): string {
  return t(`status.${status}`);
}

const statusSelectOptions = computed<SelectOption[]>(() => {
  const docType = store.currentDocument?.documentType;
  const currentStatus = store.currentDocument?.status;
  const statuses = docType === 'offer' ? OFFER_STATUSES : INVOICE_STATUSES;
  return statuses
    .filter((status) => status !== currentStatus)
    .map((status) => ({
      label: getStatusLabel(status),
      value: status,
    }));
});

const currentStatus = computed({
  get: () => store.currentDocument?.status,
  set: (value: DocumentStatus | undefined) => {
    if (value && value !== store.currentDocument?.status) {
      handleStatusChange(value);
    }
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL');
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-NL');
}

const itemColumns = computed<DataTableColumns<DocumentItemDto>>(() => [
  { title: t('description'), key: 'description' },
  { title: t('qty'), key: 'quantity', width: 80 },
  {
    title: t('unitPrice'),
    key: 'unitPrice',
    width: 120,
    render: (row) => formatCurrency(row.unitPrice),
  },
  {
    title: t('total'),
    key: 'total',
    width: 120,
    render: (row) => formatCurrency(row.total),
  },
]);

async function handleStatusChange(newStatus: DocumentStatus): Promise<void> {
  const doc = store.currentDocument;
  if (!doc) return;

  dialog.info({
    title: t('changeStatus'),
    content: t('changeStatusConfirm', {
      fromStatus: getStatusLabel(doc.status),
      toStatus: getStatusLabel(newStatus),
    }),
    positiveText: t('confirm'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      try {
        await store.updateDocument(doc.id, { status: newStatus });
        message.success(t('statusUpdated'));
      } catch {
        message.error(t('statusUpdateFailed'));
      }
    },
  });
}

async function handleConvert(): Promise<void> {
  const doc = store.currentDocument;
  if (!doc) return;

  // Check if already converted
  if (doc.convertedToInvoiceId) {
    dialog.warning({
      title: t('alreadyConverted'),
      content: t('alreadyConvertedMessage'),
      positiveText: t('deleteAndReconvert'),
      negativeText: t('cancel'),
      onPositiveClick: async () => {
        try {
          // Delete the existing invoice
          if (doc.convertedToInvoiceId) {
            await store.deleteDocument(doc.convertedToInvoiceId);
          }
          message.info(t('deletedExistingInvoice'));

          // Now convert again
          const invoice = await store.convertToInvoice(doc.id);
          message.success(t('createdNewInvoice', { number: invoice.documentNumber }));
          void router.push(`/documents/${invoice.id}`);
        } catch {
          message.error(t('reconvertFailed'));
        }
      },
    });
    return;
  }

  dialog.info({
    title: t('convertToInvoice'),
    content: t('convertConfirm', { number: doc.documentNumber }),
    positiveText: t('convert'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      try {
        const invoice = await store.convertToInvoice(doc.id);
        message.success(t('createdInvoice', { number: invoice.documentNumber }));
        void router.push(`/documents/${invoice.id}`);
      } catch {
        message.error(t('convertFailed'));
      }
    },
  });
}

async function handleDownloadPDF(): Promise<void> {
  const doc = store.currentDocument;
  if (!doc || !settingsStore.business || !settingsStore.settings) {
    message.error(t('missingInfo'));
    return;
  }

  try {
    const result = await generatePDF(doc, settingsStore.business, settingsStore.settings);
    if (result.success) {
      if (result.filePath) {
        message.success(t('pdfSaved', { path: result.filePath }));
      } else {
        message.info(t('pdfOpened'));
      }
    } else {
      message.error(result.error ?? t('pdfFailed'));
    }
  } catch {
    message.error(t('pdfFailed'));
  }
}

function navigateToConvertedInvoice(): void {
  const invoiceId = store.currentDocument?.convertedToInvoiceId;
  if (invoiceId) {
    void router.push(`/documents/${invoiceId}`);
  }
}

function navigateToSourceOffer(): void {
  const offerId = store.currentDocument?.convertedFromOfferId;
  if (offerId) {
    void router.push(`/documents/${offerId}`);
  }
}

async function loadDocument(): Promise<void> {
  await store.fetchDocument(documentId.value);
}

onMounted(async () => {
  await Promise.all([
    loadDocument(),
    settingsStore.fetchBusiness(),
    settingsStore.fetchSettings(),
  ]);
});

// Watch for route param changes to reload document when navigating between documents
watch(documentId, () => {
  void loadDocument();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace align="center" :size="16">
      <NButton quaternary circle @click="router.push('/documents')">
        <template #icon>
          <ArrowBackOutline />
        </template>
      </NButton>
      <NText tag="h1" strong style="font-size: 24px; margin: 0">
        {{ store.currentDocument?.documentNumber ?? t('details') }}
      </NText>
      <NTag
        v-if="store.currentDocument"
        :type="store.currentDocument.documentType === 'offer' ? 'info' : 'success'"
      >
        {{ store.currentDocument.documentType === 'offer' ? t('type.offer') : t('type.invoice') }}
      </NTag>
      <NTag v-if="store.currentDocument" :type="STATUS_TAG_TYPES[store.currentDocument.status]">
        {{ getStatusLabel(store.currentDocument.status) }}
      </NTag>
    </NSpace>

    <NSpin :show="store.loading">
      <NSpace v-if="store.currentDocument" vertical :size="24">
        <!-- Actions Card -->
        <NCard>
          <NSpace justify="space-between" align="center">
            <NSpace align="center" :size="8">
              <NText depth="3">{{ t('changeStatus') }}:</NText>
              <NSelect
                v-model:value="currentStatus"
                :options="statusSelectOptions"
                :consistent-menu-width="false"
              />
            </NSpace>

            <NButtonGroup>
              <NButton
                v-if="
                  store.currentDocument.documentType === 'offer' &&
                  store.currentDocument.status !== 'cancelled'
                "
                @click="handleConvert"
              >
                <template #icon>
                  <SwapHorizontalOutline />
                </template>
                {{ t('convertToInvoice') }}
              </NButton>
              <NButton @click="router.push(`/documents/${documentId}/edit`)">
                <template #icon>
                  <CreateOutline />
                </template>
                {{ t('edit') }}
              </NButton>
              <NButton type="primary" @click="handleDownloadPDF">
                <template #icon>
                  <DownloadOutline />
                </template>
                {{ t('downloadPDF') }}
              </NButton>
            </NButtonGroup>
          </NSpace>

          <!-- Conversion Link -->
          <NDivider v-if="store.currentDocument.convertedToInvoiceId || store.currentDocument.convertedFromOfferId" />
          <NSpace v-if="store.currentDocument.convertedToInvoiceId" align="center" :size="8">
            <NText depth="3">{{ t('convertedToInvoice') }}:</NText>
            <NButton text type="primary" @click="navigateToConvertedInvoice">
              {{ t('viewInvoice') }}
            </NButton>
          </NSpace>
          <NSpace v-if="store.currentDocument.convertedFromOfferId" align="center" :size="8">
            <NText depth="3">{{ t('createdFromOffer') }}:</NText>
            <NButton text type="primary" @click="navigateToSourceOffer">
              {{ t('viewOffer') }}
            </NButton>
          </NSpace>
        </NCard>

        <!-- Document Info -->
        <NCard :title="t('information')">
          <NDescriptions label-placement="top" :columns="3">
            <NDescriptionsItem :label="t('documentNumber')">
              {{ store.currentDocument.documentNumber }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('documentTitle')">
              {{ store.currentDocument.documentTitle }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('dueDate')">
              {{ formatDate(store.currentDocument.dueDate) }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('createdLabel')">
              {{ formatDateTime(store.currentDocument.createdAt) }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('paymentTermDays')">
              {{ store.currentDocument.paymentTermDays }} {{ t('days') }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('taxRate')">
              {{ store.currentDocument.taxRate }}%
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <!-- Customer Info -->
        <NCard :title="t('customer')">
          <NDescriptions label-placement="top" :columns="2">
            <NDescriptionsItem :label="t('name')">
              {{ store.currentDocument.customer.name }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('company')">
              {{ store.currentDocument.customer.company || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('address')" :span="2">
              {{ store.currentDocument.customer.street }}<br />
              {{ store.currentDocument.customer.postalCode }}
              {{ store.currentDocument.customer.city }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <!-- Line Items -->
        <NCard :title="t('items')">
          <NDataTable
            :columns="itemColumns"
            :data="store.currentDocument.items"
            :row-key="(row: DocumentItemDto) => row.id"
            :pagination="false"
          />

          <NDivider />

          <NSpace vertical :size="8" align="end">
            <NSpace justify="space-between" :size="48">
              <NText>{{ t('subtotal') }}:</NText>
              <NText>{{ formatCurrency(store.currentDocument.subtotal) }}</NText>
            </NSpace>
            <NSpace justify="space-between" :size="48">
              <NText>{{ t('taxLabel') }} ({{ store.currentDocument.taxRate }}%):</NText>
              <NText>{{ formatCurrency(store.currentDocument.taxAmount) }}</NText>
            </NSpace>
            <NSpace justify="space-between" :size="48">
              <NText strong>{{ t('total') }}:</NText>
              <NText strong>{{ formatCurrency(store.currentDocument.total) }}</NText>
            </NSpace>
          </NSpace>
        </NCard>

        <!-- Notes -->
        <NCard
          v-if="store.currentDocument.introText || store.currentDocument.notesText || store.currentDocument.footerText"
        >
          <NSpace vertical :size="16">
            <NSpace v-if="store.currentDocument.introText" vertical :size="8">
              <NText strong>{{ t('introText') }}</NText>
              <NText>{{ store.currentDocument.introText }}</NText>
            </NSpace>
            <NSpace v-if="store.currentDocument.notesText" vertical :size="8">
              <NText strong>{{ t('notesText') }}</NText>
              <NText>{{ store.currentDocument.notesText }}</NText>
            </NSpace>
            <NSpace v-if="store.currentDocument.footerText" vertical :size="8">
              <NText strong>{{ t('footerText') }}</NText>
              <NText>{{ store.currentDocument.footerText }}</NText>
            </NSpace>
          </NSpace>
        </NCard>

        <!-- Status History -->
        <NCard :title="t('statusHistory')">
          <NTimeline>
            <NTimelineItem
              v-for="(entry, index) in store.currentDocument.statusHistory"
              :key="index"
              :title="
                entry.fromStatus
                  ? `${getStatusLabel(entry.fromStatus)} → ${getStatusLabel(entry.toStatus)}`
                  : t('createdAs', { status: getStatusLabel(entry.toStatus) })
              "
              :time="formatDateTime(entry.timestamp)"
            >
              <template v-if="entry.note">
                {{ entry.note }}
              </template>
            </NTimelineItem>
          </NTimeline>
        </NCard>
      </NSpace>

      <NEmpty v-else-if="!store.loading" :description="t('notFound')" />
    </NSpin>
  </NSpace>
</template>
