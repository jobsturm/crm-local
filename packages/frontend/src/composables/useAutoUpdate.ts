/**
 * Auto-Update Composable
 *
 * Handles checking for updates, downloading, and installing via Electron.
 * Falls back gracefully when running in browser mode.
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

// Helper to get the electron API safely
function getElectronAPI() {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

export function useAutoUpdate() {
  const status = ref<UpdateStatus>('idle');
  const updateInfo = ref<UpdateInfo | null>(null);
  const progress = ref<UpdateProgress | null>(null);
  const error = ref<string | null>(null);
  const currentVersion = ref<string>('1.0.0');

  const isElectron = computed(() => !!getElectronAPI());
  const hasUpdate = computed(() => status.value === 'available' || status.value === 'downloaded');
  const isDownloading = computed(() => status.value === 'downloading');
  const isReadyToInstall = computed(() => status.value === 'downloaded');

  // Event handlers
  const handleChecking = () => {
    status.value = 'checking';
    error.value = null;
  };

  const handleAvailable = (data: unknown) => {
    status.value = 'available';
    const info = data as { version: string; releaseNotes?: string; releaseDate?: string };
    updateInfo.value = info;
  };

  const handleNotAvailable = () => {
    status.value = 'not-available';
  };

  const handleProgress = (data: unknown) => {
    status.value = 'downloading';
    progress.value = data as UpdateProgress;
  };

  const handleDownloaded = (data: unknown) => {
    status.value = 'downloaded';
    const info = data as { version: string };
    updateInfo.value = { ...updateInfo.value, ...info };
    progress.value = null;
  };

  const handleError = (data: unknown) => {
    status.value = 'error';
    const err = data as { message: string };
    // Detect code signing error and provide helpful message
    if (err.message?.includes('code object is not signed') || 
        err.message?.includes('signature') ||
        err.message?.includes('Code signature')) {
      error.value = 'CODE_SIGNING_ERROR';
    } else {
      error.value = err.message;
    }
  };

  // Setup event listeners
  onMounted(async () => {
    const api = getElectronAPI();
    if (!api) return;

    // Get current version
    try {
      currentVersion.value = await api.getVersion();
    } catch {
      console.warn('Could not get app version');
    }

    // Register event listeners
    api.onUpdaterEvent('updater:checking', handleChecking);
    api.onUpdaterEvent('updater:available', handleAvailable);
    api.onUpdaterEvent('updater:not-available', handleNotAvailable);
    api.onUpdaterEvent('updater:progress', handleProgress);
    api.onUpdaterEvent('updater:downloaded', handleDownloaded);
    api.onUpdaterEvent('updater:error', handleError);
  });

  onUnmounted(() => {
    const api = getElectronAPI();
    if (!api) return;

    // Cleanup listeners
    api.removeUpdaterListener('updater:checking', handleChecking);
    api.removeUpdaterListener('updater:available', handleAvailable);
    api.removeUpdaterListener('updater:not-available', handleNotAvailable);
    api.removeUpdaterListener('updater:progress', handleProgress);
    api.removeUpdaterListener('updater:downloaded', handleDownloaded);
    api.removeUpdaterListener('updater:error', handleError);
  });

  // Actions
  async function checkForUpdates() {
    const api = getElectronAPI();
    if (!api) {
      error.value = 'Updates only available in desktop app';
      return;
    }

    status.value = 'checking';
    error.value = null;

    const result = await api.checkForUpdates();
    if (!result.success && result.error) {
      error.value = result.error;
      status.value = 'error';
    }
  }

  async function downloadUpdate() {
    const api = getElectronAPI();
    if (!api) return;

    const result = await api.downloadUpdate();
    if (!result.success && result.error) {
      error.value = result.error;
      status.value = 'error';
    }
  }

  function installUpdate() {
    const api = getElectronAPI();
    if (!api) return;

    api.installUpdate();
  }

  function dismissUpdate() {
    status.value = 'idle';
    updateInfo.value = null;
    progress.value = null;
    error.value = null;
  }

  return {
    // State
    status,
    updateInfo,
    progress,
    error,
    currentVersion,

    // Computed
    isElectron,
    hasUpdate,
    isDownloading,
    isReadyToInstall,

    // Actions
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  };
}
