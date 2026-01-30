<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useSettingsStore();

const loading = ref(false);
const saving = ref(false);

// Debounce utility
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

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

// Generate preview HTML - updates whenever labels or doc type changes
const previewHTML = computed(() => {
  // Use actual business info if available, otherwise sample
  const business = store.business ?? SAMPLE_BUSINESS;
  return generatePreviewHTML(labelsForm.value, previewDocType.value, business);
});

// Create a data URL for the iframe
const previewDataUrl = computed(() => {
  return `data:text/html;charset=utf-8,${encodeURIComponent(previewHTML.value)}`;
});

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
});
</script>

<template>
  <NSpace vertical :size="24">
    <NText tag="h1" strong style="font-size: 24px; margin: 0">{{ t('settings.title') }}</NText>

    <NSpin :show="loading">
      <NTabs type="line" animated>
        <!-- Business Info Tab with PDF Preview -->
        <NTabPane name="business" :tab="t('settings.tab.business')">
          <NSplit direction="horizontal" :default-size="0.4" :min="0.3" :max="0.6" style="height: calc(100vh - 180px); min-height: 700px;">
            <template #1>
              <NCard style="height: 100%; overflow-y: auto;">
                <NForm ref="businessFormRef" :model="businessForm" label-placement="top">
                  <NFormItem :label="t('settings.companyName')" path="name">
                    <NInput v-model:value="businessForm.name" placeholder="Your company name" />
                  </NFormItem>

                  <NFormItem :label="t('settings.email')" path="email">
                    <NInput v-model:value="businessForm.email" placeholder="info@company.com" />
                  </NFormItem>

                  <NFormItem :label="t('settings.phone')" path="phone">
                    <NInput v-model:value="businessForm.phone" placeholder="Phone number" />
                  </NFormItem>

                  <NFormItem :label="t('settings.website')" path="website">
                    <NInput v-model:value="businessForm.website" placeholder="https://..." />
                  </NFormItem>

                  <NDivider>{{ t('settings.address') }}</NDivider>

                  <NFormItem :label="t('settings.street')" path="address.street">
                    <NInput v-model:value="businessForm.address!.street" placeholder="Street address" />
                  </NFormItem>

                  <NGrid :cols="2" :x-gap="12">
                    <NGridItem>
                      <NFormItem :label="t('settings.postalCode')" path="address.postalCode">
                        <NInput v-model:value="businessForm.address!.postalCode" placeholder="Postal code" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="t('settings.city')" path="address.city">
                        <NInput v-model:value="businessForm.address!.city" placeholder="City" />
                      </NFormItem>
                    </NGridItem>
                  </NGrid>

                  <NFormItem :label="t('settings.country')" path="address.country">
                    <NInput v-model:value="businessForm.address!.country" placeholder="Country" />
                  </NFormItem>

                  <NDivider>{{ t('settings.taxId') }} &amp; {{ t('settings.chamberOfCommerce') }}</NDivider>

                  <NFormItem :label="t('settings.taxId')" path="taxId">
                    <NInput v-model:value="businessForm.taxId" placeholder="NL123456789B01" />
                  </NFormItem>

                  <NFormItem :label="t('settings.chamberOfCommerce')" path="chamberOfCommerce">
                    <NInput v-model:value="businessForm.chamberOfCommerce" placeholder="KvK number" />
                  </NFormItem>

                  <NDivider>{{ t('settings.bankDetails') }}</NDivider>

                  <NFormItem :label="t('settings.bankName')" path="bankDetails.bankName">
                    <NInput v-model:value="businessForm.bankDetails!.bankName" placeholder="Bank name" />
                  </NFormItem>

                  <NFormItem :label="t('settings.accountHolder')" path="bankDetails.accountHolder">
                    <NInput v-model:value="businessForm.bankDetails!.accountHolder" placeholder="Account holder name" />
                  </NFormItem>

                  <NFormItem :label="t('settings.iban')" path="bankDetails.iban">
                    <NInput v-model:value="businessForm.bankDetails!.iban" placeholder="NL00BANK0123456789" />
                  </NFormItem>

                  <NFormItem :label="t('settings.bic')" path="bankDetails.bic">
                    <NInput v-model:value="businessForm.bankDetails!.bic" placeholder="BANKNL2A" />
                  </NFormItem>

                </NForm>
              </NCard>
            </template>

            <template #2>
              <NCard style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <template #header>
                  <NSpace justify="space-between" align="center">
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
                  </NSpace>
                </template>
                <div style="flex: 1; min-height: 0; overflow: auto; padding: 16px; background: #f0f0f0;">
                  <iframe
                    :src="previewDataUrl"
                    style="width: 100%; min-height: 800px; aspect-ratio: 210 / 297; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
                  />
                </div>
              </NCard>
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
                    <NInput v-model:value="settingsForm.currency" placeholder="EUR" />
                  </NFormItem>

                  <NFormItem :label="t('settings.currencySymbol')" path="currencySymbol">
                    <NInput v-model:value="settingsForm.currencySymbol" placeholder="€" />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultTaxRate')" path="defaultTaxRate">
                    <NInputNumber v-model:value="settingsForm.defaultTaxRate" :min="0" :max="100" style="width: 100%" />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultPaymentTerm')" path="defaultPaymentTermDays">
                    <NInputNumber v-model:value="settingsForm.defaultPaymentTermDays" :min="0" style="width: 100%" />
                  </NFormItem>

                  <NDivider>{{ t('settings.documentNumbering') }}</NDivider>

                  <NFormItem :label="t('settings.offerPrefix')" path="offerPrefix">
                    <NInput v-model:value="settingsForm.offerPrefix" placeholder="OFF" />
                  </NFormItem>

                  <NFormItem :label="t('settings.invoicePrefix')" path="invoicePrefix">
                    <NInput v-model:value="settingsForm.invoicePrefix" placeholder="INV" />
                  </NFormItem>

                  <NDivider>{{ t('settings.defaultTexts') }}</NDivider>

                  <NFormItem :label="t('settings.defaultIntroText')" path="defaultIntroText">
                    <NInput
                      v-model:value="settingsForm.defaultIntroText"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.defaultIntroTextPlaceholder')"
                    />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultNotesText')" path="defaultNotesText">
                    <NInput
                      v-model:value="settingsForm.defaultNotesText"
                      type="textarea"
                      :rows="2"
                      :placeholder="t('settings.defaultNotesTextPlaceholder')"
                    />
                  </NFormItem>

                  <NFormItem :label="t('settings.defaultFooterText')" path="defaultFooterText">
                    <NInput
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
              <NCard style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <template #header>
                  <NSpace justify="space-between" align="center">
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
                  </NSpace>
                </template>
                <div style="flex: 1; min-height: 0; overflow: auto; padding: 16px; background: #f0f0f0;">
                  <iframe
                    :src="previewDataUrl"
                    style="width: 100%; min-height: 800px; aspect-ratio: 210 / 297; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
                  />
                </div>
              </NCard>
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
                    <NInput v-model:value="labelsForm.offerTitle" placeholder="Quote" />
                  </NFormItem>
                  <NFormItem :label="t('settings.offerNumberLabel')" path="offerNumberLabel">
                    <NInput v-model:value="labelsForm.offerNumberLabel" placeholder="Quote Number" />
                  </NFormItem>
                  <NFormItem :label="t('settings.customerSectionOffer')" path="customerSectionTitleOffer">
                    <NInput v-model:value="labelsForm.customerSectionTitleOffer" placeholder="Customer Details" />
                  </NFormItem>

                  <!-- INVOICE-ONLY LABELS -->
                  <NDivider title-placement="left">
                    <NText strong type="warning">{{ t('settings.labels.invoiceOnly') }}</NText>
                  </NDivider>
                  <NFormItem :label="t('settings.invoiceTitle')" path="invoiceTitle">
                    <NInput v-model:value="labelsForm.invoiceTitle" placeholder="Invoice" />
                  </NFormItem>
                  <NFormItem :label="t('settings.invoiceNumberLabel')" path="invoiceNumberLabel">
                    <NInput v-model:value="labelsForm.invoiceNumberLabel" placeholder="Invoice Number" />
                  </NFormItem>
                  <NFormItem :label="t('settings.customerSectionInvoice')" path="customerSectionTitleInvoice">
                    <NInput v-model:value="labelsForm.customerSectionTitleInvoice" placeholder="Billing Address" />
                  </NFormItem>

                  <!-- SHARED LABELS -->
                  <NDivider title-placement="left">
                    <NText strong type="info">{{ t('settings.labels.shared') }}</NText>
                  </NDivider>

                  <NText strong>{{ t('settings.dateLabels') }}</NText>
                  <NFormItem :label="t('settings.documentDate')" path="documentDateLabel">
                    <NInput v-model:value="labelsForm.documentDateLabel" placeholder="Date" />
                  </NFormItem>
                  <NFormItem :label="t('settings.dueDate')" path="dueDateLabel">
                    <NInput v-model:value="labelsForm.dueDateLabel" placeholder="Due Date" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>{{ t('settings.tableHeaders') }}</NText>
                  <NFormItem :label="t('settings.description')" path="descriptionLabel">
                    <NInput v-model:value="labelsForm.descriptionLabel" placeholder="Description" />
                  </NFormItem>
                  <NFormItem :label="t('settings.quantity')" path="quantityLabel">
                    <NInput v-model:value="labelsForm.quantityLabel" placeholder="Qty" />
                  </NFormItem>
                  <NFormItem :label="t('settings.unitPrice')" path="unitPriceLabel">
                    <NInput v-model:value="labelsForm.unitPriceLabel" placeholder="Unit Price" />
                  </NFormItem>
                  <NFormItem :label="t('settings.amount')" path="amountLabel">
                    <NInput v-model:value="labelsForm.amountLabel" placeholder="Amount" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>{{ t('settings.totals') }}</NText>
                  <NFormItem :label="t('settings.subtotal')" path="subtotalLabel">
                    <NInput v-model:value="labelsForm.subtotalLabel" placeholder="Subtotal" />
                  </NFormItem>
                  <NFormItem :label="t('settings.tax')" path="taxLabel">
                    <NInput v-model:value="labelsForm.taxLabel" placeholder="VAT" />
                  </NFormItem>
                  <NFormItem :label="t('settings.total')" path="totalLabel">
                    <NInput v-model:value="labelsForm.totalLabel" placeholder="Total" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>{{ t('settings.footer') }}</NText>
                  <NFormItem :label="t('settings.thankYouText')" path="thankYouText">
                    <NInput
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
              <NCard style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <template #header>
                  <NSpace justify="space-between" align="center">
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
                  </NSpace>
                </template>
                <div style="flex: 1; min-height: 0; overflow: auto; padding: 16px; background: #f0f0f0;">
                  <iframe
                    :src="previewDataUrl"
                    style="width: 100%; min-height: 800px; aspect-ratio: 210 / 297; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
                  />
                </div>
              </NCard>
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
