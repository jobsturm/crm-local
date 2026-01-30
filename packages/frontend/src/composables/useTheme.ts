import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { darkTheme, type GlobalTheme } from 'naive-ui';
import type { ThemePreference } from '@crm-local/shared';
import { useSettingsStore } from '@/stores/settings';

// Singleton state to share across the app
const themePreference = ref<ThemePreference>('system');
const systemIsDark = ref(false);
let mediaQuery: MediaQueryList | null = null;

function handleSystemThemeChange(e: MediaQueryListEvent | MediaQueryList) {
  systemIsDark.value = e.matches;
}

export function useTheme() {
  const store = useSettingsStore();

  // Resolved theme (actual light/dark based on preference)
  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (themePreference.value === 'system') {
      return systemIsDark.value ? 'dark' : 'light';
    }
    return themePreference.value;
  });

  // Naive UI theme object
  const naiveTheme = computed<GlobalTheme | null>(() => {
    return resolvedTheme.value === 'dark' ? darkTheme : null;
  });

  // Initialize system theme detection
  function initSystemThemeDetection() {
    if (typeof window === 'undefined') return;
    
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemIsDark.value = mediaQuery.matches;
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  }

  // Clean up listener
  function cleanupSystemThemeDetection() {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }

  // Set theme preference and save to backend
  async function setThemePreference(preference: ThemePreference) {
    themePreference.value = preference;
    
    try {
      await store.updateSettings({ theme: preference });
    } catch {
      // Silently fail - theme still works locally
    }
  }

  // Sync from store when settings load
  watch(
    () => store.settings?.theme,
    (newTheme) => {
      if (newTheme) {
        themePreference.value = newTheme;
      }
    },
    { immediate: true }
  );

  // Apply theme class to document for any custom CSS
  watch(resolvedTheme, (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, { immediate: true });

  onMounted(() => {
    initSystemThemeDetection();
  });

  onUnmounted(() => {
    cleanupSystemThemeDetection();
  });

  return {
    themePreference,
    resolvedTheme,
    naiveTheme,
    setThemePreference,
    initSystemThemeDetection,
    cleanupSystemThemeDetection,
  };
}

// Initialize detection immediately for SSR-safe code
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  systemIsDark.value = mq.matches;
  mq.addEventListener('change', handleSystemThemeChange);
}
