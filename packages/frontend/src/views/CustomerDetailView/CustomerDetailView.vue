<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NButton,
  NSpace,
  NSpin,
  NText,
  NEmpty,
  useMessage,
} from 'naive-ui';
import { ArrowBackOutline } from '@vicons/ionicons5';
import type { UpdateCustomerDto } from '@crm-local/shared';
import { useCustomerStore } from '@/stores/customers';
import CustomerFormModal from '@/components/CustomerFormModal/CustomerFormModal.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const message = useMessage();
const store = useCustomerStore();

const customerId = computed(() => route.params.id as string);
const showEditModal = ref(false);
const loading = ref(false);

const customer = computed(() => store.getCustomerById(customerId.value));

async function loadData() {
  loading.value = true;
  try {
    if (store.customers.length === 0) {
      await store.fetchCustomers();
    }
  } finally {
    loading.value = false;
  }
}

async function handleUpdate(data: UpdateCustomerDto) {
  try {
    await store.updateCustomer(customerId.value, data);
    message.success(t('customerDetail.updated'));
    showEditModal.value = false;
  } catch {
    message.error(t('customerDetail.updateFailed'));
  }
}

onMounted(loadData);
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace align="center" :size="16">
      <NButton quaternary circle @click="router.push('/customers')">
        <template #icon>
          <ArrowBackOutline />
        </template>
      </NButton>
      <NText tag="h1" strong style="font-size: 24px; margin: 0">
        {{ customer?.name ?? t('customerDetail.title') }}
      </NText>
    </NSpace>

    <NSpin :show="loading">
      <NCard v-if="customer">
        <template #header>
          <NSpace justify="space-between" align="center">
            <NText strong>{{ t('customerDetail.info') }}</NText>
            <NButton type="primary" @click="showEditModal = true">{{ t('edit') }}</NButton>
          </NSpace>
        </template>

        <NDescriptions label-placement="top" :columns="2">
          <NDescriptionsItem :label="t('customerDetail.name')">
            {{ customer.name }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="t('customerDetail.company')">
            {{ customer.company || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="t('customerDetail.email')">
            {{ customer.email }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="t('customerDetail.phone')">
            {{ customer.phone || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="t('customerDetail.address')" :span="2">
            <template v-if="customer.address">
              {{ customer.address.street }}<br />
              {{ customer.address.postalCode }} {{ customer.address.city }}<br />
              {{ customer.address.country }}
            </template>
            <template v-else>-</template>
          </NDescriptionsItem>
          <NDescriptionsItem :label="t('customerDetail.notes')" :span="2">
            {{ customer.notes || '-' }}
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <NEmpty v-else-if="!loading" :description="t('customerDetail.notFound')" />
    </NSpin>

    <CustomerFormModal
      v-if="customer"
      v-model:show="showEditModal"
      :title="t('customerDetail.editCustomer')"
      :customer="customer"
      @submit="handleUpdate"
    />
  </NSpace>
</template>
