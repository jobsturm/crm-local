<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutContent,
} from 'naive-ui';
import AppSidebar from '@/components/AppSidebar/AppSidebar.vue';
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <NDialogProvider>
        <NLayout has-sider position="absolute">
          <AppSidebar />
          <NLayoutContent content-style="padding: 24px;">
            <RouterView />
          </NLayoutContent>
        </NLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
