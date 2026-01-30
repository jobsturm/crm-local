<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NText,
  NGrid,
  NGridItem,
  NDivider,
  NSpin,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui';
import { ArrowBackOutline } from '@vicons/ionicons5';
import type { CreateCustomerDto, CustomerDto } from '@crm-local/shared';
import { useCustomerStore } from '@/stores/customers';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const message = useMessage();
const store = useCustomerStore();

const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const submitting = ref(false);

// Determine if editing
const customerId = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!customerId.value && customerId.value !== 'new');
const existingCustomer = ref<CustomerDto | null>(null);

const formValue = ref<CreateCustomerDto>({
  name: '',
  email: '',
  phone: '',
  company: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  },
  notes: '',
});

const rules = computed<FormRules>(() => ({
  name: { required: true, message: t('customerForm.required') },
  email: [
    { required: true, message: t('customerForm.required') },
    { type: 'email', message: t('customerForm.invalidEmail') },
  ],
}));

async function loadCustomer() {
  if (!isEdit.value || !customerId.value) return;

  loading.value = true;
  try {
    await store.fetchCustomers();
    const customer = store.customers.find((c) => c.id === customerId.value);
    if (customer) {
      existingCustomer.value = customer;
      formValue.value = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? '',
        company: customer.company ?? '',
        address: customer.address ?? {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        notes: customer.notes ?? '',
      };
    }
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return; // Validation failed
  }

  submitting.value = true;
  try {
    if (isEdit.value && customerId.value) {
      await store.updateCustomer(customerId.value, formValue.value);
      message.success(t('customerForm.updated'));
    } else {
      await store.createCustomer(formValue.value);
      message.success(t('customerForm.created'));
    }
    // Navigate back to customer list
    void router.push('/customers');
  } catch {
    message.error(isEdit.value ? t('customerForm.updateFailed') : t('customerForm.createFailed'));
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  void router.push('/customers');
}

onMounted(() => {
  void loadCustomer();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace align="center" :size="16">
      <NButton quaternary circle @click="handleCancel">
        <template #icon>
          <ArrowBackOutline />
        </template>
      </NButton>
      <NText tag="h1" strong style="font-size: 24px; margin: 0">
        {{ isEdit ? t('customerForm.editTitle') : t('customerForm.title') }}
      </NText>
    </NSpace>

    <NSpin :show="loading">
      <NCard>
        <NForm ref="formRef" :model="formValue" :rules="rules" label-placement="top">
          <NGrid :cols="2" :x-gap="24">
            <NGridItem>
              <NFormItem :label="t('customerForm.name')" path="name">
                <NInput v-model:value="formValue.name" :placeholder="t('customerForm.namePlaceholder')" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem :label="t('customerForm.company')" path="company">
                <NInput v-model:value="formValue.company" :placeholder="t('customerForm.companyPlaceholder')" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NGrid :cols="2" :x-gap="24">
            <NGridItem>
              <NFormItem :label="t('customerForm.email')" path="email">
                <NInput v-model:value="formValue.email" :placeholder="t('customerForm.emailPlaceholder')" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem :label="t('customerForm.phone')" path="phone">
                <NInput v-model:value="formValue.phone" :placeholder="t('customerForm.phonePlaceholder')" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NDivider>{{ t('customerForm.address') }}</NDivider>

          <NFormItem :label="t('customerForm.street')" path="address.street">
            <NInput v-model:value="formValue.address!.street" :placeholder="t('customerForm.streetPlaceholder')" />
          </NFormItem>

          <NGrid :cols="3" :x-gap="24">
            <NGridItem>
              <NFormItem :label="t('customerForm.postalCode')" path="address.postalCode">
                <NInput
                  v-model:value="formValue.address!.postalCode"
                  :placeholder="t('customerForm.postalCodePlaceholder')"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem :label="t('customerForm.city')" path="address.city">
                <NInput v-model:value="formValue.address!.city" :placeholder="t('customerForm.cityPlaceholder')" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem :label="t('customerForm.country')" path="address.country">
                <NInput
                  v-model:value="formValue.address!.country"
                  :placeholder="t('customerForm.countryPlaceholder')"
                />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NDivider>{{ t('customerForm.notes') }}</NDivider>

          <NFormItem path="notes">
            <NInput
              v-model:value="formValue.notes"
              type="textarea"
              :rows="3"
              :placeholder="t('customerForm.notesPlaceholder')"
            />
          </NFormItem>

          <NSpace justify="end" :size="12">
            <NButton @click="handleCancel">{{ t('customerForm.cancel') }}</NButton>
            <NButton type="primary" :loading="submitting" @click="handleSubmit">
              {{ t('customerForm.save') }}
            </NButton>
          </NSpace>
        </NForm>
      </NCard>
    </NSpin>
  </NSpace>
</template>
