import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  SettingsDto,
  BusinessDto,
  UpdateSettingsDto,
  UpdateBusinessDto,
} from '@crm-local/shared';
import * as api from '@/api/client';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SettingsDto | null>(null);
  const business = ref<BusinessDto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSettings(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      settings.value = await api.getSettings();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch settings';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(data: UpdateSettingsDto): Promise<SettingsDto> {
    const updated = await api.updateSettings(data);
    settings.value = updated;
    return updated;
  }

  async function fetchBusiness(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      business.value = await api.getBusiness();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch business';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateBusiness(data: UpdateBusinessDto): Promise<BusinessDto> {
    const updated = await api.updateBusiness(data);
    business.value = updated;
    return updated;
  }

  return {
    settings,
    business,
    loading,
    error,
    fetchSettings,
    updateSettings,
    fetchBusiness,
    updateBusiness,
  };
});
