<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
import type { CustomerDto, CreateCustomerDto } from '@crm-local/shared';
import { useCustomerStore } from '@/stores/customers';
import CustomerFormModal from '@/components/CustomerFormModal.vue';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const store = useCustomerStore();

const searchQuery = ref('');
const showCreateModal = ref(false);

const columns: DataTableColumns<CustomerDto> = [
  {
    title: 'Name',
    key: 'name',
    sorter: 'default',
  },
  {
    title: 'Company',
    key: 'company',
    sorter: 'default',
  },
  {
    title: 'Email',
    key: 'email',
  },
  {
    title: 'Phone',
    key: 'phone',
  },
  {
    title: 'City',
    key: 'address.city',
    render: (row) => row.address?.city ?? '-',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    render: (row) => {
      return h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => router.push(`/customers/${row.id}`),
          },
          { default: () => 'View' }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => 'Delete' }
        ),
      ]);
    },
  },
];

import { h } from 'vue';

function handleDelete(customer: CustomerDto) {
  dialog.warning({
    title: 'Delete Customer',
    content: `Are you sure you want to delete "${customer.name}"?`,
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        await store.deleteCustomer(customer.id);
        message.success('Customer deleted');
      } catch {
        message.error('Failed to delete customer');
      }
    },
  });
}

async function handleCreate(data: CreateCustomerDto) {
  try {
    await store.createCustomer(data);
    message.success('Customer created');
    showCreateModal.value = false;
  } catch {
    message.error('Failed to create customer');
  }
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

import { computed } from 'vue';

onMounted(() => {
  store.fetchCustomers();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace justify="space-between" align="center">
      <NText tag="h1" strong style="font-size: 24px; margin: 0">Customers</NText>
      <NButton type="primary" @click="showCreateModal = true">
        <template #icon>
          <Add />
        </template>
        Add Customer
      </NButton>
    </NSpace>

    <NCard>
      <NSpace vertical :size="16">
        <NInput v-model:value="searchQuery" placeholder="Search customers..." clearable>
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
          <NEmpty v-else-if="!store.loading" description="No customers found" />
        </NSpin>
      </NSpace>
    </NCard>

    <CustomerFormModal v-model:show="showCreateModal" title="Add Customer" @submit="handleCreate" />
  </NSpace>
</template>
