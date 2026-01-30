<script setup lang="ts">
import { onMounted } from 'vue';
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutContent,
  NSpace,
  NSpin,
} from 'naive-ui';
import AppSidebar from '@/components/AppSidebar/AppSidebar.vue';
import UpdateNotification from '@/components/UpdateNotification/UpdateNotification.vue';
import OnboardingView from '@/views/OnboardingView/OnboardingView.vue';
import { useTheme } from '@/composables/useTheme';
import { useOnboarding } from '@/composables/useOnboarding';

const { naiveTheme } = useTheme();
const { needsOnboarding, isLoading, checkOnboardingStatus, completeOnboarding } = useOnboarding();

onMounted(async () => {
  await checkOnboardingStatus();
});

function handleOnboardingComplete() {
  completeOnboarding();
}
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <NDialogProvider>
        <!-- Loading state -->
        <div v-if="isLoading" class="loading-container">
          <NSpin size="large" />
        </div>

        <!-- Onboarding -->
        <OnboardingView
          v-else-if="needsOnboarding"
          @complete="handleOnboardingComplete"
        />

        <!-- Main App -->
        <NLayout v-else has-sider position="absolute">
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

<style scoped>
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--n-color);
}
</style>
