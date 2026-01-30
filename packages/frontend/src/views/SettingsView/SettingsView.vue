<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton, // Still needed for Storage tab
  NSpace,
  NSpin,
  NText,
  NGrid,
  NGridItem,
  NDivider,
  NAlert,
  NSwitch,
  NSplit,
  NSelect,
  useMessage,
  useDialog,
  type SelectOption,
} from 'naive-ui';
import type { UpdateBusinessDto, UpdateSettingsDto, DocumentLabelsDto } from '@crm-local/shared';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/client';
import { generatePreviewHTML, SAMPLE_BUSINESS } from '@/services/pdf-preview';
import { debounce } from 'lodash-es';

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useSettingsStore();

const loading = ref(false);
const saving = ref(false);

// Storage path
const currentStoragePath = ref('');
const newStoragePath = ref('');
const deleteOldData = ref(false);
const changingStoragePath = ref(false);
const hasElectron = ref(false);

async function browseForDirectory() {
  if (!window.electronAPI?.selectDirectory) {
    message.warning(t('settings.storage.noBrowseSupport'));
    return;
  }

  try {
    const result = await window.electronAPI.selectDirectory({
      title: t('settings.storage.selectDirectoryTitle'),
      defaultPath: currentStoragePath.value,
    });

    if (!result.canceled && result.filePath) {
      newStoragePath.value = result.filePath;
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.storage.browseFailed'));
  }
}

// Business form
const businessForm = ref<UpdateBusinessDto>({
  name: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  },
  phone: '',
  email: '',
  website: '',
  taxId: '',
  chamberOfCommerce: '',
  bankDetails: {
    bankName: '',
    accountHolder: '',
    iban: '',
    bic: '',
  },
});

// Settings form
const settingsForm = ref<UpdateSettingsDto>({
  currency: 'EUR',
  currencySymbol: '€',
  defaultTaxRate: 21,
  defaultPaymentTermDays: 14,
  offerPrefix: 'OFF',
  invoicePrefix: 'INV',
  defaultIntroText: '',
  defaultNotesText: '',
  defaultFooterText: '',
});

// Labels form
const labelsForm = ref<Partial<DocumentLabelsDto>>({});

// PDF Preview
const previewDocType = ref<'offer' | 'invoice'>('invoice');
const previewDocTypeOptions = computed<SelectOption[]>(() => [
  { label: t('settings.preview.invoice'), value: 'invoice' },
  { label: t('settings.preview.offer'), value: 'offer' },
]);

// Generate preview HTML - updates whenever any form changes
const previewHTML = computed(() => {
  // Use actual business info if available, otherwise sample
  const business = store.business ?? SAMPLE_BUSINESS;
  
  return generatePreviewHTML({
    labels: labelsForm.value,
    documentType: previewDocType.value,
    business,
    // Pass document settings
    currency: settingsForm.value.currency,
    currencySymbol: settingsForm.value.currencySymbol,
    defaultTaxRate: settingsForm.value.defaultTaxRate,
    defaultPaymentTermDays: settingsForm.value.defaultPaymentTermDays,
    defaultIntroText: settingsForm.value.defaultIntroText,
    defaultNotesText: settingsForm.value.defaultNotesText,
    defaultFooterText: settingsForm.value.defaultFooterText,
    // Enable interactive mode for clickable labels
    interactive: true,
  });
});

// Create a data URL for the iframe
const previewDataUrl = computed(() => {
  return `data:text/html;charset=utf-8,${encodeURIComponent(previewHTML.value)}`;
});

// Highlight style will be added via CSS for focused inputs

// Active tab for switching when clicking fields
const activeTab = ref('business');

// Field IDs enum for type-safe input element references
const FieldId = {
  // Business Info
  BUSINESS_NAME: 'input-business-name',
  BUSINESS_EMAIL: 'input-business-email',
  BUSINESS_PHONE: 'input-business-phone',
  BUSINESS_STREET: 'input-business-address-street',
  BUSINESS_POSTAL_CODE: 'input-business-address-postalCode',
  BUSINESS_CITY: 'input-business-address-city',
  BUSINESS_TAX_ID: 'input-business-taxId',
  BUSINESS_COC: 'input-business-chamberOfCommerce',
  BUSINESS_IBAN: 'input-business-bankDetails-iban',
  // Document Settings
  SETTINGS_CURRENCY_SYMBOL: 'input-settings-currencySymbol',
  SETTINGS_TAX_RATE: 'input-settings-defaultTaxRate',
  SETTINGS_OFFER_PREFIX: 'input-settings-offerPrefix',
  SETTINGS_INVOICE_PREFIX: 'input-settings-invoicePrefix',
  SETTINGS_INTRO_TEXT: 'input-settings-defaultIntroText',
  SETTINGS_NOTES_TEXT: 'input-settings-defaultNotesText',
  SETTINGS_FOOTER_TEXT: 'input-settings-defaultFooterText',
  // Labels - Quote
  LABEL_OFFER_TITLE: 'input-offerTitle',
  LABEL_OFFER_NUMBER: 'input-offerNumberLabel',
  LABEL_CUSTOMER_SECTION_OFFER: 'input-customerSectionTitleOffer',
  LABEL_QUESTIONS_TEXT_OFFER: 'input-questionsTextOffer',
  // Labels - Invoice
  LABEL_INVOICE_TITLE: 'input-invoiceTitle',
  LABEL_INVOICE_NUMBER: 'input-invoiceNumberLabel',
  LABEL_CUSTOMER_SECTION_INVOICE: 'input-customerSectionTitleInvoice',
  LABEL_QUESTIONS_TEXT_INVOICE: 'input-questionsTextInvoice',
  // Labels - Shared
  LABEL_DOCUMENT_DATE: 'input-documentDateLabel',
  LABEL_DUE_DATE: 'input-dueDateLabel',
  LABEL_DESCRIPTION: 'input-descriptionLabel',
  LABEL_QUANTITY: 'input-quantityLabel',
  LABEL_UNIT_PRICE: 'input-unitPriceLabel',
  LABEL_AMOUNT: 'input-amountLabel',
  LABEL_SUBTOTAL: 'input-subtotalLabel',
  LABEL_TAX: 'input-taxLabel',
  LABEL_TOTAL: 'input-totalLabel',
  LABEL_THANK_YOU: 'input-thankYouText',
  // Labels - Company Details
  LABEL_TEL: 'input-telLabel',
  LABEL_EMAIL: 'input-emailLabel',
  LABEL_KVK: 'input-kvkLabel',
  LABEL_VAT_ID: 'input-vatIdLabel',
  LABEL_IBAN: 'input-ibanLabel',
} as const;

// Map of field keys to their form paths, friendly names, input IDs, and which tab they belong to
interface FieldConfig {
  getValue: () => string;
  setValue: (v: string) => void;
  label: string;
  tab: string;
  inputId: string;
  isNumber?: boolean;
}

const fieldInfo: Record<string, FieldConfig> = {
  // Business Info fields (tab: business)
  'business.name': {
    getValue: () => businessForm.value.name ?? '',
    setValue: (v) => (businessForm.value.name = v),
    label: 'Company Name',
    tab: 'business',
    inputId: FieldId.BUSINESS_NAME,
  },
  'business.email': {
    getValue: () => businessForm.value.email ?? '',
    setValue: (v) => (businessForm.value.email = v),
    label: 'Email',
    tab: 'business',
    inputId: FieldId.BUSINESS_EMAIL,
  },
  'business.phone': {
    getValue: () => businessForm.value.phone ?? '',
    setValue: (v) => (businessForm.value.phone = v),
    label: 'Phone',
    tab: 'business',
    inputId: FieldId.BUSINESS_PHONE,
  },
  'business.address.street': {
    getValue: () => businessForm.value.address?.street ?? '',
    setValue: (v) => {
      if (businessForm.value.address) businessForm.value.address.street = v;
    },
    label: 'Street',
    tab: 'business',
    inputId: FieldId.BUSINESS_STREET,
  },
  'business.address.postalCode': {
    getValue: () => businessForm.value.address?.postalCode ?? '',
    setValue: (v) => {
      if (businessForm.value.address) businessForm.value.address.postalCode = v;
    },
    label: 'Postal Code',
    tab: 'business',
    inputId: FieldId.BUSINESS_POSTAL_CODE,
  },
  'business.address.city': {
    getValue: () => businessForm.value.address?.city ?? '',
    setValue: (v) => {
      if (businessForm.value.address) businessForm.value.address.city = v;
    },
    label: 'City',
    tab: 'business',
    inputId: FieldId.BUSINESS_CITY,
  },
  'business.taxId': {
    getValue: () => businessForm.value.taxId ?? '',
    setValue: (v) => (businessForm.value.taxId = v),
    label: 'Tax ID / VAT Number',
    tab: 'business',
    inputId: FieldId.BUSINESS_TAX_ID,
  },
  'business.chamberOfCommerce': {
    getValue: () => businessForm.value.chamberOfCommerce ?? '',
    setValue: (v) => (businessForm.value.chamberOfCommerce = v),
    label: 'Chamber of Commerce',
    tab: 'business',
    inputId: FieldId.BUSINESS_COC,
  },
  'business.bankDetails.iban': {
    getValue: () => businessForm.value.bankDetails?.iban ?? '',
    setValue: (v) => {
      if (businessForm.value.bankDetails) businessForm.value.bankDetails.iban = v;
    },
    label: 'IBAN',
    tab: 'business',
    inputId: FieldId.BUSINESS_IBAN,
  },

  // Document Settings fields (tab: documents)
  'settings.currencySymbol': {
    getValue: () => settingsForm.value.currencySymbol ?? '',
    setValue: (v) => (settingsForm.value.currencySymbol = v),
    label: 'Currency Symbol',
    tab: 'documents',
    inputId: FieldId.SETTINGS_CURRENCY_SYMBOL,
  },
  'settings.defaultTaxRate': {
    getValue: () => String(settingsForm.value.defaultTaxRate ?? 21),
    setValue: (v) => (settingsForm.value.defaultTaxRate = parseFloat(v) || 21),
    label: 'Default Tax Rate (%)',
    tab: 'documents',
    inputId: FieldId.SETTINGS_TAX_RATE,
    isNumber: true,
  },
  'settings.offerPrefix': {
    getValue: () => settingsForm.value.offerPrefix ?? '',
    setValue: (v) => (settingsForm.value.offerPrefix = v),
    label: 'Offer Number Prefix',
    tab: 'documents',
    inputId: FieldId.SETTINGS_OFFER_PREFIX,
  },
  'settings.invoicePrefix': {
    getValue: () => settingsForm.value.invoicePrefix ?? '',
    setValue: (v) => (settingsForm.value.invoicePrefix = v),
    label: 'Invoice Number Prefix',
    tab: 'documents',
    inputId: FieldId.SETTINGS_INVOICE_PREFIX,
  },
  'settings.defaultIntroText': {
    getValue: () => settingsForm.value.defaultIntroText ?? '',
    setValue: (v) => (settingsForm.value.defaultIntroText = v),
    label: 'Default Introduction Text',
    tab: 'documents',
    inputId: FieldId.SETTINGS_INTRO_TEXT,
  },
  'settings.defaultNotesText': {
    getValue: () => settingsForm.value.defaultNotesText ?? '',
    setValue: (v) => (settingsForm.value.defaultNotesText = v),
    label: 'Default Notes',
    tab: 'documents',
    inputId: FieldId.SETTINGS_NOTES_TEXT,
  },
  'settings.defaultFooterText': {
    getValue: () => settingsForm.value.defaultFooterText ?? '',
    setValue: (v) => (settingsForm.value.defaultFooterText = v),
    label: 'Default Footer Text',
    tab: 'documents',
    inputId: FieldId.SETTINGS_FOOTER_TEXT,
  },

  // PDF Labels (tab: labels)
  offerTitle: {
    getValue: () => labelsForm.value.offerTitle ?? '',
    setValue: (v) => (labelsForm.value.offerTitle = v),
    label: 'Offer Title',
    tab: 'labels',
    inputId: FieldId.LABEL_OFFER_TITLE,
  },
  invoiceTitle: {
    getValue: () => labelsForm.value.invoiceTitle ?? '',
    setValue: (v) => (labelsForm.value.invoiceTitle = v),
    label: 'Invoice Title',
    tab: 'labels',
    inputId: FieldId.LABEL_INVOICE_TITLE,
  },
  offerNumberLabel: {
    getValue: () => labelsForm.value.offerNumberLabel ?? '',
    setValue: (v) => (labelsForm.value.offerNumberLabel = v),
    label: 'Offer Number Label',
    tab: 'labels',
    inputId: FieldId.LABEL_OFFER_NUMBER,
  },
  invoiceNumberLabel: {
    getValue: () => labelsForm.value.invoiceNumberLabel ?? '',
    setValue: (v) => (labelsForm.value.invoiceNumberLabel = v),
    label: 'Invoice Number Label',
    tab: 'labels',
    inputId: FieldId.LABEL_INVOICE_NUMBER,
  },
  documentDateLabel: {
    getValue: () => labelsForm.value.documentDateLabel ?? '',
    setValue: (v) => (labelsForm.value.documentDateLabel = v),
    label: 'Document Date Label',
    tab: 'labels',
    inputId: FieldId.LABEL_DOCUMENT_DATE,
  },
  dueDateLabel: {
    getValue: () => labelsForm.value.dueDateLabel ?? '',
    setValue: (v) => (labelsForm.value.dueDateLabel = v),
    label: 'Due Date Label',
    tab: 'labels',
    inputId: FieldId.LABEL_DUE_DATE,
  },
  customerSectionTitleOffer: {
    getValue: () => labelsForm.value.customerSectionTitleOffer ?? '',
    setValue: (v) => (labelsForm.value.customerSectionTitleOffer = v),
    label: 'Customer Section (Offer)',
    tab: 'labels',
    inputId: FieldId.LABEL_CUSTOMER_SECTION_OFFER,
  },
  customerSectionTitleInvoice: {
    getValue: () => labelsForm.value.customerSectionTitleInvoice ?? '',
    setValue: (v) => (labelsForm.value.customerSectionTitleInvoice = v),
    label: 'Customer Section (Invoice)',
    tab: 'labels',
    inputId: FieldId.LABEL_CUSTOMER_SECTION_INVOICE,
  },
  introSectionLabel: {
    getValue: () => labelsForm.value.introSectionLabel ?? '',
    setValue: (v) => (labelsForm.value.introSectionLabel = v),
    label: 'Introduction Section Label',
    tab: 'labels',
    inputId: FieldId.SETTINGS_INTRO_TEXT, // Maps to settings intro (no separate UI field)
  },
  descriptionLabel: {
    getValue: () => labelsForm.value.descriptionLabel ?? '',
    setValue: (v) => (labelsForm.value.descriptionLabel = v),
    label: 'Description',
    tab: 'labels',
    inputId: FieldId.LABEL_DESCRIPTION,
  },
  quantityLabel: {
    getValue: () => labelsForm.value.quantityLabel ?? '',
    setValue: (v) => (labelsForm.value.quantityLabel = v),
    label: 'Quantity',
    tab: 'labels',
    inputId: FieldId.LABEL_QUANTITY,
  },
  unitPriceLabel: {
    getValue: () => labelsForm.value.unitPriceLabel ?? '',
    setValue: (v) => (labelsForm.value.unitPriceLabel = v),
    label: 'Unit Price',
    tab: 'labels',
    inputId: FieldId.LABEL_UNIT_PRICE,
  },
  amountLabel: {
    getValue: () => labelsForm.value.amountLabel ?? '',
    setValue: (v) => (labelsForm.value.amountLabel = v),
    label: 'Amount',
    tab: 'labels',
    inputId: FieldId.LABEL_AMOUNT,
  },
  subtotalLabel: {
    getValue: () => labelsForm.value.subtotalLabel ?? '',
    setValue: (v) => (labelsForm.value.subtotalLabel = v),
    label: 'Subtotal',
    tab: 'labels',
    inputId: FieldId.LABEL_SUBTOTAL,
  },
  taxLabel: {
    getValue: () => labelsForm.value.taxLabel ?? '',
    setValue: (v) => (labelsForm.value.taxLabel = v),
    label: 'Tax Label',
    tab: 'labels',
    inputId: FieldId.LABEL_TAX,
  },
  totalLabel: {
    getValue: () => labelsForm.value.totalLabel ?? '',
    setValue: (v) => (labelsForm.value.totalLabel = v),
    label: 'Total',
    tab: 'labels',
    inputId: FieldId.LABEL_TOTAL,
  },
  notesSectionLabel: {
    getValue: () => labelsForm.value.notesSectionLabel ?? '',
    setValue: (v) => (labelsForm.value.notesSectionLabel = v),
    label: 'Notes Section Label',
    tab: 'labels',
    inputId: FieldId.SETTINGS_NOTES_TEXT, // Maps to settings notes (no separate UI field)
  },
  paymentTermsTitleOffer: {
    getValue: () => labelsForm.value.paymentTermsTitleOffer ?? '',
    setValue: (v) => (labelsForm.value.paymentTermsTitleOffer = v),
    label: 'Payment Terms (Offer)',
    tab: 'labels',
    inputId: FieldId.SETTINGS_FOOTER_TEXT, // Maps to settings footer
  },
  paymentTermsTitleInvoice: {
    getValue: () => labelsForm.value.paymentTermsTitleInvoice ?? '',
    setValue: (v) => (labelsForm.value.paymentTermsTitleInvoice = v),
    label: 'Payment Terms (Invoice)',
    tab: 'labels',
    inputId: FieldId.SETTINGS_FOOTER_TEXT, // Maps to settings footer
  },
  thankYouText: {
    getValue: () => labelsForm.value.thankYouText ?? '',
    setValue: (v) => (labelsForm.value.thankYouText = v),
    label: 'Thank You Text',
    tab: 'labels',
    inputId: FieldId.LABEL_THANK_YOU,
  },
  questionsTextOffer: {
    getValue: () => labelsForm.value.questionsTextOffer ?? '',
    setValue: (v) => (labelsForm.value.questionsTextOffer = v),
    label: 'Questions Text (Offer)',
    tab: 'labels',
    inputId: FieldId.LABEL_QUESTIONS_TEXT_OFFER,
  },
  questionsTextInvoice: {
    getValue: () => labelsForm.value.questionsTextInvoice ?? '',
    setValue: (v) => (labelsForm.value.questionsTextInvoice = v),
    label: 'Questions Text (Invoice)',
    tab: 'labels',
    inputId: FieldId.LABEL_QUESTIONS_TEXT_INVOICE,
  },
  telLabel: {
    getValue: () => labelsForm.value.telLabel ?? '',
    setValue: (v) => (labelsForm.value.telLabel = v),
    label: 'Phone Label',
    tab: 'labels',
    inputId: FieldId.LABEL_TEL,
  },
  emailLabel: {
    getValue: () => labelsForm.value.emailLabel ?? '',
    setValue: (v) => (labelsForm.value.emailLabel = v),
    label: 'Email Label',
    tab: 'labels',
    inputId: FieldId.LABEL_EMAIL,
  },
  kvkLabel: {
    getValue: () => labelsForm.value.kvkLabel ?? '',
    setValue: (v) => (labelsForm.value.kvkLabel = v),
    label: 'Chamber of Commerce Label',
    tab: 'labels',
    inputId: FieldId.LABEL_KVK,
  },
  vatIdLabel: {
    getValue: () => labelsForm.value.vatIdLabel ?? '',
    setValue: (v) => (labelsForm.value.vatIdLabel = v),
    label: 'VAT ID Label',
    tab: 'labels',
    inputId: FieldId.LABEL_VAT_ID,
  },
  ibanLabel: {
    getValue: () => labelsForm.value.ibanLabel ?? '',
    setValue: (v) => (labelsForm.value.ibanLabel = v),
    label: 'IBAN Label',
    tab: 'labels',
    inputId: FieldId.LABEL_IBAN,
  },
};

// Handle postMessage from iframe - focus on the input field instead of modal
function handleIframeMessage(event: MessageEvent) {
  if (event.data?.type === 'editLabel' && event.data.field) {
    const field = event.data.field as string;
    const info = fieldInfo[field];
    if (info) {
      // Switch to the correct tab first
      activeTab.value = info.tab;
      
      // Wait for tab switch to render, then focus the input using the inputId from config
      window.setTimeout(() => {
        const wrapper = document.getElementById(info.inputId);
        if (wrapper) {
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Naive UI wraps inputs - find the actual input/textarea element inside
          const actualInput = wrapper.querySelector('input, textarea') as HTMLElement | null;
          if (actualInput) {
            actualInput.focus();
            // Select all text so user can immediately replace it
            if (actualInput instanceof HTMLInputElement || actualInput instanceof HTMLTextAreaElement) {
              actualInput.select();
            }
          }
          
          // Add a brief highlight effect to the wrapper
          wrapper.classList.add('highlight-input');
          window.setTimeout(() => wrapper.classList.remove('highlight-input'), 2000);
        }
      }, 150); // Slightly longer delay for tab switch animation
    }
  }
}

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([store.fetchBusiness(), store.fetchSettings()]);

    // Populate business form
    if (store.business) {
      businessForm.value = {
        name: store.business.name,
        address: store.business.address ?? {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        phone: store.business.phone,
        email: store.business.email,
        website: store.business.website,
        taxId: store.business.taxId,
        chamberOfCommerce: store.business.chamberOfCommerce,
        bankDetails: store.business.bankDetails ?? {
          bankName: '',
          accountHolder: '',
          iban: '',
          bic: '',
        },
      };
    }

    // Populate settings form
    if (store.settings) {
      settingsForm.value = {
        currency: store.settings.currency,
        currencySymbol: store.settings.currencySymbol,
        defaultTaxRate: store.settings.defaultTaxRate,
        defaultPaymentTermDays: store.settings.defaultPaymentTermDays,
        offerPrefix: store.settings.offerPrefix,
        invoicePrefix: store.settings.invoicePrefix,
        defaultIntroText: store.settings.defaultIntroText,
        defaultNotesText: store.settings.defaultNotesText,
        defaultFooterText: store.settings.defaultFooterText,
      };
      labelsForm.value = { ...store.settings.labels };
      currentStoragePath.value = store.settings.storagePath;
      newStoragePath.value = store.settings.storagePath;
    }
  } finally {
    loading.value = false;
  }
}

async function handleChangeStoragePath() {
  if (!newStoragePath.value || newStoragePath.value === currentStoragePath.value) {
    message.warning(t('settings.storage.samePathWarning'));
    return;
  }

  dialog.warning({
    title: t('settings.storage.confirmTitle'),
    content: deleteOldData.value
      ? t('settings.storage.confirmMoveContent')
      : t('settings.storage.confirmCopyContent'),
    positiveText: t('confirm'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      changingStoragePath.value = true;
      try {
        const result = await api.changeStoragePath(newStoragePath.value, deleteOldData.value);
        if (result.success) {
          currentStoragePath.value = result.storagePath;
          message.success(result.message ?? t('settings.storage.changed'));
        } else {
          message.error(result.message ?? t('settings.storage.changeFailed'));
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : t('settings.storage.changeFailed'));
      } finally {
        changingStoragePath.value = false;
      }
    },
  });
}

// Auto-save functions (silent, just show indicator)
async function autoSaveBusiness() {
  try {
    saving.value = true;
    await store.updateBusiness(businessForm.value);
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function autoSaveSettings() {
  try {
    saving.value = true;
    await store.updateSettings(settingsForm.value);
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function autoSaveLabels() {
  try {
    saving.value = true;
    await store.updateSettings({ labels: labelsForm.value });
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}

// Debounced auto-save (500ms delay)
const debouncedSaveBusiness = debounce(() => void autoSaveBusiness(), 500);
const debouncedSaveSettings = debounce(() => void autoSaveSettings(), 500);
const debouncedSaveLabels = debounce(() => void autoSaveLabels(), 500);

// Flag to prevent auto-save during initial load
const initialized = ref(false);

// Watch for changes and auto-save
watch(businessForm, () => {
  if (initialized.value) debouncedSaveBusiness();
}, { deep: true });

watch(settingsForm, () => {
  if (initialized.value) debouncedSaveSettings();
}, { deep: true });

watch(labelsForm, () => {
  if (initialized.value) debouncedSaveLabels();
}, { deep: true });

onMounted(() => {
  // Check for Electron API (for directory picker)
  hasElectron.value = typeof window !== 'undefined' && !!window.electronAPI?.selectDirectory;
  // Load data, then enable auto-save
  void loadData().then(() => {
    initialized.value = true;
  });
  // Listen for postMessage from PDF preview iframe
  window.addEventListener('message', handleIframeMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage);
});
</script>

<template>
  <NSpace vertical :size="24">
    <NText tag="h1" strong style="font-size: 24px; margin: 0">{{ t('settings.title') }}</NText>

    <NSpin :show="loading">
      <NTabs v-model:value="activeTab" type="line" animated>
        <!-- Business Info Tab with PDF Preview -->
        <NTabPane name="business" :tab="t('settings.tab.business')">
          <NSplit direction="horizontal" :default-size="0.4" :min="0.3" :max="0.6" style="height: calc(100vh - 180px); min-height: 700px;">
            <template #1>
              <NCard style="height: 100%; overflow-y: auto;">
                <NForm ref="businessFormRef" :model="businessForm" label-placement="top">
                  <NFormItem :label="t('settings.companyName')" path="name">
                    <NInput id="input-business-name" v-model:value="businessForm.name" placeholder="Your company name" />
                  </NFormItem>

                  <NFormItem :label="t('settings.email')" path="email">
                    <NInput id="input-business-email" v-model:value="businessForm.email" placeholder="info@company.com" />
                  </NFormItem>

                  <NFormItem :label="t('settings.phone')" path="phone">
                    <NInput id="input-business-phone" v-model:value="businessForm.phone" placeholder="Phone number" />
                  </NFormItem>

                  <NFormItem :label="t('settings.website')" path="website">
                    <NInput id="input-business-website" v-model:value="businessForm.website" placeholder="https://..." />
                  </NFormItem>

                  <NDivider>{{ t('settings.address') }}</NDivider>

                  <NFormItem :label="t('settings.street')" path="address.street">
                    <NInput id="input-business-address-street" v-model:value="businessForm.address!.street" placeholder="Street address" />
                  </NFormItem>

                  <NGrid :cols="2" :x-gap="12">
                    <NGridItem>
                      <NFormItem :label="t('settings.postalCode')" path="address.postalCode">
                        <NInput id="input-business-address-postalCode" v-model:value="businessForm.address!.postalCode" placeholder="Postal code" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="t('settings.city')" path="address.city">
                        <NInput id="input-business-address-city" v-model:value="businessForm.address!.city" placeholder="City" />
                      </NFormItem>
                    </NGridItem>
                  </NGrid>

                  <NFormItem :label="t('settings.country')" path="address.country">
                    <NInput id="input-business-address-country" v-model:value="businessForm.address!.country" placeholder="Country" />
                  </NFormItem>

                  <NDivider>{{ t('settings.taxId') }} &amp; {{ t('settings.chamberOfCommerce') }}</NDivider>

                  <NFormItem :label="t('settings.taxId')" path="taxId">
                    <NInput id="input-business-taxId" v-model:value="businessForm.taxId" placeholder="NL123456789B01" />
                  </NFormItem>

                  <NFormItem :label="t('settings.chamberOfCommerce')" path="chamberOfCommerce">
                    <NInput id="input-business-chamberOfCommerce" v-model:value="businessForm.chamberOfCommerce" placeholder="KvK number" />
                  </NFormItem>

                  <NDivider>{{ t('settings.bankDetails') }}</NDivider>

                  <NFormItem :label="t('settings.bankName')" path="bankDetails.bankName">
                    <NInput id="input-business-bankDetails-bankName" v-model:value="businessForm.bankDetails!.bankName" placeholder="Bank name" />
                  </NFormItem>

                  <NFormItem :label="t('settings.accountHolder')" path="bankDetails.accountHolder">
                    <NInput id="input-business-bankDetails-accountHolder" v-model:value="businessForm.bankDetails!.accountHolder" placeholder="Account holder name" />
                  </NFormItem>

                  <NFormItem :label="t('settings.iban')" path="bankDetails.iban">
                    <NInput id="input-business-bankDetails-iban" v-model:value="businessForm.bankDetails!.iban" placeholder="NL00BANK0123456789" />
                  </NFormItem>

                  <NFormItem :label="t('settings.bic')" path="bankDetails.bic">
                    <NInput id="input-business-bankDetails-bic" v-model:value="businessForm.bankDetails!.bic" placeholder="BANKNL2A" />
                  </NFormItem>

                </NForm>
              </NCard>
            </template>

            <template #2>
              <div style="height: 100%; display: flex; flex-direction: column; background: #f5f5f5; border-radius: 4px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                  <NSpace align="center" :size="8">
                    <NText strong>{{ t('settings.preview.title') }}</NText>
                    <NText v-if="saving" depth="3" style="font-size: 12px;">{{ t('settings.saving') }}</NText>
                  </NSpace>
                  <NSelect
                    v-model:value="previewDocType"
                    :options="previewDocTypeOptions"
                    size="small"
                    style="width: 120px"
                  />
                </div>
                <div style="flex: 1; overflow: auto; padding: 16px; background: #e8e8e8;">
                  <iframe
                    :src="previewDataUrl"
                    style="display: block; width: 100%; height: 1200px; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
                  />
                </div>
              </div>
            </template>
          </NSplit>
        </NTabPane>

        <!-- Document Settings Tab with PDF Preview -->
        <NTabPane name="documents" :tab="t('settings.tab.documents')">
          <NSplit direction="horizontal" :default-size="0.4" :min="0.3" :max="0.6" style="height: calc(100vh - 180px); min-height: 700px;">
            <template #1>
              <NCard style="height: 100%; overflow-y: auto;">
                <NForm ref="settingsFormRef" :model="settingsForm" label-placement="top">
                  <NFormItem :label="t('settings.currency')" path="currency">
                    <NInput id="input-settings-currency" v-model:value="settingsForm.currency" placeholder="EUR" />
                  </NFormItem>

                  <NFormItem :label="t('settings.currencySymbol')" path="currencySymbol">
                    <NInput id="input-settings-currencySymbol" v-model:value="settingsForm.currencySymbol" placeholder="€" />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultTaxRate')" path="defaultTaxRate">
                    <NInputNumber id="input-settings-defaultTaxRate" v-model:value="settingsForm.defaultTaxRate" :min="0" :max="100" style="width: 100%" />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultPaymentTerm')" path="defaultPaymentTermDays">
                    <NInputNumber id="input-settings-defaultPaymentTermDays" v-model:value="settingsForm.defaultPaymentTermDays" :min="0" style="width: 100%" />
                  </NFormItem>

                  <NDivider>{{ t('settings.documentNumbering') }}</NDivider>

                  <NFormItem :label="t('settings.offerPrefix')" path="offerPrefix">
                    <NInput id="input-settings-offerPrefix" v-model:value="settingsForm.offerPrefix" placeholder="OFF" />
                  </NFormItem>

                  <NFormItem :label="t('settings.invoicePrefix')" path="invoicePrefix">
                    <NInput id="input-settings-invoicePrefix" v-model:value="settingsForm.invoicePrefix" placeholder="INV" />
                  </NFormItem>

                  <NDivider>{{ t('settings.defaultTexts') }}</NDivider>

                  <NFormItem :label="t('settings.defaultIntroText')" path="defaultIntroText">
                    <NInput
                      id="input-settings-defaultIntroText"
                      v-model:value="settingsForm.defaultIntroText"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.defaultIntroTextPlaceholder')"
                    />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultNotesText')" path="defaultNotesText">
                    <NInput
                      id="input-settings-defaultNotesText"
                      v-model:value="settingsForm.defaultNotesText"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.defaultNotesTextPlaceholder')"
                    />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultFooterText')" path="defaultFooterText">
                    <NInput
                      id="input-settings-defaultFooterText"
                      v-model:value="settingsForm.defaultFooterText"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.defaultFooterTextPlaceholder')"
                    />
                  </NFormItem>

                </NForm>
              </NCard>
            </template>

            <template #2>
              <div style="height: 100%; display: flex; flex-direction: column; background: #f5f5f5; border-radius: 4px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                  <NSpace align="center" :size="8">
                    <NText strong>{{ t('settings.preview.title') }}</NText>
                    <NText v-if="saving" depth="3" style="font-size: 12px;">{{ t('settings.saving') }}</NText>
                  </NSpace>
                  <NSelect
                    v-model:value="previewDocType"
                    :options="previewDocTypeOptions"
                    size="small"
                    style="width: 120px"
                  />
                </div>
                <div style="flex: 1; overflow: auto; padding: 16px; background: #e8e8e8;">
                  <iframe
                    :src="previewDataUrl"
                    style="display: block; width: 100%; height: 1200px; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
                  />
                </div>
              </div>
            </template>
          </NSplit>
        </NTabPane>

        <!-- Labels Tab with PDF Preview -->
        <NTabPane name="labels" :tab="t('settings.tab.labels')">
          <NSplit direction="horizontal" :default-size="0.4" :min="0.3" :max="0.6" style="height: calc(100vh - 180px); min-height: 700px;">
            <template #1>
              <NCard style="height: 100%; overflow-y: auto;">
                <NText depth="3" style="display: block; margin-bottom: 16px">
                  {{ t('settings.labelsDescription') }}
                </NText>

                <NForm :model="labelsForm" label-placement="top">
                  <!-- QUOTE-ONLY LABELS -->
                  <NDivider title-placement="left">
                    <NText strong type="success">{{ t('settings.labels.quoteOnly') }}</NText>
                  </NDivider>
                  <NFormItem :label="t('settings.offerTitle')" path="offerTitle">
                    <NInput id="input-offerTitle" v-model:value="labelsForm.offerTitle" placeholder="Quote" />
                  </NFormItem>
                  <NFormItem :label="t('settings.offerNumberLabel')" path="offerNumberLabel">
                    <NInput id="input-offerNumberLabel" v-model:value="labelsForm.offerNumberLabel" placeholder="Quote Number" />
                  </NFormItem>
                  <NFormItem :label="t('settings.customerSectionOffer')" path="customerSectionTitleOffer">
                    <NInput id="input-customerSectionTitleOffer" v-model:value="labelsForm.customerSectionTitleOffer" placeholder="Customer Details" />
                  </NFormItem>
                  <NFormItem :label="t('settings.questionsTextOffer')" path="questionsTextOffer">
                    <NInput
                      id="input-questionsTextOffer"
                      v-model:value="labelsForm.questionsTextOffer"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.questionsTextPlaceholder')"
                    />
                  </NFormItem>

                  <!-- INVOICE-ONLY LABELS -->
                  <NDivider title-placement="left">
                    <NText strong type="warning">{{ t('settings.labels.invoiceOnly') }}</NText>
                  </NDivider>
                  <NFormItem :label="t('settings.invoiceTitle')" path="invoiceTitle">
                    <NInput id="input-invoiceTitle" v-model:value="labelsForm.invoiceTitle" placeholder="Invoice" />
                  </NFormItem>
                  <NFormItem :label="t('settings.invoiceNumberLabel')" path="invoiceNumberLabel">
                    <NInput id="input-invoiceNumberLabel" v-model:value="labelsForm.invoiceNumberLabel" placeholder="Invoice Number" />
                  </NFormItem>
                  <NFormItem :label="t('settings.customerSectionInvoice')" path="customerSectionTitleInvoice">
                    <NInput id="input-customerSectionTitleInvoice" v-model:value="labelsForm.customerSectionTitleInvoice" placeholder="Billing Address" />
                  </NFormItem>
                  <NFormItem :label="t('settings.questionsTextInvoice')" path="questionsTextInvoice">
                    <NInput
                      id="input-questionsTextInvoice"
                      v-model:value="labelsForm.questionsTextInvoice"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.questionsTextPlaceholder')"
                    />
                  </NFormItem>

                  <!-- SHARED LABELS -->
                  <NDivider title-placement="left">
                    <NText strong type="info">{{ t('settings.labels.shared') }}</NText>
                  </NDivider>

                  <NText strong>{{ t('settings.dateLabels') }}</NText>
                  <NFormItem :label="t('settings.documentDate')" path="documentDateLabel">
                    <NInput id="input-documentDateLabel" v-model:value="labelsForm.documentDateLabel" placeholder="Date" />
                  </NFormItem>
                  <NFormItem :label="t('settings.dueDate')" path="dueDateLabel">
                    <NInput id="input-dueDateLabel" v-model:value="labelsForm.dueDateLabel" placeholder="Due Date" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>{{ t('settings.tableHeaders') }}</NText>
                  <NFormItem :label="t('settings.description')" path="descriptionLabel">
                    <NInput id="input-descriptionLabel" v-model:value="labelsForm.descriptionLabel" placeholder="Description" />
                  </NFormItem>
                  <NFormItem :label="t('settings.quantity')" path="quantityLabel">
                    <NInput id="input-quantityLabel" v-model:value="labelsForm.quantityLabel" placeholder="Qty" />
                  </NFormItem>
                  <NFormItem :label="t('settings.unitPrice')" path="unitPriceLabel">
                    <NInput id="input-unitPriceLabel" v-model:value="labelsForm.unitPriceLabel" placeholder="Unit Price" />
                  </NFormItem>
                  <NFormItem :label="t('settings.amount')" path="amountLabel">
                    <NInput id="input-amountLabel" v-model:value="labelsForm.amountLabel" placeholder="Amount" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>{{ t('settings.totals') }}</NText>
                  <NFormItem :label="t('settings.subtotal')" path="subtotalLabel">
                    <NInput id="input-subtotalLabel" v-model:value="labelsForm.subtotalLabel" placeholder="Subtotal" />
                  </NFormItem>
                  <NFormItem :label="t('settings.tax')" path="taxLabel">
                    <NInput id="input-taxLabel" v-model:value="labelsForm.taxLabel" placeholder="VAT" />
                  </NFormItem>
                  <NFormItem :label="t('settings.total')" path="totalLabel">
                    <NInput id="input-totalLabel" v-model:value="labelsForm.totalLabel" placeholder="Total" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>Company Details Labels</NText>
                  <NFormItem label="Phone Label" path="telLabel">
                    <NInput id="input-telLabel" v-model:value="labelsForm.telLabel" placeholder="Tel:" />
                  </NFormItem>
                  <NFormItem label="Email Label" path="emailLabel">
                    <NInput id="input-emailLabel" v-model:value="labelsForm.emailLabel" placeholder="E-mail:" />
                  </NFormItem>
                  <NFormItem label="Chamber of Commerce Label" path="kvkLabel">
                    <NInput id="input-kvkLabel" v-model:value="labelsForm.kvkLabel" placeholder="CoC:" />
                  </NFormItem>
                  <NFormItem label="VAT ID Label" path="vatIdLabel">
                    <NInput id="input-vatIdLabel" v-model:value="labelsForm.vatIdLabel" placeholder="VAT:" />
                  </NFormItem>
                  <NFormItem label="IBAN Label" path="ibanLabel">
                    <NInput id="input-ibanLabel" v-model:value="labelsForm.ibanLabel" placeholder="IBAN:" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>{{ t('settings.footer') }}</NText>
                  <NFormItem :label="t('settings.thankYouText')" path="thankYouText">
                    <NInput
                      id="input-thankYouText"
                      v-model:value="labelsForm.thankYouText"
                      type="textarea"
                      :rows="2"
                      placeholder="Thank you for your business with {company}!"
                    />
                  </NFormItem>

                </NForm>
              </NCard>
            </template>

            <template #2>
              <div style="height: 100%; display: flex; flex-direction: column; background: #f5f5f5; border-radius: 4px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                  <NSpace align="center" :size="8">
                    <NText strong>{{ t('settings.preview.title') }}</NText>
                    <NText v-if="saving" depth="3" style="font-size: 12px;">{{ t('settings.saving') }}</NText>
                  </NSpace>
                  <NSelect
                    v-model:value="previewDocType"
                    :options="previewDocTypeOptions"
                    size="small"
                    style="width: 120px"
                  />
                </div>
                <div style="flex: 1; overflow: auto; padding: 16px; background: #e8e8e8;">
                  <iframe
                    :src="previewDataUrl"
                    style="display: block; width: 100%; height: 1200px; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
                  />
                </div>
              </div>
            </template>
          </NSplit>
        </NTabPane>

        <!-- Storage Tab (no preview needed) -->
        <NTabPane name="storage" :tab="t('settings.tab.storage')">
          <NCard>
            <NSpace vertical :size="16">
              <NAlert type="info" :title="t('settings.storage.infoTitle')">
                {{ t('settings.storage.infoDescription') }}
              </NAlert>

              <NFormItem :label="t('settings.storage.currentPath')">
                <NInput :value="currentStoragePath" readonly />
              </NFormItem>

              <NFormItem :label="t('settings.storage.newPath')">
                <NSpace :size="8" :wrap="false">
                  <NInput
                    v-model:value="newStoragePath"
                    :placeholder="t('settings.storage.newPathPlaceholder')"
                    style="flex: 1"
                  />
                  <NButton v-if="hasElectron" @click="browseForDirectory">
                    {{ t('settings.storage.browse') }}
                  </NButton>
                </NSpace>
              </NFormItem>

              <NSpace align="center">
                <NSwitch v-model:value="deleteOldData" />
                <NText>{{ t('settings.storage.deleteOldData') }}</NText>
              </NSpace>

              <NAlert v-if="deleteOldData" type="warning">
                {{ t('settings.storage.deleteWarning') }}
              </NAlert>

              <NSpace justify="end">
                <NButton
                  type="primary"
                  :loading="changingStoragePath"
                  :disabled="!newStoragePath || newStoragePath === currentStoragePath"
                  @click="handleChangeStoragePath"
                >
                  {{ t('settings.storage.changeButton') }}
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>
        </NTabPane>
      </NTabs>
    </NSpin>

  </NSpace>
</template>

<style scoped>
/* Highlight animation for focused inputs when clicking in PDF preview */
:deep(.highlight-input) {
  animation: highlight-pulse 2s ease-out;
}

@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}
</style>
