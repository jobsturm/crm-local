<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NButton,
  NSpace,
  NSpin,
  NText,
  NDivider,
  NGrid,
  NGridItem,
  useMessage,
  type FormInst,
  type FormRules,
  type SelectOption,
} from 'naive-ui';
import { ArrowBackOutline, AddOutline, TrashOutline } from '@vicons/ionicons5';
import type { CreateDocumentDto, DocumentType } from '@crm-local/shared';
import { useDocumentStore } from '@/stores/documents';
import { useCustomerStore } from '@/stores/customers';
import { useSettingsStore } from '@/stores/settings';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const message = useMessage();

const documentStore = useDocumentStore();
const customerStore = useCustomerStore();
const settingsStore = useSettingsStore();

const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const isEdit = computed(() => !!route.params.id);
const documentId = computed(() => route.params.id as string | undefined);

interface FormItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface FormData {
  documentType: DocumentType;
  customerId: string | null;
  documentTitle: string;
  items: FormItem[];
  paymentTermDays: number;
  taxRate: number;
  introText: string;
  notesText: string;
  footerText: string;
}

const formValue = ref<FormData>({
  documentType: 'offer',
  customerId: null,
  documentTitle: '',
  items: [{ description: '', quantity: 1, unitPrice: 0 }],
  paymentTermDays: 14,
  taxRate: 21,
  introText: '',
  notesText: '',
  footerText: '',
});

const rules = computed<FormRules>(() => ({
  customerId: { required: true, message: t('documentForm.selectCustomer') },
  items: {
    type: 'array',
    required: true,
    min: 1,
    message: t('documentForm.itemRequired'),
  },
}));

const documentTypeOptions = computed<SelectOption[]>(() => [
  { label: t('documentForm.offer'), value: 'offer' },
  { label: t('documentForm.invoice'), value: 'invoice' },
]);

const customerOptions = computed<SelectOption[]>(() =>
  customerStore.customers.map((c) => ({
    label: c.company ? `${c.name} (${c.company})` : c.name,
    value: c.id,
  }))
);

const subtotal = computed(() =>
  formValue.value.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
);

const taxAmount = computed(() => Math.round(subtotal.value * (formValue.value.taxRate / 100)));

const total = computed(() => subtotal.value + taxAmount.value);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function addItem() {
  formValue.value.items.push({ description: '', quantity: 1, unitPrice: 0 });
}

function removeItem(index: number) {
  if (formValue.value.items.length > 1) {
    formValue.value.items.splice(index, 1);
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();

    if (!formValue.value.customerId) {
      message.error(t('documentForm.selectCustomer'));
      return;
    }

    loading.value = true;

    const data: CreateDocumentDto = {
      documentType: formValue.value.documentType,
      customerId: formValue.value.customerId,
      documentTitle: formValue.value.documentTitle || undefined,
      items: formValue.value.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      paymentTermDays: formValue.value.paymentTermDays,
      taxRate: formValue.value.taxRate,
      introText: formValue.value.introText || undefined,
      notesText: formValue.value.notesText || undefined,
      footerText: formValue.value.footerText || undefined,
    };

    if (isEdit.value && documentId.value) {
      await documentStore.updateDocument(documentId.value, data);
      message.success(t('documentForm.updated'));
    } else {
      const doc = await documentStore.createDocument(data);
      message.success(t('documentForm.created', { number: doc.documentNumber }));
      void router.push(`/documents/${doc.id}`);
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('documentForm.saveFailed'));
  } finally {
    loading.value = false;
  }
}

// Watch document type to update default title
watch(
  () => formValue.value.documentType,
  (type) => {
    if (!formValue.value.documentTitle && settingsStore.settings) {
      formValue.value.documentTitle =
        type === 'offer'
          ? settingsStore.settings.labels.offerTitle
          : settingsStore.settings.labels.invoiceTitle;
    }
  }
);

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([customerStore.fetchCustomers(), settingsStore.fetchSettings()]);

    // Set defaults from settings
    if (settingsStore.settings) {
      formValue.value.paymentTermDays = settingsStore.settings.defaultPaymentTermDays;
      formValue.value.taxRate = settingsStore.settings.defaultTaxRate;
      formValue.value.documentTitle = settingsStore.settings.labels.offerTitle;
      formValue.value.introText = settingsStore.settings.defaultIntroText ?? '';
      formValue.value.notesText = settingsStore.settings.defaultNotesText ?? '';
      formValue.value.footerText = settingsStore.settings.defaultFooterText ?? '';
    }

    // If editing, load document
    if (isEdit.value && documentId.value) {
      const doc = await documentStore.fetchDocument(documentId.value);
      formValue.value = {
        documentType: doc.documentType,
        customerId: doc.customerId,
        documentTitle: doc.documentTitle,
        items: doc.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentTermDays: doc.paymentTermDays,
        taxRate: doc.taxRate,
        introText: doc.introText ?? '',
        notesText: doc.notesText ?? '',
        footerText: doc.footerText ?? '',
      };
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
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
        {{ isEdit ? t('documentForm.editTitle') : t('documentForm.title') }}
      </NText>
    </NSpace>

    <NSpin :show="loading">
      <NForm ref="formRef" :model="formValue" :rules="rules" label-placement="top">
        <NGrid :cols="2" :x-gap="24">
          <!-- Left Column -->
          <NGridItem>
            <NCard :title="t('documentForm.documentDetails')">
              <NSpace vertical :size="0">
                <NFormItem :label="t('documentForm.documentType')" path="documentType">
                  <NSelect
                    v-model:value="formValue.documentType"
                    :options="documentTypeOptions"
                    :disabled="isEdit"
                  />
                </NFormItem>

                <NFormItem :label="t('documentForm.documentTitle')" path="documentTitle">
                  <NInput v-model:value="formValue.documentTitle" :placeholder="t('documentForm.documentTitlePlaceholder')" />
                </NFormItem>

                <NFormItem :label="t('documentForm.customer')" path="customerId">
                  <NSelect
                    v-model:value="formValue.customerId"
                    :options="customerOptions"
                    :placeholder="t('documentForm.selectCustomer')"
                    filterable
                  />
                </NFormItem>

                <NGrid :cols="2" :x-gap="12">
                  <NGridItem>
                    <NFormItem :label="t('documentForm.paymentTermDays')" path="paymentTermDays">
                      <NInputNumber v-model:value="formValue.paymentTermDays" :min="0" :max="365" />
                    </NFormItem>
                  </NGridItem>
                  <NGridItem>
                    <NFormItem :label="t('documentForm.taxRate')" path="taxRate">
                      <NInputNumber v-model:value="formValue.taxRate" :min="0" :max="100" />
                    </NFormItem>
                  </NGridItem>
                </NGrid>
              </NSpace>
            </NCard>

            <NCard :title="t('documentForm.notes')" style="margin-top: 24px">
              <NSpace vertical :size="0">
                <NFormItem :label="t('documentForm.introText')" path="introText">
                  <NInput
                    v-model:value="formValue.introText"
                    type="textarea"
                    :rows="2"
                    :placeholder="t('documentForm.introTextPlaceholder')"
                  />
                </NFormItem>

                <NFormItem :label="t('documentForm.notesText')" path="notesText">
                  <NInput
                    v-model:value="formValue.notesText"
                    type="textarea"
                    :rows="2"
                    :placeholder="t('documentForm.notesTextPlaceholder')"
                  />
                </NFormItem>

                <NFormItem :label="t('documentForm.footerText')" path="footerText">
                  <NInput
                    v-model:value="formValue.footerText"
                    type="textarea"
                    :rows="2"
                    :placeholder="t('documentForm.footerTextPlaceholder')"
                  />
                </NFormItem>
              </NSpace>
            </NCard>
          </NGridItem>

          <!-- Right Column -->
          <NGridItem>
            <NCard :title="t('documentForm.items')">
              <NSpace vertical :size="16">
                <NSpace v-for="(item, index) in formValue.items" :key="index" vertical :size="8">
                  <NGrid :cols="12" :x-gap="8">
                    <NGridItem :span="6">
                      <NInput v-model:value="item.description" :placeholder="t('documentForm.description')" />
                    </NGridItem>
                    <NGridItem :span="2">
                      <NInputNumber v-model:value="item.quantity" :min="1" :placeholder="t('documentForm.quantity')" />
                    </NGridItem>
                    <NGridItem :span="3">
                      <NInputNumber
                        v-model:value="item.unitPrice"
                        :min="0"
                        :precision="2"
                        :placeholder="t('documentForm.unitPrice')"
                      >
                        <template #prefix>€</template>
                      </NInputNumber>
                    </NGridItem>
                    <NGridItem :span="1">
                      <NButton
                        quaternary
                        circle
                        type="error"
                        :disabled="formValue.items.length <= 1"
                        @click="removeItem(index)"
                      >
                        <template #icon>
                          <TrashOutline />
                        </template>
                      </NButton>
                    </NGridItem>
                  </NGrid>
                </NSpace>

                <NButton dashed block @click="addItem">
                  <template #icon>
                    <AddOutline />
                  </template>
                  {{ t('documentForm.addItem') }}
                </NButton>

                <NDivider />

                <NSpace vertical :size="8" align="end">
                  <NSpace justify="space-between" style="width: 200px">
                    <NText>{{ t('documentForm.subtotal') }}:</NText>
                    <NText>{{ formatCurrency(subtotal) }}</NText>
                  </NSpace>
                  <NSpace justify="space-between" style="width: 200px">
                    <NText>{{ t('documentForm.vat') }} ({{ formValue.taxRate }}%):</NText>
                    <NText>{{ formatCurrency(taxAmount) }}</NText>
                  </NSpace>
                  <NSpace justify="space-between" style="width: 200px">
                    <NText strong>{{ t('documentForm.total') }}:</NText>
                    <NText strong>{{ formatCurrency(total) }}</NText>
                  </NSpace>
                </NSpace>
              </NSpace>
            </NCard>

            <NSpace justify="end" style="margin-top: 24px">
              <NButton @click="router.push('/documents')">{{ t('cancel') }}</NButton>
              <NButton type="primary" :loading="loading" @click="handleSubmit">
                {{ isEdit ? t('documentForm.update') : t('documentForm.create') }}
              </NButton>
            </NSpace>
          </NGridItem>
        </NGrid>
      </NForm>
    </NSpin>
  </NSpace>
</template>
