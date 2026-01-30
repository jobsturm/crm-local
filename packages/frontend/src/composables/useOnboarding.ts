import { ref, computed } from 'vue';
import * as api from '@/api/client';

const hasCompletedOnboarding = ref<boolean | null>(null);
const isCheckingOnboarding = ref(false);

export function useOnboarding() {
  const needsOnboarding = computed(() => hasCompletedOnboarding.value === false);
  const isLoading = computed(() => isCheckingOnboarding.value || hasCompletedOnboarding.value === null);

  async function checkOnboardingStatus(): Promise<boolean> {
    if (hasCompletedOnboarding.value !== null) {
      return !hasCompletedOnboarding.value;
    }

    isCheckingOnboarding.value = true;
    try {
      const business = await api.getBusiness();
      // User has completed onboarding if they have a company name set
      hasCompletedOnboarding.value = !!(business && business.name && business.name.trim().length > 0);
      return !hasCompletedOnboarding.value;
    } catch (e) {
      // If we can't fetch business data, assume onboarding is needed
      console.error('Failed to check onboarding status:', e);
      hasCompletedOnboarding.value = false;
      return true;
    } finally {
      isCheckingOnboarding.value = false;
    }
  }

  function completeOnboarding() {
    hasCompletedOnboarding.value = true;
  }

  function resetOnboardingState() {
    hasCompletedOnboarding.value = null;
  }

  return {
    needsOnboarding,
    isLoading,
    checkOnboardingStatus,
    completeOnboarding,
    resetOnboardingState,
  };
}
