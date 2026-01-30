import { ref, computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { UpdateBusinessDto, UpdateSettingsDto, DocumentLabelsDto } from '@crm-local/shared';
import { useSettingsStore } from '@/stores/settings';
import { generatePreviewHTML, SAMPLE_BUSINESS } from '@/services/pdf-preview';
import type { SelectOption } from 'naive-ui';

// Field IDs for type-safe input element references
export const FieldId = {
  // Business Info
  BUSINESS_NAME: 'input-business-name',
  BUSINESS_EMAIL: 'input-business-email',
  BUSINESS_PHONE: 'input-business-phone',
  BUSINESS_STREET: 'input-business-address-street',
  BUSINESS_POSTAL_CODE: 'input-business-address-postalCode',
  BUSINESS_CITY: 'input-business-address-city',
  BUSINESS_TAX_ID: 'input-business-taxId',
  BUSINESS_COC: 'input-business-chamberOfCommerce',
  BUSINESS_IBAN: 'input-business-bankDetails-iban',
  // Document Settings
  SETTINGS_CURRENCY_SYMBOL: 'input-settings-currencySymbol',
  SETTINGS_TAX_RATE: 'input-settings-defaultTaxRate',
  SETTINGS_OFFER_PREFIX: 'input-settings-offerPrefix',
  SETTINGS_INVOICE_PREFIX: 'input-settings-invoicePrefix',
  SETTINGS_INTRO_TEXT: 'input-settings-defaultIntroText',
  SETTINGS_NOTES_TEXT: 'input-settings-defaultNotesText',
  SETTINGS_FOOTER_TEXT: 'input-settings-defaultFooterText',
  // Labels - Quote
  LABEL_OFFER_TITLE: 'input-offerTitle',
  LABEL_OFFER_NUMBER: 'input-offerNumberLabel',
  LABEL_CUSTOMER_SECTION_OFFER: 'input-customerSectionTitleOffer',
  LABEL_QUESTIONS_TEXT_OFFER: 'input-questionsTextOffer',
  // Labels - Invoice
  LABEL_INVOICE_TITLE: 'input-invoiceTitle',
  LABEL_INVOICE_NUMBER: 'input-invoiceNumberLabel',
  LABEL_CUSTOMER_SECTION_INVOICE: 'input-customerSectionTitleInvoice',
  LABEL_QUESTIONS_TEXT_INVOICE: 'input-questionsTextInvoice',
  // Labels - Shared
  LABEL_DOCUMENT_DATE: 'input-documentDateLabel',
  LABEL_DUE_DATE: 'input-dueDateLabel',
  LABEL_DESCRIPTION: 'input-descriptionLabel',
  LABEL_QUANTITY: 'input-quantityLabel',
  LABEL_UNIT_PRICE: 'input-unitPriceLabel',
  LABEL_AMOUNT: 'input-amountLabel',
  LABEL_SUBTOTAL: 'input-subtotalLabel',
  LABEL_TAX: 'input-taxLabel',
  LABEL_TOTAL: 'input-totalLabel',
  LABEL_THANK_YOU: 'input-thankYouText',
  // Labels - Company Details
  LABEL_TEL: 'input-telLabel',
  LABEL_EMAIL: 'input-emailLabel',
  LABEL_KVK: 'input-kvkLabel',
  LABEL_VAT_ID: 'input-vatIdLabel',
  LABEL_IBAN: 'input-ibanLabel',
} as const;

export interface FieldConfig {
  getValue: () => string;
  setValue: (v: string) => void;
  label: string;
  tab: string;
  inputId: string;
  isNumber?: boolean;
}

export function usePdfPreview(
  businessForm: Ref<UpdateBusinessDto>,
  settingsForm: Ref<UpdateSettingsDto>,
  labelsForm: Ref<Partial<DocumentLabelsDto>>
) {
  const { t } = useI18n();
  const store = useSettingsStore();

  // Preview state
  const previewDocType = ref<'offer' | 'invoice'>('invoice');
  const previewMode = ref<'edit' | 'view'>('edit');
  const activeTab = ref('business');

  const previewDocTypeOptions = computed<SelectOption[]>(() => [
    { label: t('settings.preview.invoice'), value: 'invoice' },
    { label: t('settings.preview.offer'), value: 'offer' },
  ]);

  // Generate preview HTML
  const previewHTML = computed(() => {
    const business = store.business ?? SAMPLE_BUSINESS;

    return generatePreviewHTML({
      labels: labelsForm.value,
      documentType: previewDocType.value,
      business,
      currency: settingsForm.value.currency,
      currencySymbol: settingsForm.value.currencySymbol,
      defaultTaxRate: settingsForm.value.defaultTaxRate,
      defaultPaymentTermDays: settingsForm.value.defaultPaymentTermDays,
      defaultIntroText: settingsForm.value.defaultIntroText,
      defaultNotesText: settingsForm.value.defaultNotesText,
      defaultFooterText: settingsForm.value.defaultFooterText,
      offerPrefix: settingsForm.value.offerPrefix,
      invoicePrefix: settingsForm.value.invoicePrefix,
      interactive: previewMode.value === 'edit',
    });
  });

  const previewDataUrl = computed(() => {
    return `data:text/html;charset=utf-8,${encodeURIComponent(previewHTML.value)}`;
  });

  // Field info mapping for all editable fields
  const fieldInfo = computed<Record<string, FieldConfig>>(() => ({
    // Business Info fields
    'business.name': {
      getValue: () => businessForm.value.name ?? '',
      setValue: (v) => (businessForm.value.name = v),
      label: 'Company Name',
      tab: 'business',
      inputId: FieldId.BUSINESS_NAME,
    },
    'business.email': {
      getValue: () => businessForm.value.email ?? '',
      setValue: (v) => (businessForm.value.email = v),
      label: 'Email',
      tab: 'business',
      inputId: FieldId.BUSINESS_EMAIL,
    },
    'business.phone': {
      getValue: () => businessForm.value.phone ?? '',
      setValue: (v) => (businessForm.value.phone = v),
      label: 'Phone',
      tab: 'business',
      inputId: FieldId.BUSINESS_PHONE,
    },
    'business.address.street': {
      getValue: () => businessForm.value.address?.street ?? '',
      setValue: (v) => {
        if (businessForm.value.address) businessForm.value.address.street = v;
      },
      label: 'Street',
      tab: 'business',
      inputId: FieldId.BUSINESS_STREET,
    },
    'business.address.postalCode': {
      getValue: () => businessForm.value.address?.postalCode ?? '',
      setValue: (v) => {
        if (businessForm.value.address) businessForm.value.address.postalCode = v;
      },
      label: 'Postal Code',
      tab: 'business',
      inputId: FieldId.BUSINESS_POSTAL_CODE,
    },
    'business.address.city': {
      getValue: () => businessForm.value.address?.city ?? '',
      setValue: (v) => {
        if (businessForm.value.address) businessForm.value.address.city = v;
      },
      label: 'City',
      tab: 'business',
      inputId: FieldId.BUSINESS_CITY,
    },
    'business.taxId': {
      getValue: () => businessForm.value.taxId ?? '',
      setValue: (v) => (businessForm.value.taxId = v),
      label: 'Tax ID / VAT Number',
      tab: 'business',
      inputId: FieldId.BUSINESS_TAX_ID,
    },
    'business.chamberOfCommerce': {
      getValue: () => businessForm.value.chamberOfCommerce ?? '',
      setValue: (v) => (businessForm.value.chamberOfCommerce = v),
      label: 'Chamber of Commerce',
      tab: 'business',
      inputId: FieldId.BUSINESS_COC,
    },
    'business.bankDetails.iban': {
      getValue: () => businessForm.value.bankDetails?.iban ?? '',
      setValue: (v) => {
        if (businessForm.value.bankDetails) businessForm.value.bankDetails.iban = v;
      },
      label: 'IBAN',
      tab: 'business',
      inputId: FieldId.BUSINESS_IBAN,
    },
    // Document Settings fields
    'settings.currencySymbol': {
      getValue: () => settingsForm.value.currencySymbol ?? '',
      setValue: (v) => (settingsForm.value.currencySymbol = v),
      label: 'Currency Symbol',
      tab: 'documents',
      inputId: FieldId.SETTINGS_CURRENCY_SYMBOL,
    },
    'settings.defaultTaxRate': {
      getValue: () => String(settingsForm.value.defaultTaxRate ?? 21),
      setValue: (v) => (settingsForm.value.defaultTaxRate = parseFloat(v) || 21),
      label: 'Default Tax Rate (%)',
      tab: 'documents',
      inputId: FieldId.SETTINGS_TAX_RATE,
      isNumber: true,
    },
    'settings.offerPrefix': {
      getValue: () => settingsForm.value.offerPrefix ?? '',
      setValue: (v) => (settingsForm.value.offerPrefix = v),
      label: 'Offer Number Prefix',
      tab: 'documents',
      inputId: FieldId.SETTINGS_OFFER_PREFIX,
    },
    'settings.invoicePrefix': {
      getValue: () => settingsForm.value.invoicePrefix ?? '',
      setValue: (v) => (settingsForm.value.invoicePrefix = v),
      label: 'Invoice Number Prefix',
      tab: 'documents',
      inputId: FieldId.SETTINGS_INVOICE_PREFIX,
    },
    'settings.defaultIntroText': {
      getValue: () => settingsForm.value.defaultIntroText ?? '',
      setValue: (v) => (settingsForm.value.defaultIntroText = v),
      label: 'Default Introduction Text',
      tab: 'documents',
      inputId: FieldId.SETTINGS_INTRO_TEXT,
    },
    'settings.defaultNotesText': {
      getValue: () => settingsForm.value.defaultNotesText ?? '',
      setValue: (v) => (settingsForm.value.defaultNotesText = v),
      label: 'Default Notes',
      tab: 'documents',
      inputId: FieldId.SETTINGS_NOTES_TEXT,
    },
    'settings.defaultFooterText': {
      getValue: () => settingsForm.value.defaultFooterText ?? '',
      setValue: (v) => (settingsForm.value.defaultFooterText = v),
      label: 'Default Footer Text',
      tab: 'documents',
      inputId: FieldId.SETTINGS_FOOTER_TEXT,
    },
    // PDF Labels
    offerTitle: {
      getValue: () => labelsForm.value.offerTitle ?? '',
      setValue: (v) => (labelsForm.value.offerTitle = v),
      label: 'Offer Title',
      tab: 'labels',
      inputId: FieldId.LABEL_OFFER_TITLE,
    },
    invoiceTitle: {
      getValue: () => labelsForm.value.invoiceTitle ?? '',
      setValue: (v) => (labelsForm.value.invoiceTitle = v),
      label: 'Invoice Title',
      tab: 'labels',
      inputId: FieldId.LABEL_INVOICE_TITLE,
    },
    offerNumberLabel: {
      getValue: () => labelsForm.value.offerNumberLabel ?? '',
      setValue: (v) => (labelsForm.value.offerNumberLabel = v),
      label: 'Offer Number Label',
      tab: 'labels',
      inputId: FieldId.LABEL_OFFER_NUMBER,
    },
    invoiceNumberLabel: {
      getValue: () => labelsForm.value.invoiceNumberLabel ?? '',
      setValue: (v) => (labelsForm.value.invoiceNumberLabel = v),
      label: 'Invoice Number Label',
      tab: 'labels',
      inputId: FieldId.LABEL_INVOICE_NUMBER,
    },
    documentDateLabel: {
      getValue: () => labelsForm.value.documentDateLabel ?? '',
      setValue: (v) => (labelsForm.value.documentDateLabel = v),
      label: 'Document Date Label',
      tab: 'labels',
      inputId: FieldId.LABEL_DOCUMENT_DATE,
    },
    dueDateLabel: {
      getValue: () => labelsForm.value.dueDateLabel ?? '',
      setValue: (v) => (labelsForm.value.dueDateLabel = v),
      label: 'Due Date Label',
      tab: 'labels',
      inputId: FieldId.LABEL_DUE_DATE,
    },
    customerSectionTitleOffer: {
      getValue: () => labelsForm.value.customerSectionTitleOffer ?? '',
      setValue: (v) => (labelsForm.value.customerSectionTitleOffer = v),
      label: 'Customer Section (Offer)',
      tab: 'labels',
      inputId: FieldId.LABEL_CUSTOMER_SECTION_OFFER,
    },
    customerSectionTitleInvoice: {
      getValue: () => labelsForm.value.customerSectionTitleInvoice ?? '',
      setValue: (v) => (labelsForm.value.customerSectionTitleInvoice = v),
      label: 'Customer Section (Invoice)',
      tab: 'labels',
      inputId: FieldId.LABEL_CUSTOMER_SECTION_INVOICE,
    },
    descriptionLabel: {
      getValue: () => labelsForm.value.descriptionLabel ?? '',
      setValue: (v) => (labelsForm.value.descriptionLabel = v),
      label: 'Description',
      tab: 'labels',
      inputId: FieldId.LABEL_DESCRIPTION,
    },
    quantityLabel: {
      getValue: () => labelsForm.value.quantityLabel ?? '',
      setValue: (v) => (labelsForm.value.quantityLabel = v),
      label: 'Quantity',
      tab: 'labels',
      inputId: FieldId.LABEL_QUANTITY,
    },
    unitPriceLabel: {
      getValue: () => labelsForm.value.unitPriceLabel ?? '',
      setValue: (v) => (labelsForm.value.unitPriceLabel = v),
      label: 'Unit Price',
      tab: 'labels',
      inputId: FieldId.LABEL_UNIT_PRICE,
    },
    amountLabel: {
      getValue: () => labelsForm.value.amountLabel ?? '',
      setValue: (v) => (labelsForm.value.amountLabel = v),
      label: 'Amount',
      tab: 'labels',
      inputId: FieldId.LABEL_AMOUNT,
    },
    subtotalLabel: {
      getValue: () => labelsForm.value.subtotalLabel ?? '',
      setValue: (v) => (labelsForm.value.subtotalLabel = v),
      label: 'Subtotal',
      tab: 'labels',
      inputId: FieldId.LABEL_SUBTOTAL,
    },
    taxLabel: {
      getValue: () => labelsForm.value.taxLabel ?? '',
      setValue: (v) => (labelsForm.value.taxLabel = v),
      label: 'Tax Label',
      tab: 'labels',
      inputId: FieldId.LABEL_TAX,
    },
    totalLabel: {
      getValue: () => labelsForm.value.totalLabel ?? '',
      setValue: (v) => (labelsForm.value.totalLabel = v),
      label: 'Total',
      tab: 'labels',
      inputId: FieldId.LABEL_TOTAL,
    },
    thankYouText: {
      getValue: () => labelsForm.value.thankYouText ?? '',
      setValue: (v) => (labelsForm.value.thankYouText = v),
      label: 'Thank You Text',
      tab: 'labels',
      inputId: FieldId.LABEL_THANK_YOU,
    },
    questionsTextOffer: {
      getValue: () => labelsForm.value.questionsTextOffer ?? '',
      setValue: (v) => (labelsForm.value.questionsTextOffer = v),
      label: 'Questions Text (Offer)',
      tab: 'labels',
      inputId: FieldId.LABEL_QUESTIONS_TEXT_OFFER,
    },
    questionsTextInvoice: {
      getValue: () => labelsForm.value.questionsTextInvoice ?? '',
      setValue: (v) => (labelsForm.value.questionsTextInvoice = v),
      label: 'Questions Text (Invoice)',
      tab: 'labels',
      inputId: FieldId.LABEL_QUESTIONS_TEXT_INVOICE,
    },
    telLabel: {
      getValue: () => labelsForm.value.telLabel ?? '',
      setValue: (v) => (labelsForm.value.telLabel = v),
      label: 'Phone Label',
      tab: 'labels',
      inputId: FieldId.LABEL_TEL,
    },
    emailLabel: {
      getValue: () => labelsForm.value.emailLabel ?? '',
      setValue: (v) => (labelsForm.value.emailLabel = v),
      label: 'Email Label',
      tab: 'labels',
      inputId: FieldId.LABEL_EMAIL,
    },
    kvkLabel: {
      getValue: () => labelsForm.value.kvkLabel ?? '',
      setValue: (v) => (labelsForm.value.kvkLabel = v),
      label: 'Chamber of Commerce Label',
      tab: 'labels',
      inputId: FieldId.LABEL_KVK,
    },
    vatIdLabel: {
      getValue: () => labelsForm.value.vatIdLabel ?? '',
      setValue: (v) => (labelsForm.value.vatIdLabel = v),
      label: 'VAT ID Label',
      tab: 'labels',
      inputId: FieldId.LABEL_VAT_ID,
    },
    ibanLabel: {
      getValue: () => labelsForm.value.ibanLabel ?? '',
      setValue: (v) => (labelsForm.value.ibanLabel = v),
      label: 'IBAN Label',
      tab: 'labels',
      inputId: FieldId.LABEL_IBAN,
    },
  }));

  // Handle postMessage from iframe
  function handleIframeMessage(event: MessageEvent) {
    if (event.data?.type === 'editLabel' && event.data.field) {
      const field = event.data.field as string;
      const info = fieldInfo.value[field];
      if (info) {
        activeTab.value = info.tab;

        window.setTimeout(() => {
          const wrapper = document.getElementById(info.inputId);
          if (wrapper) {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const actualInput = wrapper.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
            if (actualInput) {
              actualInput.focus();
              actualInput.select();
            }

            wrapper.classList.add('highlight-input');
            window.setTimeout(() => wrapper.classList.remove('highlight-input'), 2000);
          }
        }, 150);
      }
    }
  }

  return {
    previewDocType,
    previewDocTypeOptions,
    previewMode,
    previewHTML,
    previewDataUrl,
    activeTab,
    fieldInfo,
    handleIframeMessage,
  };
}
