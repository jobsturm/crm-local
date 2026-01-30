import { createI18n } from 'vue-i18n';
import { commonLabels } from './shared/common';
import { statusLabels } from './shared/status';

// Component translations
import { CustomerListViewTranslations } from '../views/CustomerListView/CustomerListView.translations';
import { CustomerDetailViewTranslations } from '../views/CustomerDetailView/CustomerDetailView.translations';
import { CustomerFormViewTranslations } from '../views/CustomerFormView/CustomerFormView.translations';
import { DocumentListViewTranslations } from '../views/DocumentListView/DocumentListView.translations';
import { DocumentDetailViewTranslations } from '../views/DocumentDetailView/DocumentDetailView.translations';
import { DocumentFormViewTranslations } from '../views/DocumentFormView/DocumentFormView.translations';
import { SettingsViewTranslations } from '../views/SettingsView/SettingsView.translations';
import { FinancialOverviewViewTranslations } from '../views/FinancialOverviewView/FinancialOverviewView.translations';
import { DashboardViewTranslations } from '../views/DashboardView/DashboardView.translations';
import { AppSidebarTranslations } from '../components/AppSidebar/AppSidebar.translations';
import { CustomerFormModalTranslations } from '../components/CustomerFormModal/CustomerFormModal.translations';

// Combine all labels with flat structure
function combineLabels(...labelObjects: Array<Record<string, Record<string, string>>>): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {
    'en-US': {},
    'nl-NL': {},
  };

  for (const labelObj of labelObjects) {
    for (const locale of ['en-US', 'nl-NL'] as const) {
      if (labelObj[locale]) {
        result[locale] = { ...result[locale], ...labelObj[locale] };
      }
    }
  }

  return result;
}

export const labels = combineLabels(
  commonLabels,
  statusLabels,
  CustomerListViewTranslations,
  CustomerDetailViewTranslations,
  CustomerFormViewTranslations,
  DocumentListViewTranslations,
  DocumentDetailViewTranslations,
  DocumentFormViewTranslations,
  SettingsViewTranslations,
  FinancialOverviewViewTranslations,
  DashboardViewTranslations,
  AppSidebarTranslations,
  CustomerFormModalTranslations
);

export type Locale = 'en-US' | 'nl-NL';

export function createI18nInstance(initialLocale: Locale = 'en-US'): ReturnType<typeof createI18n> {
  return createI18n({
    legacy: false, // Use Composition API mode
    locale: initialLocale,
    fallbackLocale: 'en-US',
    messages: labels,
  });
}

// Default instance (will be overridden in main.ts if settings are loaded)
const i18n = createI18nInstance();

export default i18n;
