<script setup lang="ts">
import { h, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NLayoutSider, NMenu, NSpace, NSelect, NGradientText, type MenuOption, type SelectOption } from 'naive-ui';
import { HomeOutline, PeopleOutline, DocumentTextOutline, SettingsOutline, StatsChartOutline } from '@vicons/ionicons5';
import type { Component } from 'vue';
import type { Locale } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const settingsStore = useSettingsStore();

function renderIcon(icon: Component) {
  return () => h(icon);
}

const menuOptions = computed<MenuOption[]>(() => [
  {
    label: () => t('dashboard'),
    key: 'dashboard',
    icon: renderIcon(HomeOutline),
  },
  {
    label: () => t('customers'),
    key: 'customers',
    icon: renderIcon(PeopleOutline),
  },
  {
    label: () => t('documents'),
    key: 'documents',
    icon: renderIcon(DocumentTextOutline),
  },
  {
    label: () => t('financial'),
    key: 'financial',
    icon: renderIcon(StatsChartOutline),
  },
  {
    label: () => t('settings'),
    key: 'settings',
    icon: renderIcon(SettingsOutline),
  },
]);

const activeKey = computed(() => {
  const path = route.path;
  if (path === '/') return 'dashboard';
  if (path.startsWith('/customers')) return 'customers';
  if (path.startsWith('/documents')) return 'documents';
  if (path.startsWith('/financial')) return 'financial';
  if (path.startsWith('/settings')) return 'settings';
  return 'dashboard';
});

function handleMenuSelect(key: string) {
  if (key === 'dashboard') {
    void router.push('/');
  } else {
    void router.push(`/${key}`);
  }
}

const languageOptions: SelectOption[] = [
  { label: 'English', value: 'en-US' },
  { label: 'Nederlands', value: 'nl-NL' },
];

const currentLocale = computed({
  get: () => locale.value as Locale,
  set: async (value: Locale) => {
    locale.value = value;
    // Save to settings
    if (settingsStore.settings) {
      try {
        await settingsStore.updateSettings({ language: value });
      } catch {
        // Silently fail - language change still works locally
      }
    }
  },
});

// Load settings if not already loaded (should be loaded in main.ts, but just in case)
onMounted(async () => {
  if (!settingsStore.settings) {
    await settingsStore.fetchSettings();
  }
  // Update locale if settings have a language preference
  const settings = settingsStore.settings;
  if (settings?.language && settings.language !== locale.value) {
    locale.value = settings.language;
  }
});

// Watch for settings changes to update language (e.g., if changed from another component)
watch(
  () => settingsStore.settings?.language,
  (newLanguage) => {
    if (newLanguage && newLanguage !== locale.value) {
      locale.value = newLanguage;
    }
  }
);
</script>

<template>
  <NLayoutSider bordered :width="200" :native-scrollbar="false" content-style="padding: 8px; display: flex; flex-direction: column;">
    <NSpace vertical :size="16" style="flex: 1;">
      <NSpace justify="center" :size="0">
        <NGradientText type="info" style="font-size: 18px; font-weight: bold">
          Simpel CRM
        </NGradientText>
      </NSpace>
      <NMenu :value="activeKey" :options="menuOptions" @update:value="handleMenuSelect" />
    </NSpace>
    <NSpace vertical :size="8" style="padding-top: 16px; border-top: 1px solid var(--n-border-color);">
      <NSelect
        v-model:value="currentLocale"
        :options="languageOptions"
        size="small"
      />
    </NSpace>
  </NLayoutSider>
</template>
