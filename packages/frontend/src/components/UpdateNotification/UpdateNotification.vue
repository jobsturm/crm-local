<template>
  <NAlert
    v-if="hasUpdate || isDownloading"
    :type="isReadyToInstall ? 'success' : 'info'"
    :title="alertTitle"
    closable
    @close="dismissUpdate"
  >
    <template #default>
      <NSpace vertical :size="8">
        <NText v-if="status === 'available'">
          {{ t('update.newVersionAvailable', { version: updateInfo?.version }) }}
        </NText>
        <NText v-else-if="status === 'downloading'">
          {{ t('update.downloading') }}
        </NText>
        <NText v-else-if="status === 'downloaded'">
          {{ t('update.readyToInstall', { version: updateInfo?.version }) }}
        </NText>

        <!-- Progress bar -->
        <NProgress
          v-if="isDownloading && progress"
          type="line"
          :percentage="Math.round(progress.percent)"
          :indicator-placement="'inside'"
          processing
        />

        <!-- Action buttons -->
        <NSpace :size="8">
          <NButton
            v-if="status === 'available'"
            type="primary"
            size="small"
            @click="downloadUpdate"
          >
            {{ t('update.download') }}
          </NButton>
          <NButton
            v-else-if="status === 'downloaded'"
            type="primary"
            size="small"
            @click="installUpdate"
          >
            {{ t('update.installNow') }}
          </NButton>
          <NButton
            v-if="status === 'available'"
            size="small"
            quaternary
            @click="dismissUpdate"
          >
            {{ t('update.later') }}
          </NButton>
        </NSpace>
      </NSpace>
    </template>
  </NAlert>

  <!-- Error alert -->
  <NAlert
    v-if="error"
    type="error"
    :title="t('update.error')"
    closable
    @close="dismissUpdate"
  >
    {{ error }}
  </NAlert>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NAlert, NSpace, NText, NProgress, NButton } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useAutoUpdate } from '@/composables/useAutoUpdate';

const { t } = useI18n();
const {
  status,
  updateInfo,
  progress,
  error,
  hasUpdate,
  isDownloading,
  isReadyToInstall,
  downloadUpdate,
  installUpdate,
  dismissUpdate,
} = useAutoUpdate();

const alertTitle = computed(() => {
  if (isReadyToInstall.value) return t('update.readyTitle');
  if (isDownloading.value) return t('update.downloadingTitle');
  return t('update.availableTitle');
});
</script>
