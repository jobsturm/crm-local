<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NDataTable,
  NButton,
  NSpace,
  NInput,
  NEmpty,
  NSpin,
  NText,
  useMessage,
  useDialog,
  type DataTableColumns,
} from 'naive-ui';
import { Add, SearchOutline } from '@vicons/ionicons5';
import type { CustomerDto } from '@crm-local/shared';
import { useCustomerStore } from '@/stores/customers';

const router = useRouter();
const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useCustomerStore();

const searchQuery = ref('');

const columns = computed<DataTableColumns<CustomerDto>>(() => [
  {
    title: t('customerList.col.name'),
    key: 'name',
    sorter: 'default',
  },
  {
    title: t('customerList.col.company'),
    key: 'company',
    sorter: 'default',
  },
  {
    title: t('customerList.col.email'),
    key: 'email',
  },
  {
    title: t('customerList.col.phone'),
    key: 'phone',
  },
  {
    title: t('customerList.col.city'),
    key: 'address.city',
    render: (row) => row.address?.city ?? '-',
  },
  {
    title: t('customerList.col.actions'),
    key: 'actions',
    width: 150,
    render: (row) => {
      return h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => void router.push(`/customers/${row.id}`),
          },
          { default: () => t('view') }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => t('delete') }
        ),
      ]);
    },
  },
]);

function handleDelete(customer: CustomerDto) {
  dialog.warning({
    title: t('customerList.deleteTitle'),
    content: t('customerList.deleteConfirm', { name: customer.name }),
    positiveText: t('delete'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      try {
        await store.deleteCustomer(customer.id);
        message.success(t('customerList.deleted'));
      } catch {
        message.error(t('customerList.deleteFailed'));
      }
    },
  });
}

function handleAddCustomer() {
  void router.push('/customers/new');
}

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return store.customers;
  const query = searchQuery.value.toLowerCase();
  return store.customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.company?.toLowerCase().includes(query)
  );
});

onMounted(() => {
  void store.fetchCustomers();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace justify="space-between" align="center">
      <NText tag="h1" strong style="font-size: 24px; margin: 0">{{ t('customerList.title') }}</NText>
      <NButton type="primary" @click="handleAddCustomer">
        <template #icon>
          <Add />
        </template>
        {{ t('customerList.addCustomer') }}
      </NButton>
    </NSpace>

    <NCard>
      <NSpace vertical :size="16">
        <NInput v-model:value="searchQuery" :placeholder="t('customerList.searchPlaceholder')" clearable>
          <template #prefix>
            <SearchOutline />
          </template>
        </NInput>

        <NSpin :show="store.loading">
          <NDataTable
            v-if="filteredCustomers.length > 0"
            :columns="columns"
            :data="filteredCustomers"
            :row-key="(row: CustomerDto) => row.id"
            :pagination="{ pageSize: 20 }"
          />
          <NEmpty v-else-if="!store.loading" :description="t('customerList.noCustomers')" />
        </NSpin>
      </NSpace>
    </NCard>
  </NSpace>
</template>
