<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NDivider,
} from 'naive-ui';
import type { UpdateSettingsDto } from '@crm-local/shared';
import { FieldId } from '@/composables/usePdfPreview';

const { t } = useI18n();

const model = defineModel<UpdateSettingsDto>({ required: true });
</script>

<template>
  <NForm :model="model" label-placement="top">
    <NFormItem :label="t('settings.currency')" path="currency">
      <NInput v-model:value="model.currency" placeholder="EUR" />
    </NFormItem>

    <NFormItem :label="t('settings.currencySymbol')" path="currencySymbol">
      <NInput :id="FieldId.SETTINGS_CURRENCY_SYMBOL" v-model:value="model.currencySymbol" placeholder="€" />
    </NFormItem>

    <NFormItem :label="t('settings.defaultTaxRate')" path="defaultTaxRate">
      <NInputNumber :id="FieldId.SETTINGS_TAX_RATE" v-model:value="model.defaultTaxRate" :min="0" :max="100" style="width: 100%" />
    </NFormItem>

    <NFormItem :label="t('settings.defaultPaymentTerm')" path="defaultPaymentTermDays">
      <NInputNumber v-model:value="model.defaultPaymentTermDays" :min="0" style="width: 100%" />
    </NFormItem>

    <NDivider>{{ t('settings.documentNumbering') }}</NDivider>

    <NFormItem :label="t('settings.offerPrefix')" path="offerPrefix">
      <NInput :id="FieldId.SETTINGS_OFFER_PREFIX" v-model:value="model.offerPrefix" placeholder="OFF" />
    </NFormItem>

    <NFormItem :label="t('settings.invoicePrefix')" path="invoicePrefix">
      <NInput :id="FieldId.SETTINGS_INVOICE_PREFIX" v-model:value="model.invoicePrefix" placeholder="INV" />
    </NFormItem>

    <NDivider>{{ t('settings.defaultTexts') }}</NDivider>

    <NFormItem :label="t('settings.defaultIntroText')" path="defaultIntroText">
      <NInput
        :id="FieldId.SETTINGS_INTRO_TEXT"
        v-model:value="model.defaultIntroText"
        type="textarea"
        :rows="2"
        :placeholder="t('settings.defaultIntroTextPlaceholder')"
      />
    </NFormItem>

    <NFormItem :label="t('settings.defaultNotesText')" path="defaultNotesText">
      <NInput
        :id="FieldId.SETTINGS_NOTES_TEXT"
        v-model:value="model.defaultNotesText"
        type="textarea"
        :rows="2"
        :placeholder="t('settings.defaultNotesTextPlaceholder')"
      />
    </NFormItem>

    <NFormItem :label="t('settings.defaultFooterText')" path="defaultFooterText">
      <NInput
        :id="FieldId.SETTINGS_FOOTER_TEXT"
        v-model:value="model.defaultFooterText"
        type="textarea"
        :rows="2"
        :placeholder="t('settings.defaultFooterTextPlaceholder')"
      />
    </NFormItem>
  </NForm>
</template>
