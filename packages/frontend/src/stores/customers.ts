import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CustomerDto, CreateCustomerDto, UpdateCustomerDto } from '@crm-local/shared';
import * as api from '@/api/client';

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<CustomerDto[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCustomers(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      customers.value = await api.getCustomers();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch customers';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createCustomer(data: CreateCustomerDto): Promise<CustomerDto> {
    const customer = await api.createCustomer(data);
    customers.value.push(customer);
    return customer;
  }

  async function updateCustomer(id: string, data: UpdateCustomerDto): Promise<CustomerDto> {
    const updated = await api.updateCustomer(id, data);
    const index = customers.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      customers.value[index] = updated;
    }
    return updated;
  }

  async function deleteCustomer(id: string): Promise<void> {
    await api.deleteCustomer(id);
    customers.value = customers.value.filter((c) => c.id !== id);
  }

  function getCustomerById(id: string): CustomerDto | undefined {
    return customers.value.find((c) => c.id === id);
  }

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
  };
});
