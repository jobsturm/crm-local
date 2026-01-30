<script setup lang="ts">
import { h, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NLayoutSider, NMenu, NSpace, NGradientText, type MenuOption } from 'naive-ui';
import { HomeOutline, PeopleOutline, DocumentTextOutline, SettingsOutline, StatsChartOutline, CogOutline } from '@vicons/ionicons5';
import type { Component } from 'vue';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

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
    key: 'settings-group',
    icon: renderIcon(SettingsOutline),
    children: [
      {
        label: () => t('settings.documents'),
        key: 'settings',
        icon: renderIcon(DocumentTextOutline),
      },
      {
        label: () => t('settings.general'),
        key: 'settings-general',
        icon: renderIcon(CogOutline),
      },
    ],
  },
]);

const activeKey = computed(() => {
  const path = route.path;
  if (path === '/') return 'dashboard';
  if (path.startsWith('/customers')) return 'customers';
  if (path.startsWith('/documents')) return 'documents';
  if (path.startsWith('/financial')) return 'financial';
  if (path === '/settings/general') return 'settings-general';
  if (path.startsWith('/settings')) return 'settings';
  return 'dashboard';
});

function handleMenuSelect(key: string) {
  if (key === 'dashboard') {
    void router.push('/');
  } else if (key === 'settings-general') {
    void router.push('/settings/general');
  } else if (key === 'settings') {
    void router.push('/settings');
  } else if (key === 'settings-group') {
    // Don't navigate when clicking the group header
    return;
  } else {
    void router.push(`/${key}`);
  }
}
</script>

<template>
  <NLayoutSider bordered :width="200" :native-scrollbar="false" content-style="padding: 8px;">
    <NSpace vertical :size="16">
      <NSpace justify="center" :size="0">
        <NGradientText type="info" style="font-size: 18px; font-weight: bold">
          Simpel CRM
        </NGradientText>
      </NSpace>
      <NMenu :value="activeKey" :options="menuOptions" @update:value="handleMenuSelect" />
    </NSpace>
  </NLayoutSider>
</template>
