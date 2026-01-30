<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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
  NRadioGroup,
  NRadioButton,
  NIcon,
  NDivider,
  NTag,
  NProgress,
  NModal,
  useMessage,
  useDialog,
} from 'naive-ui';
import { SunnyOutline, MoonOutline, DesktopOutline, RefreshOutline, DownloadOutline, TrashOutline } from '@vicons/ionicons5';
import FlagIcon from '@/components/icons/FlagIcon.vue';
import type { ThemePreference, LanguagePreference } from '@crm-local/shared';
import { useSettingsStore } from '@/stores/settings';
import { useTheme } from '@/composables/useTheme';
import { useAutoUpdate } from '@/composables/useAutoUpdate';
import * as api from '@/api/client';

const { t, locale } = useI18n();
const message = useMessage();
const dialog = useDialog();
const store = useSettingsStore();
const { themePreference, setThemePreference, resolvedTheme } = useTheme();
const {
  status: updateStatus,
  updateInfo,
  progress: updateProgress,
  error: updateError,
  currentVersion,
  isElectron: canAutoUpdate,
  isDownloading,
  isReadyToInstall,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
} = useAutoUpdate();

const loading = ref(false);
const currentStoragePath = ref('');
const newStoragePath = ref('');
const deleteOldData = ref(false);
const changingStoragePath = ref(false);
const hasElectron = ref(false);

// Reset data state
const showResetModal = ref(false);
const resetConfirmationText = ref('');
const isResetting = ref(false);
const REQUIRED_CONFIRMATION = 'I want to reset';

// Theme options with icons
const themeOptions = computed(() => [
  { value: 'light' as ThemePreference, label: t('generalSettings.theme.light'), icon: SunnyOutline },
  { value: 'dark' as ThemePreference, label: t('generalSettings.theme.dark'), icon: MoonOutline },
  { value: 'system' as ThemePreference, label: t('generalSettings.theme.system'), icon: DesktopOutline },
]);

function handleThemeChange(value: ThemePreference) {
  void setThemePreference(value);
}

// Language options with flag codes
const languageOptions: Array<{ value: LanguagePreference; nativeLabel: string; flagCode: 'gb' | 'nl' }> = [
  { value: 'en-US', nativeLabel: 'English', flagCode: 'gb' as const },
  { value: 'nl-NL', nativeLabel: 'Nederlands', flagCode: 'nl' as const },
];

const currentLanguage = computed(() => (locale.value as LanguagePreference) || 'en-US');

async function handleLanguageChange(value: LanguagePreference) {
  locale.value = value;
  try {
    await store.updateSettings({ language: value });
  } catch {
    // Silently fail - language change still works locally
  }
}

// Sync language from settings on load
watch(
  () => store.settings?.language,
  (newLanguage) => {
    if (newLanguage && newLanguage !== locale.value) {
      locale.value = newLanguage;
    }
  },
  { immediate: true }
);

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

function openResetModal() {
  resetConfirmationText.value = '';
  showResetModal.value = true;
}

async function handleResetData() {
  if (resetConfirmationText.value !== REQUIRED_CONFIRMATION) {
    message.error(t('generalSettings.reset.invalidConfirmation'));
    return;
  }

  isResetting.value = true;
  try {
    const result = await api.resetAllData(resetConfirmationText.value);
    if (result.success) {
      message.success(t('generalSettings.reset.success'));
      showResetModal.value = false;
      // Reload the page to reflect the reset
      window.location.reload();
    } else {
      message.error(result.message);
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('generalSettings.reset.failed'));
  } finally {
    isResetting.value = false;
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
      <!-- Theme Card -->
      <NCard :title="t('generalSettings.theme.title')">
        <NSpace vertical :size="16">
          <NText depth="3">{{ t('generalSettings.theme.description') }}</NText>
          
          <NRadioGroup :value="themePreference" @update:value="handleThemeChange">
            <NSpace :size="12">
              <NRadioButton
                v-for="option in themeOptions"
                :key="option.value"
                :value="option.value"
                style="padding: 12px 20px;"
              >
                <NSpace align="center" :size="8">
                  <NIcon :component="option.icon" :size="18" />
                  <span>{{ option.label }}</span>
                </NSpace>
              </NRadioButton>
            </NSpace>
          </NRadioGroup>

          <NText v-if="themePreference === 'system'" depth="3" style="font-size: 13px;">
            {{ t('generalSettings.theme.currentlyUsing', { theme: resolvedTheme === 'dark' ? t('generalSettings.theme.dark') : t('generalSettings.theme.light') }) }}
          </NText>

          <NDivider />

          <!-- Language Section -->
          <NText strong>{{ t('generalSettings.language.title') }}</NText>
          <NText depth="3">{{ t('generalSettings.language.description') }}</NText>
          
          <NRadioGroup :value="currentLanguage" @update:value="handleLanguageChange">
            <NSpace :size="12">
              <NRadioButton
                v-for="option in languageOptions"
                :key="option.value"
                :value="option.value"
                style="padding: 12px 20px;"
              >
                <NSpace align="center" :size="8">
                  <FlagIcon :code="option.flagCode" :size="20" />
                  <span>{{ option.nativeLabel }}</span>
                </NSpace>
              </NRadioButton>
            </NSpace>
          </NRadioGroup>
        </NSpace>
      </NCard>

      <NDivider />

      <!-- Storage Card -->
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

      <NDivider />

      <!-- About Card -->
      <NCard :title="t('generalSettings.about.title')">
        <NSpace vertical :size="16">
          <NSpace justify="space-between" align="center">
            <NSpace align="center" :size="12">
              <NText strong>Simpel CRM</NText>
              <NTag size="small" type="info">v{{ currentVersion }}</NTag>
            </NSpace>
            
            <NSpace :size="8">
              <!-- Check for updates button -->
              <NButton
                v-if="canAutoUpdate && updateStatus !== 'downloading'"
                :loading="updateStatus === 'checking'"
                :disabled="updateStatus === 'checking'"
                @click="checkForUpdates"
              >
                <template #icon>
                  <NIcon :component="RefreshOutline" />
                </template>
                {{ t('generalSettings.about.checkUpdates') }}
              </NButton>
              
              <!-- Download update button -->
              <NButton
                v-if="updateStatus === 'available'"
                type="primary"
                @click="downloadUpdate"
              >
                <template #icon>
                  <NIcon :component="DownloadOutline" />
                </template>
                {{ t('generalSettings.about.download', { version: updateInfo?.version }) }}
              </NButton>
              
              <!-- Install update button -->
              <NButton
                v-if="isReadyToInstall"
                type="success"
                @click="installUpdate"
              >
                {{ t('generalSettings.about.installRestart') }}
              </NButton>
            </NSpace>
          </NSpace>

          <!-- Download progress -->
          <div v-if="isDownloading && updateProgress">
            <NText depth="3">{{ t('generalSettings.about.downloading') }}</NText>
            <NProgress
              type="line"
              :percentage="Math.round(updateProgress.percent)"
              :indicator-placement="'inside'"
              processing
            />
          </div>

          <!-- Status messages -->
          <NAlert v-if="updateStatus === 'not-available'" type="success" :bordered="false">
            {{ t('generalSettings.about.upToDate') }}
          </NAlert>
          
          <!-- Code signing error - show manual download link -->
          <NAlert v-if="updateError === 'CODE_SIGNING_ERROR'" type="warning" :bordered="false">
            <NSpace vertical :size="8">
              <NText>{{ t('generalSettings.about.codeSigningError') }}</NText>
              <NButton
                text
                type="primary"
                tag="a"
                href="https://github.com/jobsturm/crm-local/releases/latest"
                target="_blank"
              >
                {{ t('generalSettings.about.downloadManually') }}
              </NButton>
            </NSpace>
          </NAlert>
          
          <NAlert v-else-if="updateError" type="error" :bordered="false">
            {{ updateError }}
          </NAlert>

          <NAlert v-if="!canAutoUpdate" type="info" :bordered="false">
            {{ t('generalSettings.about.browserMode') }}
          </NAlert>

          <NDivider style="margin: 8px 0;" />

          <NText depth="3" style="font-size: 13px;">
            {{ t('generalSettings.about.description') }}
          </NText>
        </NSpace>
      </NCard>

      <NDivider />

      <!-- Danger Zone Card -->
      <NCard :title="t('generalSettings.reset.title')">
        <NSpace vertical :size="16">
          <NAlert type="error">
            {{ t('generalSettings.reset.warning') }}
          </NAlert>

          <NSpace justify="end">
            <NButton type="error" @click="openResetModal">
              <template #icon>
                <NIcon :component="TrashOutline" />
              </template>
              {{ t('generalSettings.reset.button') }}
            </NButton>
          </NSpace>
        </NSpace>
      </NCard>
    </NSpin>

    <!-- Reset Confirmation Modal -->
    <NModal
      v-model:show="showResetModal"
      preset="dialog"
      :title="t('generalSettings.reset.modalTitle')"
      :positive-text="t('generalSettings.reset.confirm')"
      :negative-text="t('cancel')"
      :positive-button-props="{ type: 'error', disabled: resetConfirmationText !== REQUIRED_CONFIRMATION, loading: isResetting }"
      @positive-click="handleResetData"
    >
      <NSpace vertical :size="16">
        <NText>{{ t('generalSettings.reset.modalDescription') }}</NText>
        <NAlert type="warning">
          {{ t('generalSettings.reset.modalWarning') }}
        </NAlert>
        <NFormItem :label="t('generalSettings.reset.typeToConfirm', { text: REQUIRED_CONFIRMATION })">
          <NInput
            v-model:value="resetConfirmationText"
            :placeholder="REQUIRED_CONFIRMATION"
            :status="resetConfirmationText && resetConfirmationText !== REQUIRED_CONFIRMATION ? 'error' : undefined"
          />
        </NFormItem>
      </NSpace>
    </NModal>
  </NSpace>
</template>
