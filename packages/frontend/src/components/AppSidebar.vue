<script setup lang="ts">
import { h, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NLayoutSider, NMenu, NSpace, NText, type MenuOption } from 'naive-ui';
import { PeopleOutline, DocumentTextOutline, SettingsOutline } from '@vicons/ionicons5';
import type { Component } from 'vue';

const router = useRouter();
const route = useRoute();

function renderIcon(icon: Component) {
  return () => h(icon);
}

const menuOptions: MenuOption[] = [
  {
    label: 'Customers',
    key: 'customers',
    icon: renderIcon(PeopleOutline),
  },
  {
    label: 'Documents',
    key: 'documents',
    icon: renderIcon(DocumentTextOutline),
  },
  {
    label: 'Settings',
    key: 'settings',
    icon: renderIcon(SettingsOutline),
  },
];

const activeKey = computed(() => {
  const path = route.path;
  if (path.startsWith('/customers')) return 'customers';
  if (path.startsWith('/documents')) return 'documents';
  if (path.startsWith('/settings')) return 'settings';
  return 'customers';
});

function handleMenuSelect(key: string) {
  router.push(`/${key}`);
}
</script>

<template>
  <NLayoutSider bordered :width="200" :native-scrollbar="false" content-style="padding: 8px;">
    <NSpace vertical :size="16">
      <NSpace justify="center" :size="0">
        <NText strong style="font-size: 18px">CRM Local</NText>
      </NSpace>
      <NMenu :value="activeKey" :options="menuOptions" @update:value="handleMenuSelect" />
    </NSpace>
  </NLayoutSider>
</template>
