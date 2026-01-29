<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  NCard,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NSpace,
  NSpin,
  NText,
  NGrid,
  NGridItem,
  NDivider,
  useMessage,
  type FormInst,
} from 'naive-ui';
import type { UpdateBusinessDto, UpdateSettingsDto, DocumentLabelsDto } from '@crm-local/shared';
import { useSettingsStore } from '@/stores/settings';

const message = useMessage();
const store = useSettingsStore();

const businessFormRef = ref<FormInst | null>(null);
const settingsFormRef = ref<FormInst | null>(null);
const loading = ref(false);

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
  defaultFooterText: '',
});

// Labels form
const labelsForm = ref<Partial<DocumentLabelsDto>>({});

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
        defaultFooterText: store.settings.defaultFooterText,
      };
      labelsForm.value = { ...store.settings.labels };
    }
  } finally {
    loading.value = false;
  }
}

async function saveBusiness() {
  try {
    loading.value = true;
    await store.updateBusiness(businessForm.value);
    message.success('Business information saved');
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'Failed to save');
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  try {
    loading.value = true;
    await store.updateSettings(settingsForm.value);
    message.success('Settings saved');
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'Failed to save');
  } finally {
    loading.value = false;
  }
}

async function saveLabels() {
  try {
    loading.value = true;
    await store.updateSettings({ labels: labelsForm.value });
    message.success('Labels saved');
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'Failed to save');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <NSpace vertical :size="24">
    <NText tag="h1" strong style="font-size: 24px; margin: 0">Settings</NText>

    <NSpin :show="loading">
      <NTabs type="line" animated>
        <!-- Business Info Tab -->
        <NTabPane name="business" tab="Business Info">
          <NCard>
            <NForm ref="businessFormRef" :model="businessForm" label-placement="top">
              <NGrid :cols="2" :x-gap="24">
                <NGridItem>
                  <NFormItem label="Company Name" path="name">
                    <NInput v-model:value="businessForm.name" placeholder="Your company name" />
                  </NFormItem>

                  <NFormItem label="Email" path="email">
                    <NInput v-model:value="businessForm.email" placeholder="info@company.com" />
                  </NFormItem>

                  <NFormItem label="Phone" path="phone">
                    <NInput v-model:value="businessForm.phone" placeholder="Phone number" />
                  </NFormItem>

                  <NFormItem label="Website" path="website">
                    <NInput v-model:value="businessForm.website" placeholder="https://..." />
                  </NFormItem>

                  <NDivider>Address</NDivider>

                  <NFormItem label="Street" path="address.street">
                    <NInput
                      v-model:value="businessForm.address!.street"
                      placeholder="Street address"
                    />
                  </NFormItem>

                  <NGrid :cols="2" :x-gap="12">
                    <NGridItem>
                      <NFormItem label="Postal Code" path="address.postalCode">
                        <NInput
                          v-model:value="businessForm.address!.postalCode"
                          placeholder="Postal code"
                        />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem label="City" path="address.city">
                        <NInput v-model:value="businessForm.address!.city" placeholder="City" />
                      </NFormItem>
                    </NGridItem>
                  </NGrid>

                  <NFormItem label="Country" path="address.country">
                    <NInput v-model:value="businessForm.address!.country" placeholder="Country" />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="Tax ID / VAT Number" path="taxId">
                    <NInput v-model:value="businessForm.taxId" placeholder="NL123456789B01" />
                  </NFormItem>

                  <NFormItem label="Chamber of Commerce" path="chamberOfCommerce">
                    <NInput
                      v-model:value="businessForm.chamberOfCommerce"
                      placeholder="KvK number"
                    />
                  </NFormItem>

                  <NDivider>Bank Details</NDivider>

                  <NFormItem label="Bank Name" path="bankDetails.bankName">
                    <NInput
                      v-model:value="businessForm.bankDetails!.bankName"
                      placeholder="Bank name"
                    />
                  </NFormItem>

                  <NFormItem label="Account Holder" path="bankDetails.accountHolder">
                    <NInput
                      v-model:value="businessForm.bankDetails!.accountHolder"
                      placeholder="Account holder name"
                    />
                  </NFormItem>

                  <NFormItem label="IBAN" path="bankDetails.iban">
                    <NInput
                      v-model:value="businessForm.bankDetails!.iban"
                      placeholder="NL00BANK0123456789"
                    />
                  </NFormItem>

                  <NFormItem label="BIC" path="bankDetails.bic">
                    <NInput v-model:value="businessForm.bankDetails!.bic" placeholder="BANKNL2A" />
                  </NFormItem>
                </NGridItem>
              </NGrid>

              <NSpace justify="end">
                <NButton type="primary" :loading="loading" @click="saveBusiness">
                  Save Business Info
                </NButton>
              </NSpace>
            </NForm>
          </NCard>
        </NTabPane>

        <!-- Document Settings Tab -->
        <NTabPane name="documents" tab="Document Settings">
          <NCard>
            <NForm ref="settingsFormRef" :model="settingsForm" label-placement="top">
              <NGrid :cols="2" :x-gap="24">
                <NGridItem>
                  <NFormItem label="Currency" path="currency">
                    <NInput v-model:value="settingsForm.currency" placeholder="EUR" />
                  </NFormItem>

                  <NFormItem label="Currency Symbol" path="currencySymbol">
                    <NInput v-model:value="settingsForm.currencySymbol" placeholder="€" />
                  </NFormItem>

                  <NFormItem label="Default Tax Rate (%)" path="defaultTaxRate">
                    <NInputNumber v-model:value="settingsForm.defaultTaxRate" :min="0" :max="100" />
                  </NFormItem>

                  <NFormItem label="Default Payment Term (days)" path="defaultPaymentTermDays">
                    <NInputNumber v-model:value="settingsForm.defaultPaymentTermDays" :min="0" />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="Offer Number Prefix" path="offerPrefix">
                    <NInput v-model:value="settingsForm.offerPrefix" placeholder="OFF" />
                  </NFormItem>

                  <NFormItem label="Invoice Number Prefix" path="invoicePrefix">
                    <NInput v-model:value="settingsForm.invoicePrefix" placeholder="INV" />
                  </NFormItem>

                  <NFormItem label="Default Introduction Text" path="defaultIntroText">
                    <NInput
                      v-model:value="settingsForm.defaultIntroText"
                      type="textarea"
                      :rows="2"
                      placeholder="Default text for new documents"
                    />
                  </NFormItem>

                  <NFormItem label="Default Footer Text" path="defaultFooterText">
                    <NInput
                      v-model:value="settingsForm.defaultFooterText"
                      type="textarea"
                      :rows="2"
                      placeholder="Default payment terms, etc."
                    />
                  </NFormItem>
                </NGridItem>
              </NGrid>

              <NSpace justify="end">
                <NButton type="primary" :loading="loading" @click="saveSettings">
                  Save Document Settings
                </NButton>
              </NSpace>
            </NForm>
          </NCard>
        </NTabPane>

        <!-- Labels Tab -->
        <NTabPane name="labels" tab="PDF Labels">
          <NCard>
            <NText depth="3" style="display: block; margin-bottom: 16px">
              Customize all text that appears on generated PDF documents.
            </NText>

            <NForm :model="labelsForm" label-placement="top">
              <NGrid :cols="2" :x-gap="24">
                <NGridItem>
                  <NText strong>Document Titles</NText>
                  <NFormItem label="Offer Title" path="offerTitle">
                    <NInput v-model:value="labelsForm.offerTitle" placeholder="Quote" />
                  </NFormItem>
                  <NFormItem label="Invoice Title" path="invoiceTitle">
                    <NInput v-model:value="labelsForm.invoiceTitle" placeholder="Invoice" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>Date Labels</NText>
                  <NFormItem label="Document Date" path="documentDateLabel">
                    <NInput v-model:value="labelsForm.documentDateLabel" placeholder="Date" />
                  </NFormItem>
                  <NFormItem label="Due Date" path="dueDateLabel">
                    <NInput v-model:value="labelsForm.dueDateLabel" placeholder="Due Date" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>Number Labels</NText>
                  <NFormItem label="Offer Number Label" path="offerNumberLabel">
                    <NInput
                      v-model:value="labelsForm.offerNumberLabel"
                      placeholder="Quote Number"
                    />
                  </NFormItem>
                  <NFormItem label="Invoice Number Label" path="invoiceNumberLabel">
                    <NInput
                      v-model:value="labelsForm.invoiceNumberLabel"
                      placeholder="Invoice Number"
                    />
                  </NFormItem>

                  <NDivider />
                  <NText strong>Customer Section</NText>
                  <NFormItem label="Customer Section (Offer)" path="customerSectionTitleOffer">
                    <NInput
                      v-model:value="labelsForm.customerSectionTitleOffer"
                      placeholder="Customer Details"
                    />
                  </NFormItem>
                  <NFormItem label="Customer Section (Invoice)" path="customerSectionTitleInvoice">
                    <NInput
                      v-model:value="labelsForm.customerSectionTitleInvoice"
                      placeholder="Billing Address"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NText strong>Table Headers</NText>
                  <NFormItem label="Description" path="descriptionLabel">
                    <NInput v-model:value="labelsForm.descriptionLabel" placeholder="Description" />
                  </NFormItem>
                  <NFormItem label="Quantity" path="quantityLabel">
                    <NInput v-model:value="labelsForm.quantityLabel" placeholder="Qty" />
                  </NFormItem>
                  <NFormItem label="Unit Price" path="unitPriceLabel">
                    <NInput v-model:value="labelsForm.unitPriceLabel" placeholder="Unit Price" />
                  </NFormItem>
                  <NFormItem label="Amount" path="amountLabel">
                    <NInput v-model:value="labelsForm.amountLabel" placeholder="Amount" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>Totals</NText>
                  <NFormItem label="Subtotal" path="subtotalLabel">
                    <NInput v-model:value="labelsForm.subtotalLabel" placeholder="Subtotal" />
                  </NFormItem>
                  <NFormItem label="Tax" path="taxLabel">
                    <NInput v-model:value="labelsForm.taxLabel" placeholder="VAT" />
                  </NFormItem>
                  <NFormItem label="Total" path="totalLabel">
                    <NInput v-model:value="labelsForm.totalLabel" placeholder="Total" />
                  </NFormItem>

                  <NDivider />
                  <NText strong>Footer</NText>
                  <NFormItem label="Thank You Text" path="thankYouText">
                    <NInput
                      v-model:value="labelsForm.thankYouText"
                      type="textarea"
                      :rows="2"
                      placeholder="Thank you for your business with {company}!"
                    />
                  </NFormItem>
                </NGridItem>
              </NGrid>

              <NSpace justify="end">
                <NButton type="primary" :loading="loading" @click="saveLabels">
                  Save Labels
                </NButton>
              </NSpace>
            </NForm>
          </NCard>
        </NTabPane>
      </NTabs>
    </NSpin>
  </NSpace>
</template>
