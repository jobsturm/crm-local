<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  NForm,
  NFormItem,
  NInput,
  NText,
  NDivider,
} from 'naive-ui';
import type { DocumentLabelsDto } from '@crm-local/shared';
import { FieldId } from '@/composables/usePdfPreview';

const { t } = useI18n();

const model = defineModel<Partial<DocumentLabelsDto>>({ required: true });
</script>

<template>
  <NText depth="3" style="display: block; margin-bottom: 16px">
    {{ t('settings.labelsDescription') }}
  </NText>

  <NForm :model="model" label-placement="top">
    <!-- QUOTE-ONLY LABELS -->
    <NDivider title-placement="left">
      <NText strong type="success">{{ t('settings.labels.quoteOnly') }}</NText>
    </NDivider>
    <NFormItem :label="t('settings.offerTitle')" path="offerTitle">
      <NInput :id="FieldId.LABEL_OFFER_TITLE" v-model:value="model.offerTitle" placeholder="Quote" />
    </NFormItem>
    <NFormItem :label="t('settings.offerNumberLabel')" path="offerNumberLabel">
      <NInput :id="FieldId.LABEL_OFFER_NUMBER" v-model:value="model.offerNumberLabel" placeholder="Quote Number" />
    </NFormItem>
    <NFormItem :label="t('settings.customerSectionOffer')" path="customerSectionTitleOffer">
      <NInput :id="FieldId.LABEL_CUSTOMER_SECTION_OFFER" v-model:value="model.customerSectionTitleOffer" placeholder="Customer Details" />
    </NFormItem>
    <NFormItem :label="t('settings.questionsTextOffer')" path="questionsTextOffer">
      <NInput
        :id="FieldId.LABEL_QUESTIONS_TEXT_OFFER"
        v-model:value="model.questionsTextOffer"
        type="textarea"
        :rows="2"
        :placeholder="t('settings.questionsTextPlaceholder')"
      />
    </NFormItem>

    <!-- INVOICE-ONLY LABELS -->
    <NDivider title-placement="left">
      <NText strong type="warning">{{ t('settings.labels.invoiceOnly') }}</NText>
    </NDivider>
    <NFormItem :label="t('settings.invoiceTitle')" path="invoiceTitle">
      <NInput :id="FieldId.LABEL_INVOICE_TITLE" v-model:value="model.invoiceTitle" placeholder="Invoice" />
    </NFormItem>
    <NFormItem :label="t('settings.invoiceNumberLabel')" path="invoiceNumberLabel">
      <NInput :id="FieldId.LABEL_INVOICE_NUMBER" v-model:value="model.invoiceNumberLabel" placeholder="Invoice Number" />
    </NFormItem>
    <NFormItem :label="t('settings.customerSectionInvoice')" path="customerSectionTitleInvoice">
      <NInput :id="FieldId.LABEL_CUSTOMER_SECTION_INVOICE" v-model:value="model.customerSectionTitleInvoice" placeholder="Billing Address" />
    </NFormItem>
    <NFormItem :label="t('settings.questionsTextInvoice')" path="questionsTextInvoice">
      <NInput
        :id="FieldId.LABEL_QUESTIONS_TEXT_INVOICE"
        v-model:value="model.questionsTextInvoice"
        type="textarea"
        :rows="2"
        :placeholder="t('settings.questionsTextPlaceholder')"
      />
    </NFormItem>

    <!-- SHARED LABELS -->
    <NDivider title-placement="left">
      <NText strong type="info">{{ t('settings.labels.shared') }}</NText>
    </NDivider>

    <NText strong>{{ t('settings.dateLabels') }}</NText>
    <NFormItem :label="t('settings.documentDate')" path="documentDateLabel">
      <NInput :id="FieldId.LABEL_DOCUMENT_DATE" v-model:value="model.documentDateLabel" placeholder="Date" />
    </NFormItem>
    <NFormItem :label="t('settings.dueDate')" path="dueDateLabel">
      <NInput :id="FieldId.LABEL_DUE_DATE" v-model:value="model.dueDateLabel" placeholder="Due Date" />
    </NFormItem>

    <NDivider />
    <NText strong>{{ t('settings.tableHeaders') }}</NText>
    <NFormItem :label="t('settings.description')" path="descriptionLabel">
      <NInput :id="FieldId.LABEL_DESCRIPTION" v-model:value="model.descriptionLabel" placeholder="Description" />
    </NFormItem>
    <NFormItem :label="t('settings.quantity')" path="quantityLabel">
      <NInput :id="FieldId.LABEL_QUANTITY" v-model:value="model.quantityLabel" placeholder="Qty" />
    </NFormItem>
    <NFormItem :label="t('settings.unitPrice')" path="unitPriceLabel">
      <NInput :id="FieldId.LABEL_UNIT_PRICE" v-model:value="model.unitPriceLabel" placeholder="Unit Price" />
    </NFormItem>
    <NFormItem :label="t('settings.amount')" path="amountLabel">
      <NInput :id="FieldId.LABEL_AMOUNT" v-model:value="model.amountLabel" placeholder="Amount" />
    </NFormItem>

    <NDivider />
    <NText strong>{{ t('settings.totals') }}</NText>
    <NFormItem :label="t('settings.subtotal')" path="subtotalLabel">
      <NInput :id="FieldId.LABEL_SUBTOTAL" v-model:value="model.subtotalLabel" placeholder="Subtotal" />
    </NFormItem>
    <NFormItem :label="t('settings.tax')" path="taxLabel">
      <NInput :id="FieldId.LABEL_TAX" v-model:value="model.taxLabel" placeholder="VAT" />
    </NFormItem>
    <NFormItem :label="t('settings.total')" path="totalLabel">
      <NInput :id="FieldId.LABEL_TOTAL" v-model:value="model.totalLabel" placeholder="Total" />
    </NFormItem>

    <NDivider />
    <NText strong>Company Details Labels</NText>
    <NFormItem label="Phone Label" path="telLabel">
      <NInput :id="FieldId.LABEL_TEL" v-model:value="model.telLabel" placeholder="Tel:" />
    </NFormItem>
    <NFormItem label="Email Label" path="emailLabel">
      <NInput :id="FieldId.LABEL_EMAIL" v-model:value="model.emailLabel" placeholder="E-mail:" />
    </NFormItem>
    <NFormItem label="Chamber of Commerce Label" path="kvkLabel">
      <NInput :id="FieldId.LABEL_KVK" v-model:value="model.kvkLabel" placeholder="CoC:" />
    </NFormItem>
    <NFormItem label="VAT ID Label" path="vatIdLabel">
      <NInput :id="FieldId.LABEL_VAT_ID" v-model:value="model.vatIdLabel" placeholder="VAT:" />
    </NFormItem>
    <NFormItem label="IBAN Label" path="ibanLabel">
      <NInput :id="FieldId.LABEL_IBAN" v-model:value="model.ibanLabel" placeholder="IBAN:" />
    </NFormItem>

    <NDivider />
    <NText strong>{{ t('settings.footer') }}</NText>
    <NFormItem :label="t('settings.thankYouText')" path="thankYouText">
      <NInput
        :id="FieldId.LABEL_THANK_YOU"
        v-model:value="model.thankYouText"
        type="textarea"
        :rows="2"
        placeholder="Thank you for your business with {company}!"
      />
    </NFormItem>
  </NForm>
</template>
