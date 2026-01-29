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
  STATUS_LABELS,
  STATUS_TAG_TYPES,
} from '@crm-local/shared';
import { useDocumentStore } from '@/stores/documents';
import { useSettingsStore } from '@/stores/settings';
import { generatePDF } from '@/services/pdf-generator';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const store = useDocumentStore();
const settingsStore = useSettingsStore();

const documentId = computed(() => route.params.id as string);

const statusSelectOptions = computed<SelectOption[]>(() => {
  const docType = store.currentDocument?.documentType;
  const statuses = docType === 'offer' ? OFFER_STATUSES : INVOICE_STATUSES;
  return statuses.map((status) => ({
    label: STATUS_LABELS[status],
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

const itemColumns: DataTableColumns<DocumentItemDto> = [
  { title: 'Description', key: 'description' },
  { title: 'Qty', key: 'quantity', width: 80 },
  {
    title: 'Unit Price',
    key: 'unitPrice',
    width: 120,
    render: (row) => formatCurrency(row.unitPrice),
  },
  {
    title: 'Total',
    key: 'total',
    width: 120,
    render: (row) => formatCurrency(row.total),
  },
];

async function handleStatusChange(newStatus: DocumentStatus) {
  const doc = store.currentDocument;
  if (!doc) return;

  dialog.info({
    title: 'Change Status',
    content: `Change status from "${doc.status}" to "${newStatus}"?`,
    positiveText: 'Confirm',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        await store.updateDocument(doc.id, { status: newStatus });
        message.success('Status updated');
      } catch {
        message.error('Failed to update status');
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
      title: 'Offer Already Converted',
      content: `This offer was already converted to an invoice. Do you want to delete the existing invoice and create a new one?`,
      positiveText: 'Delete & Re-convert',
      negativeText: 'Cancel',
      onPositiveClick: async () => {
        try {
          // Delete the existing invoice
          await store.deleteDocument(doc.convertedToInvoiceId!);
          message.info('Deleted existing invoice');

          // Now convert again
          const invoice = await store.convertToInvoice(doc.id);
          message.success(`Created new invoice ${invoice.documentNumber}`);
          void router.push(`/documents/${invoice.id}`);
        } catch {
          message.error('Failed to re-convert offer');
        }
      },
    });
    return;
  }

  dialog.info({
    title: 'Convert to Invoice',
    content: `Convert offer "${doc.documentNumber}" to an invoice?`,
    positiveText: 'Convert',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        const invoice = await store.convertToInvoice(doc.id);
        message.success(`Created invoice ${invoice.documentNumber}`);
        void router.push(`/documents/${invoice.id}`);
      } catch {
        message.error('Failed to convert offer');
      }
    },
  });
}

async function handleDownloadPDF(): Promise<void> {
  const doc = store.currentDocument;
  if (!doc || !settingsStore.business || !settingsStore.settings) {
    message.error('Missing document or business information');
    return;
  }

  try {
    const result = await generatePDF(doc, settingsStore.business, settingsStore.settings);
    if (result.success) {
      if (result.filePath) {
        message.success(`PDF saved to ${result.filePath}`);
      } else {
        message.info('PDF opened for printing');
      }
    } else {
      message.error(result.error ?? 'Failed to generate PDF');
    }
  } catch {
    message.error('Failed to generate PDF');
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
        {{ store.currentDocument?.documentNumber ?? 'Document Details' }}
      </NText>
      <NTag
        v-if="store.currentDocument"
        :type="store.currentDocument.documentType === 'offer' ? 'info' : 'success'"
      >
        {{ store.currentDocument.documentType === 'offer' ? 'Offer' : 'Invoice' }}
      </NTag>
      <NTag v-if="store.currentDocument" :type="STATUS_TAG_TYPES[store.currentDocument.status]">
        {{
          store.currentDocument.status.charAt(0).toUpperCase() +
          store.currentDocument.status.slice(1)
        }}
      </NTag>
    </NSpace>

    <NSpin :show="store.loading">
      <NSpace v-if="store.currentDocument" vertical :size="24">
        <!-- Actions Card -->
        <NCard>
          <NSpace justify="space-between" align="center">
            <NSpace align="center" :size="8">
              <NText depth="3">Change Status:</NText>
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
                Convert to Invoice
              </NButton>
              <NButton @click="router.push(`/documents/${documentId}/edit`)">
                <template #icon>
                  <CreateOutline />
                </template>
                Edit
              </NButton>
              <NButton type="primary" @click="handleDownloadPDF">
                <template #icon>
                  <DownloadOutline />
                </template>
                Download PDF
              </NButton>
            </NButtonGroup>
          </NSpace>

          <!-- Conversion Link -->
          <NDivider v-if="store.currentDocument.convertedToInvoiceId || store.currentDocument.convertedFromOfferId" />
          <NSpace v-if="store.currentDocument.convertedToInvoiceId" align="center" :size="8">
            <NText depth="3">Converted to Invoice:</NText>
            <NButton text type="primary" @click="navigateToConvertedInvoice">
              View Invoice →
            </NButton>
          </NSpace>
          <NSpace v-if="store.currentDocument.convertedFromOfferId" align="center" :size="8">
            <NText depth="3">Created from Offer:</NText>
            <NButton text type="primary" @click="navigateToSourceOffer">
              View Offer →
            </NButton>
          </NSpace>
        </NCard>

        <!-- Document Info -->
        <NCard title="Document Information">
          <NDescriptions label-placement="top" :columns="3">
            <NDescriptionsItem label="Document Number">
              {{ store.currentDocument.documentNumber }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Title">
              {{ store.currentDocument.documentTitle }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Due Date">
              {{ formatDate(store.currentDocument.dueDate) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Created">
              {{ formatDateTime(store.currentDocument.createdAt) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Payment Terms">
              {{ store.currentDocument.paymentTermDays }} days
            </NDescriptionsItem>
            <NDescriptionsItem label="Tax Rate">
              {{ store.currentDocument.taxRate }}%
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <!-- Customer Info -->
        <NCard title="Customer">
          <NDescriptions label-placement="top" :columns="2">
            <NDescriptionsItem label="Name">
              {{ store.currentDocument.customer.name }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Company">
              {{ store.currentDocument.customer.company || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Address" :span="2">
              {{ store.currentDocument.customer.street }}<br />
              {{ store.currentDocument.customer.postalCode }}
              {{ store.currentDocument.customer.city }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <!-- Line Items -->
        <NCard title="Items">
          <NDataTable
            :columns="itemColumns"
            :data="store.currentDocument.items"
            :row-key="(row: DocumentItemDto) => row.id"
            :pagination="false"
          />

          <NDivider />

          <NSpace vertical :size="8" align="end">
            <NSpace justify="space-between" :size="48">
              <NText>Subtotal:</NText>
              <NText>{{ formatCurrency(store.currentDocument.subtotal) }}</NText>
            </NSpace>
            <NSpace justify="space-between" :size="48">
              <NText>VAT ({{ store.currentDocument.taxRate }}%):</NText>
              <NText>{{ formatCurrency(store.currentDocument.taxAmount) }}</NText>
            </NSpace>
            <NSpace justify="space-between" :size="48">
              <NText strong>Total:</NText>
              <NText strong>{{ formatCurrency(store.currentDocument.total) }}</NText>
            </NSpace>
          </NSpace>
        </NCard>

        <!-- Notes -->
        <NCard
          v-if="store.currentDocument.introText || store.currentDocument.notesText"
          title="Notes"
        >
          <NSpace vertical :size="16">
            <NDescriptionsItem v-if="store.currentDocument.introText" label="Introduction">
              <NText>{{ store.currentDocument.introText }}</NText>
            </NDescriptionsItem>
            <NDescriptionsItem v-if="store.currentDocument.notesText" label="Additional Notes">
              <NText>{{ store.currentDocument.notesText }}</NText>
            </NDescriptionsItem>
            <NDescriptionsItem v-if="store.currentDocument.footerText" label="Footer">
              <NText>{{ store.currentDocument.footerText }}</NText>
            </NDescriptionsItem>
          </NSpace>
        </NCard>

        <!-- Status History -->
        <NCard title="Status History">
          <NTimeline>
            <NTimelineItem
              v-for="(entry, index) in store.currentDocument.statusHistory"
              :key="index"
              :title="
                entry.fromStatus
                  ? `${entry.fromStatus} → ${entry.toStatus}`
                  : `Created as ${entry.toStatus}`
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

      <NEmpty v-else-if="!store.loading" description="Document not found" />
    </NSpin>
  </NSpace>
</template>
