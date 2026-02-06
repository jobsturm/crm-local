import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ProductDto, CreateProductDto, UpdateProductDto } from '@crm-local/shared';
import * as api from '@/api/client';

export const useProductStore = defineStore('products', () => {
  const products = ref<ProductDto[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProducts(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      products.value = await api.getProducts();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch products';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createProduct(data: CreateProductDto): Promise<ProductDto> {
    const product = await api.createProduct(data);
    products.value.push(product);
    return product;
  }

  async function updateProduct(id: string, data: UpdateProductDto): Promise<ProductDto> {
    const updated = await api.updateProduct(id, data);
    const index = products.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      products.value[index] = updated;
    }
    return updated;
  }

  async function deleteProduct(id: string): Promise<void> {
    await api.deleteProduct(id);
    products.value = products.value.filter((p) => p.id !== id);
  }

  function getProductById(id: string): ProductDto | undefined {
    return products.value.find((p) => p.id === id);
  }

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
  };
});
