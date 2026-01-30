<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NSpin,
  NText,
  NAlert,
  NSwitch,
  useMessage,
  useDialog,
} from 'naive-ui';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/client';

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useSettingsStore();

const loading = ref(false);
const currentStoragePath = ref('');
const newStoragePath = ref('');
const deleteOldData = ref(false);
const changingStoragePath = ref(false);
const hasElectron = ref(false);

async function browseForDirectory() {
  if (!window.electronAPI?.selectDirectory) {
    message.warning(t('settings.storage.noBrowseSupport'));
    return;
  }

  try {
    const result = await window.electronAPI.selectDirectory({
      title: t('settings.storage.selectDirectoryTitle'),
      defaultPath: currentStoragePath.value,
    });

    if (!result.canceled && result.filePath) {
      newStoragePath.value = result.filePath;
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.storage.browseFailed'));
  }
}

async function handleChangeStoragePath() {
  if (!newStoragePath.value || newStoragePath.value === currentStoragePath.value) {
    message.warning(t('settings.storage.samePathWarning'));
    return;
  }

  dialog.warning({
    title: t('settings.storage.confirmTitle'),
    content: deleteOldData.value
      ? t('settings.storage.confirmMoveContent')
      : t('settings.storage.confirmCopyContent'),
    positiveText: t('confirm'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      changingStoragePath.value = true;
      try {
        const result = await api.changeStoragePath(newStoragePath.value, deleteOldData.value);
        if (result.success) {
          currentStoragePath.value = result.storagePath;
          message.success(result.message ?? t('settings.storage.changed'));
        } else {
          message.error(result.message ?? t('settings.storage.changeFailed'));
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : t('settings.storage.changeFailed'));
      } finally {
        changingStoragePath.value = false;
      }
    },
  });
}

async function loadData() {
  loading.value = true;
  try {
    await store.fetchSettings();
    if (store.settings) {
      currentStoragePath.value = store.settings.storagePath;
      newStoragePath.value = store.settings.storagePath;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadData();
  hasElectron.value = !!window.electronAPI;
});
</script>

<template>
  <NSpace vertical :size="16">
    <NText tag="h1" style="margin: 0;">{{ t('generalSettings.title') }}</NText>

    <NSpin :show="loading">
      <NCard :title="t('settings.storage.infoTitle')">
        <NSpace vertical :size="16">
          <NAlert type="info">
            {{ t('settings.storage.infoDescription') }}
          </NAlert>

          <NFormItem :label="t('settings.storage.currentPath')">
            <NInput :value="currentStoragePath" readonly />
          </NFormItem>

          <NFormItem :label="t('settings.storage.newPath')">
            <NSpace :size="8" :wrap="false">
              <NInput
                v-model:value="newStoragePath"
                :placeholder="t('settings.storage.newPathPlaceholder')"
                style="flex: 1"
              />
              <NButton v-if="hasElectron" @click="browseForDirectory">
                {{ t('settings.storage.browse') }}
              </NButton>
            </NSpace>
          </NFormItem>

          <NSpace align="center">
            <NSwitch v-model:value="deleteOldData" />
            <NText>{{ t('settings.storage.deleteOldData') }}</NText>
          </NSpace>

          <NAlert v-if="deleteOldData" type="warning">
            {{ t('settings.storage.deleteWarning') }}
          </NAlert>

          <NSpace justify="end">
            <NButton
              type="primary"
              :loading="changingStoragePath"
              :disabled="!newStoragePath || newStoragePath === currentStoragePath"
              @click="handleChangeStoragePath"
            >
              {{ t('settings.storage.changeButton') }}
            </NButton>
          </NSpace>
        </NSpace>
      </NCard>
    </NSpin>
  </NSpace>
</template>
