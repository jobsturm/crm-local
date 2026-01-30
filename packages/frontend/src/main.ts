import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import { router } from './router';
import { createI18nInstance } from './i18n';
import * as api from './api/client';
import type { Locale } from './i18n';

/**
 * Detect system language and map to supported locale
 */
function detectSystemLanguage(): Locale {
  if (typeof navigator === 'undefined') return 'en-US';
  
  // Get browser language (e.g., 'nl', 'nl-NL', 'en', 'en-US', 'en-GB')
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
  
  // Map to supported locales
  const langLower = browserLang.toLowerCase();
  
  if (langLower.startsWith('nl')) {
    return 'nl-NL';
  }
  
  // Default to English for all other languages
  return 'en-US';
}

async function initApp(): Promise<void> {
  // Load settings to get saved language preference
  let initialLanguage: Locale;
  let hasStoredLanguage = false;
  
  try {
    const settings = await api.getSettings();
    // Check if there's an explicitly saved language preference
    if (settings.language) {
      initialLanguage = settings.language;
      hasStoredLanguage = true;
    } else {
      // No saved preference, detect system language
      initialLanguage = detectSystemLanguage();
    }
  } catch {
    // If settings can't be loaded (new user), detect system language
    initialLanguage = detectSystemLanguage();
  }

  // Create i18n with initial language
  const i18n = createI18nInstance(initialLanguage);

  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(naive);
  app.use(i18n);

  // Store the detected language info for onboarding
  app.provide('hasStoredLanguage', hasStoredLanguage);
  app.provide('detectedLanguage', initialLanguage);

  app.mount('#app');
}

void initApp();
