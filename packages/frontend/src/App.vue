<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutContent,
  NSpace,
} from 'naive-ui';
import AppSidebar from '@/components/AppSidebar/AppSidebar.vue';
import UpdateNotification from '@/components/UpdateNotification/UpdateNotification.vue';
import { useTheme } from '@/composables/useTheme';

const { naiveTheme } = useTheme();
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <NDialogProvider>
        <NLayout has-sider position="absolute">
          <AppSidebar />
          <NLayoutContent content-style="padding: 24px;">
            <NSpace vertical :size="16">
              <UpdateNotification />
              <RouterView />
            </NSpace>
          </NLayoutContent>
        </NLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
