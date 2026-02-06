<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NDataTable,
  NButton,
  NSpace,
  NInput,
  NInputNumber,
  NEmpty,
  NSpin,
  NText,
  NModal,
  NForm,
  NFormItem,
  useMessage,
  useDialog,
  type DataTableColumns,
  type FormInst,
  type FormRules,
} from 'naive-ui';
import { Add, SearchOutline } from '@vicons/ionicons5';
import type { ProductDto, CreateProductDto } from '@crm-local/shared';
import { useProductStore } from '@/stores/products';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useProductStore();
const settingsStore = useSettingsStore();

const searchQuery = ref('');
const showModal = ref(false);
const formRef = ref<FormInst | null>(null);
const editingProduct = ref<ProductDto | null>(null);
const formValue = ref<CreateProductDto>({
  description: '',
  defaultPrice: 0,
});

const currencySymbol = computed(() => settingsStore.settings?.currencySymbol ?? '€');

const rules: FormRules = {
  description: { required: true, message: 'Description is required' },
  defaultPrice: { required: true, type: 'number', message: 'Price is required' },
};

const columns = computed<DataTableColumns<ProductDto>>(() => [
  {
    title: t('products.col.description'),
    key: 'description',
    sorter: 'default',
  },
  {
    title: t('products.col.defaultPrice'),
    key: 'defaultPrice',
    width: 150,
    sorter: 'default',
    render: (row) => `${currencySymbol.value}${row.defaultPrice.toFixed(2)}`,
  },
  {
    title: t('products.col.actions'),
    key: 'actions',
    width: 150,
    render: (row) => {
      return h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleEdit(row),
          },
          { default: () => t('edit') }
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

function handleDelete(product: ProductDto) {
  dialog.warning({
    title: t('products.deleteTitle'),
    content: t('products.deleteConfirm', { name: product.description }),
    positiveText: t('delete'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      try {
        await store.deleteProduct(product.id);
        message.success(t('products.deleted'));
      } catch {
        message.error(t('products.deleteFailed'));
      }
    },
  });
}

function handleEdit(product: ProductDto) {
  editingProduct.value = product;
  formValue.value = {
    description: product.description,
    defaultPrice: product.defaultPrice,
  };
  showModal.value = true;
}

function handleAddProduct() {
  editingProduct.value = null;
  formValue.value = {
    description: '',
    defaultPrice: 0,
  };
  showModal.value = true;
}

async function handleSave() {
  try {
    await formRef.value?.validate();
    
    if (editingProduct.value) {
      await store.updateProduct(editingProduct.value.id, formValue.value);
    } else {
      await store.createProduct(formValue.value);
    }
    
    message.success(t('products.saved'));
    showModal.value = false;
  } catch {
    message.error(t('products.saveFailed'));
  }
}

const filteredProducts = computed(() => {
  if (!searchQuery.value) return store.products;
  const query = searchQuery.value.toLowerCase();
  return store.products.filter((p) => p.description.toLowerCase().includes(query));
});

onMounted(() => {
  void store.fetchProducts();
  void settingsStore.fetchSettings();
});
</script>

<template>
  <NSpace vertical :size="24">
    <NSpace vertical :size="4">
      <NText tag="h1" strong style="font-size: 24px; margin: 0">{{ t('products.title') }}</NText>
      <NText depth="3">{{ t('products.subtitle') }}</NText>
    </NSpace>

    <NCard>
      <NSpace vertical :size="16">
        <NSpace justify="space-between" align="center">
          <NInput v-model:value="searchQuery" :placeholder="t('products.searchPlaceholder')" clearable style="width: 300px">
            <template #prefix>
              <SearchOutline />
            </template>
          </NInput>
          <NButton type="primary" @click="handleAddProduct">
            <template #icon>
              <Add />
            </template>
            {{ t('products.addProduct') }}
          </NButton>
        </NSpace>

        <NSpin :show="store.loading">
          <NDataTable
            v-if="filteredProducts.length > 0"
            :columns="columns"
            :data="filteredProducts"
            :row-key="(row: ProductDto) => row.id"
            :pagination="{ pageSize: 20 }"
          />
          <NEmpty v-else-if="!store.loading" :description="t('products.noProducts')" />
        </NSpin>
      </NSpace>
    </NCard>

    <NModal
      v-model:show="showModal"
      preset="dialog"
      :title="editingProduct ? t('products.form.title.edit') : t('products.form.title.add')"
      :positive-text="t('products.form.save')"
      :negative-text="t('products.form.cancel')"
      @positive-click="handleSave"
    >
      <NForm ref="formRef" :model="formValue" :rules="rules">
        <NFormItem :label="t('products.form.description')" path="description">
          <NInput 
            v-model:value="formValue.description" 
            :placeholder="t('products.form.descriptionPlaceholder')" 
          />
        </NFormItem>
        <NFormItem :label="t('products.form.defaultPrice')" path="defaultPrice">
          <NInputNumber
            v-model:value="formValue.defaultPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          >
            <template #prefix>{{ currencySymbol }}</template>
          </NInputNumber>
        </NFormItem>
      </NForm>
    </NModal>
  </NSpace>
</template>
