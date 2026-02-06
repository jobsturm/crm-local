<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NFormItem,
  NInput,
  NInputNumber,
  NGrid,
  NGridItem,
  NText,
  NTooltip,
  NTag,
  NSpace,
  NSelect,
} from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import {
  DEFAULT_DOCUMENT_NUMBER_FORMAT,
  formatDocumentNumber,
  buildDocumentNumberVariables,
  validateTemplate,
  TEMPLATE_VARIABLES,
} from '@crm-local/shared';
import { DOCUMENT_NUMBER_PRESETS, getPresetForFormat } from '@/config/document-number-presets';

const { t } = useI18n();

const props = defineProps<{
  formatFieldId: string;
  prefixFieldId: string;
  prefixPlaceholder: string;
  formatPath: string;
  prefixPath: string;
  nextNumberPath: string;
  countersByYearPath: string;
}>();

const format = defineModel<string | undefined>('format');
const prefix = defineModel<string | undefined>('prefix');
const nextNumber = defineModel<number | undefined>('nextNumber');
const countersByYear = defineModel<Record<string, number>>('countersByYear', { default: () => ({}) });

// Get current year for per-year counter display
const currentYear = new Date().getFullYear().toString();

// Preset dropdown options
const presetOptions = computed<SelectOption[]>(() =>
  DOCUMENT_NUMBER_PRESETS.map((preset) => ({
    label: preset.id === 'custom'
      ? t(preset.labelKey)
      : `${preset.example} - ${t(preset.labelKey)}`,
    value: preset.id,
  }))
);

// Track if user explicitly selected "custom"
const isCustomSelected = ref(false);

// Initialize custom flag based on whether current format matches any preset
watch(
  () => format.value,
  (newFormat) => {
    const formatValue = newFormat ?? DEFAULT_DOCUMENT_NUMBER_FORMAT;
    const matchingPreset = getPresetForFormat(formatValue);
    // If format doesn't match any preset, it's custom
    if (matchingPreset.id === 'custom') {
      isCustomSelected.value = true;
    }
  },
  { immediate: true }
);

// Currently selected preset
const presetId = computed({
  get: () => {
    // If user explicitly selected custom, show custom
    if (isCustomSelected.value) {
      return 'custom';
    }
    const formatValue = format.value ?? DEFAULT_DOCUMENT_NUMBER_FORMAT;
    return getPresetForFormat(formatValue).id;
  },
  set: (newPresetId: string) => {
    if (newPresetId === 'custom') {
      // User explicitly selected custom - keep current format, just show the input
      isCustomSelected.value = true;
    } else {
      // User selected a preset - apply the format and clear custom flag
      isCustomSelected.value = false;
      const preset = DOCUMENT_NUMBER_PRESETS.find((p) => p.id === newPresetId);
      if (preset) {
        format.value = preset.format;
      }
    }
  },
});

// Whether custom format input should be shown
const showCustomFormat = computed(() => isCustomSelected.value);

// Computed property for per-year counter
const currentYearCounter = computed({
  get: () => countersByYear.value?.[currentYear] ?? 1,
  set: (value: number) => {
    if (!countersByYear.value) {
      countersByYear.value = {};
    }
    countersByYear.value = { ...countersByYear.value, [currentYear]: value };
  },
});

// Preview computed property
const numberPreview = computed(() => {
  const formatValue = format.value ?? DEFAULT_DOCUMENT_NUMBER_FORMAT;
  const prefixValue = prefix.value ?? props.prefixPlaceholder;
  const globalCounter = nextNumber.value ?? 1;
  const yearCounter = currentYearCounter.value;

  const validation = validateTemplate(formatValue);
  if (!validation.valid) {
    return t('settings.numbering.invalidFormat');
  }

  const variables = buildDocumentNumberVariables(prefixValue, globalCounter, yearCounter);
  return formatDocumentNumber(formatValue, variables);
});

// Template validation
const formatValidation = computed(() =>
  validateTemplate(format.value ?? DEFAULT_DOCUMENT_NUMBER_FORMAT)
);

// Insert variable into format field
function insertVariable(variable: string) {
  const current = format.value ?? DEFAULT_DOCUMENT_NUMBER_FORMAT;
  format.value = current + `{${variable}}`;
}
</script>

<template>
  <NFormItem :label="t('settings.numbering.format')" :path="formatPath">
    <NSpace vertical :size="8" style="width: 100%">
      <NSelect
        :id="formatFieldId"
        v-model:value="presetId"
        :options="presetOptions"
      />
      <template v-if="showCustomFormat">
        <NInput
          v-model:value="format"
          :placeholder="DEFAULT_DOCUMENT_NUMBER_FORMAT"
          :status="formatValidation.valid ? undefined : 'error'"
        />
        <NSpace :size="4" :wrap="true">
          <NTooltip v-for="variable in TEMPLATE_VARIABLES" :key="variable">
            <template #trigger>
              <NTag
                size="small"
                :bordered="false"
                style="cursor: pointer"
                @click="insertVariable(variable)"
              >
                {{ '{' + variable + '}' }}
              </NTag>
            </template>
            {{ t(`settings.numbering.var.${variable}`) }}
          </NTooltip>
        </NSpace>
        <NSpace v-if="!formatValidation.valid" vertical :size="2">
          <NText type="error" depth="1" style="font-size: 12px">
            {{ formatValidation.errors[0] }}
          </NText>
        </NSpace>
      </template>
      <NSpace align="center" :size="8">
        <NText depth="3" style="font-size: 12px">{{ t('settings.numbering.preview') }}:</NText>
        <NText strong>{{ numberPreview }}</NText>
      </NSpace>
    </NSpace>
  </NFormItem>

  <NFormItem :label="t('settings.numbering.prefix')" :path="prefixPath">
    <NInput :id="prefixFieldId" v-model:value="prefix" :placeholder="prefixPlaceholder" />
  </NFormItem>

  <NGrid :cols="2" :x-gap="12">
    <NGridItem>
      <NFormItem :label="t('settings.numbering.nextNumber')" :path="nextNumberPath">
        <NInputNumber v-model:value="nextNumber" :min="1" style="width: 100%" />
      </NFormItem>
    </NGridItem>
    <NGridItem>
      <NFormItem :label="t('settings.numbering.nextNumberYear', { year: currentYear })" :path="countersByYearPath">
        <NInputNumber v-model:value="currentYearCounter" :min="1" style="width: 100%" />
      </NFormItem>
    </NGridItem>
  </NGrid>
</template>
