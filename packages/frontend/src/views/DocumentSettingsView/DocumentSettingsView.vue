<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NTabs,
  NTabPane,
  NButton,
  NButtonGroup,
  NSpace,
  NSpin,
  NText,
  NSplit,
  NSelect,
  useMessage,
} from 'naive-ui';
import type { UpdateBusinessDto, UpdateSettingsDto, DocumentLabelsDto } from '@crm-local/shared';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/client';
import { usePdfPreview } from '@/composables/usePdfPreview';
import { debounce } from 'lodash-es';
import BusinessInfoTab from '@/components/settings/BusinessInfoTab.vue';
import DocumentSettingsTab from '@/components/settings/DocumentSettingsTab.vue';
import PdfLabelsTab from '@/components/settings/PdfLabelsTab.vue';

const { t } = useI18n();
const message = useMessage();
const store = useSettingsStore();

const loading = ref(false);
const saving = ref(false);

// Form states
const businessForm = ref<UpdateBusinessDto>({
  name: '',
  address: { street: '', city: '', state: '', postalCode: '', country: '' },
  phone: '',
  email: '',
  website: '',
  taxId: '',
  chamberOfCommerce: '',
  bankDetails: { bankName: '', accountHolder: '', iban: '', bic: '' },
});

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

const labelsForm = ref<Partial<DocumentLabelsDto>>({});

// Use PDF preview composable
const {
  previewDocType,
  previewDocTypeOptions,
  previewMode,
  previewDataUrl,
  activeTab,
  handleIframeMessage,
} = usePdfPreview(businessForm, settingsForm, labelsForm);

// Auto-save functions
async function autoSaveBusiness() {
  try {
    saving.value = true;
    await api.updateBusiness(businessForm.value);
    await store.fetchBusiness();
  } catch {
    message.error(t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function autoSaveSettings() {
  try {
    saving.value = true;
    await api.updateSettings(settingsForm.value);
    await store.fetchSettings();
  } catch {
    message.error(t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function autoSaveLabels() {
  try {
    saving.value = true;
    await api.updateSettings({ labels: labelsForm.value as DocumentLabelsDto });
    await store.fetchSettings();
  } catch {
    message.error(t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}

// Debounced auto-save
const debouncedSaveBusiness = debounce(autoSaveBusiness, 1000);
const debouncedSaveSettings = debounce(autoSaveSettings, 1000);
const debouncedSaveLabels = debounce(autoSaveLabels, 1000);

// Watch for changes and auto-save
watch(businessForm, debouncedSaveBusiness, { deep: true });
watch(settingsForm, debouncedSaveSettings, { deep: true });
watch(labelsForm, debouncedSaveLabels, { deep: true });

// Load data
async function loadData() {
  loading.value = true;
  try {
    await Promise.all([store.fetchBusiness(), store.fetchSettings()]);

    if (store.business) {
      businessForm.value = {
        name: store.business.name,
        address: store.business.address ?? { street: '', city: '', state: '', postalCode: '', country: '' },
        phone: store.business.phone,
        email: store.business.email,
        website: store.business.website,
        taxId: store.business.taxId,
        chamberOfCommerce: store.business.chamberOfCommerce,
        bankDetails: store.business.bankDetails ?? { bankName: '', accountHolder: '', iban: '', bic: '' },
      };
    }

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
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadData();
  window.addEventListener('message', handleIframeMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage);
  debouncedSaveBusiness.cancel();
  debouncedSaveSettings.cancel();
  debouncedSaveLabels.cancel();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NText tag="h1" style="margin: 0;">{{ t('settings.title') }}</NText>

    <NSpin :show="loading">
      <NSplit direction="horizontal" :default-size="0.4" :min="0.3" :max="0.6" style="height: calc(100vh - 140px); min-height: 600px;">
        <!-- Left side: Tabs -->
        <template #1>
          <NCard style="height: 100%; overflow-y: auto;">
            <NTabs v-model:value="activeTab" type="line">
              <NTabPane name="business" :tab="t('settings.tab.business')">
                <BusinessInfoTab v-model="businessForm" />
              </NTabPane>

              <NTabPane name="documents" :tab="t('settings.tab.documents')">
                <DocumentSettingsTab v-model="settingsForm" />
              </NTabPane>

              <NTabPane name="labels" :tab="t('settings.tab.labels')">
                <PdfLabelsTab v-model="labelsForm" />
              </NTabPane>
            </NTabs>
          </NCard>
        </template>

        <!-- Right side: PDF Preview (single instance!) -->
        <template #2>
          <div class="preview-container">
            <div class="preview-header">
              <NSpace align="center" :size="8">
                <NText strong>{{ t('settings.preview.title') }}</NText>
                <NText v-if="saving" depth="3" style="font-size: 12px;">{{ t('settings.saving') }}</NText>
              </NSpace>
              <NSpace :size="8">
                <NButtonGroup size="small">
                  <NButton :type="previewMode === 'edit' ? 'primary' : 'default'" @click="previewMode = 'edit'">
                    {{ t('settings.preview.edit') }}
                  </NButton>
                  <NButton :type="previewMode === 'view' ? 'primary' : 'default'" @click="previewMode = 'view'">
                    {{ t('settings.preview.view') }}
                  </NButton>
                </NButtonGroup>
                <NSelect
                  v-model:value="previewDocType"
                  :options="previewDocTypeOptions"
                  size="small"
                  style="width: 120px"
                />
              </NSpace>
            </div>
            <div class="preview-content">
              <iframe
                :src="previewDataUrl"
                style="display: block; width: 100%; min-width: 400px; aspect-ratio: 210 / 297; border: none; border-radius: 4px; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
              />
            </div>
          </div>
        </template>
      </NSplit>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--n-color);
  border-radius: 4px;
  border: 1px solid var(--n-border-color);
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--n-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--n-color);
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--n-color-modal);
}

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
