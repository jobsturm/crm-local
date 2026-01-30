import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import { router } from './router';
import { createI18nInstance } from './i18n';
import * as api from './api/client';
import type { Locale } from './i18n';

async function initApp(): Promise<void> {
  // Load settings to get saved language preference
  let savedLanguage: Locale = 'en-US';
  try {
    const settings = await api.getSettings();
    savedLanguage = settings.language;
  } catch {
    // If settings can't be loaded, use default
  }

  // Create i18n with saved language
  const i18n = createI18nInstance(savedLanguage);

  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(naive);
  app.use(i18n);

  app.mount('#app');
}

void initApp();
