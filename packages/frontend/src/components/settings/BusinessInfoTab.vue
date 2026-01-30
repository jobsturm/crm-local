<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  NForm,
  NFormItem,
  NInput,
  NGrid,
  NGridItem,
  NDivider,
} from 'naive-ui';
import type { UpdateBusinessDto } from '@crm-local/shared';
import { FieldId } from '@/composables/usePdfPreview';

const { t } = useI18n();

const model = defineModel<UpdateBusinessDto>({ required: true });
</script>

<template>
  <NForm :model="model" label-placement="top">
    <NFormItem :label="t('settings.companyName')" path="name">
      <NInput :id="FieldId.BUSINESS_NAME" v-model:value="model.name" placeholder="Your company name" />
    </NFormItem>

    <NFormItem :label="t('settings.email')" path="email">
      <NInput :id="FieldId.BUSINESS_EMAIL" v-model:value="model.email" placeholder="info@company.com" />
    </NFormItem>

    <NFormItem :label="t('settings.phone')" path="phone">
      <NInput :id="FieldId.BUSINESS_PHONE" v-model:value="model.phone" placeholder="Phone number" />
    </NFormItem>

    <NFormItem :label="t('settings.website')" path="website">
      <NInput v-model:value="model.website" placeholder="https://..." />
    </NFormItem>

    <NDivider />

    <NFormItem :label="t('settings.street')" path="address.street">
      <NInput :id="FieldId.BUSINESS_STREET" v-model:value="model.address!.street" placeholder="Street address" />
    </NFormItem>

    <NGrid :cols="2" :x-gap="12">
      <NGridItem>
        <NFormItem :label="t('settings.postalCode')" path="address.postalCode">
          <NInput :id="FieldId.BUSINESS_POSTAL_CODE" v-model:value="model.address!.postalCode" placeholder="Postal code" />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem :label="t('settings.city')" path="address.city">
          <NInput :id="FieldId.BUSINESS_CITY" v-model:value="model.address!.city" placeholder="City" />
        </NFormItem>
      </NGridItem>
    </NGrid>

    <NFormItem :label="t('settings.country')" path="address.country">
      <NInput v-model:value="model.address!.country" placeholder="Country" />
    </NFormItem>

    <NDivider />

    <NFormItem :label="t('settings.taxId')" path="taxId">
      <NInput :id="FieldId.BUSINESS_TAX_ID" v-model:value="model.taxId" placeholder="NL123456789B01" />
    </NFormItem>

    <NFormItem :label="t('settings.chamberOfCommerce')" path="chamberOfCommerce">
      <NInput :id="FieldId.BUSINESS_COC" v-model:value="model.chamberOfCommerce" placeholder="KvK number" />
    </NFormItem>

    <NDivider>{{ t('settings.bankDetails') }}</NDivider>

    <NFormItem :label="t('settings.bankName')" path="bankDetails.bankName">
      <NInput v-model:value="model.bankDetails!.bankName" placeholder="Bank name" />
    </NFormItem>

    <NFormItem :label="t('settings.accountHolder')" path="bankDetails.accountHolder">
      <NInput v-model:value="model.bankDetails!.accountHolder" placeholder="Account holder name" />
    </NFormItem>

    <NFormItem :label="t('settings.iban')" path="bankDetails.iban">
      <NInput :id="FieldId.BUSINESS_IBAN" v-model:value="model.bankDetails!.iban" placeholder="NL00BANK0123456789" />
    </NFormItem>

    <NFormItem :label="t('settings.bic')" path="bankDetails.bic">
      <NInput v-model:value="model.bankDetails!.bic" placeholder="BANKNL2A" />
    </NFormItem>
  </NForm>
</template>
