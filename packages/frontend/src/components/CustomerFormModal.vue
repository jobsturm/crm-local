<script setup lang="ts">
import { ref, watch } from 'vue';
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

const rules: FormRules = {
  name: { required: true, message: 'Name is required' },
  email: [
    { required: true, message: 'Email is required' },
    { type: 'email', message: 'Invalid email' },
  ],
};

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
        <NFormItem label="Name" path="name">
          <NInput v-model:value="formValue.name" placeholder="Customer name" />
        </NFormItem>

        <NFormItem label="Email" path="email">
          <NInput v-model:value="formValue.email" placeholder="email@example.com" />
        </NFormItem>

        <NFormItem label="Phone" path="phone">
          <NInput v-model:value="formValue.phone" placeholder="Phone number" />
        </NFormItem>

        <NFormItem label="Company" path="company">
          <NInput v-model:value="formValue.company" placeholder="Company name" />
        </NFormItem>

        <NFormItem label="Street" path="address.street">
          <NInput v-model:value="formValue.address!.street" placeholder="Street address" />
        </NFormItem>

        <NSpace :size="12">
          <NFormItem label="Postal Code" path="address.postalCode">
            <NInput v-model:value="formValue.address!.postalCode" placeholder="Postal code" />
          </NFormItem>

          <NFormItem label="City" path="address.city">
            <NInput v-model:value="formValue.address!.city" placeholder="City" />
          </NFormItem>
        </NSpace>

        <NFormItem label="Country" path="address.country">
          <NInput v-model:value="formValue.address!.country" placeholder="Country" />
        </NFormItem>

        <NSpace justify="end" :size="12">
          <NButton @click="handleClose">Cancel</NButton>
          <NButton type="primary" @click="handleSubmit">Save</NButton>
        </NSpace>
      </NForm>
    </NCard>
  </NModal>
</template>
