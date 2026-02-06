<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NDivider,
  NText,
  NCollapse,
  NCollapseItem,
} from 'naive-ui';
import type { UpdateSettingsDto } from '@crm-local/shared';
import { FieldId } from '@/composables/usePdfPreview';
import DocumentNumberingSection from './DocumentNumberingSection.vue';

const { t } = useI18n();

const model = defineModel<UpdateSettingsDto>({ required: true });

// Ensure countersByYear objects exist
const invoiceCountersByYear = computed({
  get: () => model.value.invoiceCountersByYear ?? {},
  set: (value: Record<string, number>) => {
    model.value.invoiceCountersByYear = value;
  },
});

const offerCountersByYear = computed({
  get: () => model.value.offerCountersByYear ?? {},
  set: (value: Record<string, number>) => {
    model.value.offerCountersByYear = value;
  },
});
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

    <NDivider>{{ t('settings.numbering.invoiceTitle') }}</NDivider>

    <DocumentNumberingSection
      v-model:format="model.invoiceNumberFormat"
      v-model:prefix="model.invoicePrefix"
      v-model:next-number="model.nextInvoiceNumber"
      v-model:counters-by-year="invoiceCountersByYear"
      :format-field-id="FieldId.SETTINGS_INVOICE_FORMAT"
      :prefix-field-id="FieldId.SETTINGS_INVOICE_PREFIX"
      prefix-placeholder="INV"
      format-path="invoiceNumberFormat"
      prefix-path="invoicePrefix"
      next-number-path="nextInvoiceNumber"
      counters-by-year-path="invoiceCountersByYear"
    />

    <NDivider>{{ t('settings.numbering.offerTitle') }}</NDivider>

    <DocumentNumberingSection
      v-model:format="model.offerNumberFormat"
      v-model:prefix="model.offerPrefix"
      v-model:next-number="model.nextOfferNumber"
      v-model:counters-by-year="offerCountersByYear"
      :format-field-id="FieldId.SETTINGS_OFFER_FORMAT"
      :prefix-field-id="FieldId.SETTINGS_OFFER_PREFIX"
      prefix-placeholder="OFF"
      format-path="offerNumberFormat"
      prefix-path="offerPrefix"
      next-number-path="nextOfferNumber"
      counters-by-year-path="offerCountersByYear"
    />

    <NCollapse>
      <NCollapseItem :title="t('settings.numbering.help')" name="help">
        <NText depth="2" style="font-size: 13px; white-space: pre-line">
          {{ t('settings.numbering.helpText') }}
        </NText>
      </NCollapseItem>
    </NCollapse>

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
