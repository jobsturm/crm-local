<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  type FormInst,
  type FormRules,
} from 'naive-ui';
import type { CreateCustomerDto, CustomerDto } from '@crm-local/shared';

const { t } = useI18n();

const props = defineProps<{
  show: boolean;
  title: string;
  customer?: CustomerDto;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  submit: [data: CreateCustomerDto];
}>();

const formRef = ref<FormInst | null>(null);

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
});

const rules = computed<FormRules>(() => ({
  name: { required: true, message: t('customerForm.required') },
  email: [
    { required: true, message: t('customerForm.required') },
    { type: 'email', message: t('customerForm.invalidEmail') },
  ],
}));

watch(
  () => props.show,
  (show) => {
    if (show && props.customer) {
      formValue.value = {
        name: props.customer.name,
        email: props.customer.email,
        phone: props.customer.phone,
        company: props.customer.company,
        address: props.customer.address ?? {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
      };
    } else if (show) {
      formValue.value = {
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
      };
    }
  }
);

function handleClose() {
  emit('update:show', false);
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    emit('submit', formValue.value);
  } catch {
    // Validation failed
  }
}
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)">
    <NCard :title="title" :bordered="false" size="huge" closable @close="handleClose">
      <NForm ref="formRef" :model="formValue" :rules="rules" label-placement="top">
        <NFormItem :label="t('customerForm.name')" path="name">
          <NInput v-model:value="formValue.name" :placeholder="t('customerForm.namePlaceholder')" />
        </NFormItem>

        <NFormItem :label="t('customerForm.email')" path="email">
          <NInput v-model:value="formValue.email" :placeholder="t('customerForm.emailPlaceholder')" />
        </NFormItem>

        <NFormItem :label="t('customerForm.phone')" path="phone">
          <NInput v-model:value="formValue.phone" :placeholder="t('customerForm.phonePlaceholder')" />
        </NFormItem>

        <NFormItem :label="t('customerForm.company')" path="company">
          <NInput v-model:value="formValue.company" :placeholder="t('customerForm.companyPlaceholder')" />
        </NFormItem>

        <NFormItem :label="t('customerForm.street')" path="address.street">
          <NInput v-model:value="formValue.address!.street" :placeholder="t('customerForm.streetPlaceholder')" />
        </NFormItem>

        <NSpace :size="12">
          <NFormItem :label="t('customerForm.postalCode')" path="address.postalCode">
            <NInput v-model:value="formValue.address!.postalCode" :placeholder="t('customerForm.postalCodePlaceholder')" />
          </NFormItem>

          <NFormItem :label="t('customerForm.city')" path="address.city">
            <NInput v-model:value="formValue.address!.city" :placeholder="t('customerForm.cityPlaceholder')" />
          </NFormItem>
        </NSpace>

        <NFormItem :label="t('customerForm.country')" path="address.country">
          <NInput v-model:value="formValue.address!.country" :placeholder="t('customerForm.countryPlaceholder')" />
        </NFormItem>

        <NSpace justify="end" :size="12">
          <NButton @click="handleClose">{{ t('cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ t('save') }}</NButton>
        </NSpace>
      </NForm>
    </NCard>
  </NModal>
</template>
