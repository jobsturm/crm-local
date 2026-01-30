<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NButton,
  NSpace,
  NText,
  NSteps,
  NStep,
  NForm,
  NFormItem,
  NInput,
  NIcon,
  NResult,
  useMessage,
} from 'naive-ui';
import {
  BusinessOutline,
  LocationOutline,
  CardOutline,
  CheckmarkCircleOutline,
  ArrowForwardOutline,
  ArrowBackOutline,
  RocketOutline,
} from '@vicons/ionicons5';
import type { UpdateBusinessDto } from '@crm-local/shared';
import * as api from '@/api/client';

const emit = defineEmits<{
  complete: [];
}>();

const { t } = useI18n();
const message = useMessage();

const currentStep = ref(1);
const saving = ref(false);

// Form data
const businessForm = ref<UpdateBusinessDto>({
  name: '',
  address: { street: '', city: '', state: '', postalCode: '', country: '' },
  phone: '',
  email: '',
  website: '',
  taxId: '',
  chamberOfCommerce: '',
  bankDetails: { bankName: '', accountHolder: '', iban: '', bic: '' },
});

// Step validation
const isStep1Valid = computed(() => {
  return businessForm.value.name && businessForm.value.name.length > 0;
});

const isStep2Valid = computed(() => {
  const addr = businessForm.value.address;
  return addr && addr.street && addr.city && addr.postalCode && addr.country;
});

const isStep3Valid = computed(() => {
  return businessForm.value.email && businessForm.value.phone;
});

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return isStep1Valid.value;
    case 2: return isStep2Valid.value;
    case 3: return isStep3Valid.value;
    case 4: return true; // Bank details optional
    default: return false;
  }
});

function nextStep() {
  if (currentStep.value < 5) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

async function completeOnboarding() {
  saving.value = true;
  try {
    await api.updateBusiness(businessForm.value);
    message.success(t('onboarding.success'));
    emit('complete');
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('onboarding.error'));
  } finally {
    saving.value = false;
  }
}

function skipOnboarding() {
  emit('complete');
}
</script>

<template>
  <div class="onboarding-container">
    <div class="onboarding-content">
      <!-- Header -->
      <NSpace vertical align="center" :size="8" class="onboarding-header">
        <div class="logo-container">
          <NIcon :size="48" color="#18a058">
            <RocketOutline />
          </NIcon>
        </div>
        <NText tag="h1" class="welcome-title">{{ t('onboarding.welcome') }}</NText>
        <NText depth="3" class="welcome-subtitle">{{ t('onboarding.subtitle') }}</NText>
      </NSpace>

      <!-- Progress Steps -->
      <NSteps :current="currentStep" size="small" class="onboarding-steps">
        <NStep :title="t('onboarding.step1.title')">
          <template #icon>
            <NIcon><BusinessOutline /></NIcon>
          </template>
        </NStep>
        <NStep :title="t('onboarding.step2.title')">
          <template #icon>
            <NIcon><LocationOutline /></NIcon>
          </template>
        </NStep>
        <NStep :title="t('onboarding.step3.title')">
          <template #icon>
            <NIcon><BusinessOutline /></NIcon>
          </template>
        </NStep>
        <NStep :title="t('onboarding.step4.title')">
          <template #icon>
            <NIcon><CardOutline /></NIcon>
          </template>
        </NStep>
        <NStep :title="t('onboarding.step5.title')">
          <template #icon>
            <NIcon><CheckmarkCircleOutline /></NIcon>
          </template>
        </NStep>
      </NSteps>

      <!-- Step Content -->
      <NCard class="step-card">
        <!-- Step 1: Company Name -->
        <template v-if="currentStep === 1">
          <NSpace vertical :size="24">
            <NSpace vertical :size="4">
              <NText tag="h2" class="step-title">{{ t('onboarding.step1.heading') }}</NText>
              <NText depth="3">{{ t('onboarding.step1.description') }}</NText>
            </NSpace>
            <NForm label-placement="top">
              <NFormItem :label="t('onboarding.fields.companyName')" required>
                <NInput
                  v-model:value="businessForm.name"
                  :placeholder="t('onboarding.fields.companyNamePlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.taxId')">
                <NInput
                  v-model:value="businessForm.taxId"
                  :placeholder="t('onboarding.fields.taxIdPlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.chamberOfCommerce')">
                <NInput
                  v-model:value="businessForm.chamberOfCommerce"
                  :placeholder="t('onboarding.fields.chamberOfCommercePlaceholder')"
                  size="large"
                />
              </NFormItem>
            </NForm>
          </NSpace>
        </template>

        <!-- Step 2: Address -->
        <template v-if="currentStep === 2">
          <NSpace vertical :size="24">
            <NSpace vertical :size="4">
              <NText tag="h2" class="step-title">{{ t('onboarding.step2.heading') }}</NText>
              <NText depth="3">{{ t('onboarding.step2.description') }}</NText>
            </NSpace>
            <NForm label-placement="top">
              <NFormItem :label="t('onboarding.fields.street')" required>
                <NInput
                  v-model:value="businessForm.address!.street"
                  :placeholder="t('onboarding.fields.streetPlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NSpace :size="16">
                <NFormItem :label="t('onboarding.fields.postalCode')" required style="flex: 1">
                  <NInput
                    v-model:value="businessForm.address!.postalCode"
                    :placeholder="t('onboarding.fields.postalCodePlaceholder')"
                    size="large"
                  />
                </NFormItem>
                <NFormItem :label="t('onboarding.fields.city')" required style="flex: 2">
                  <NInput
                    v-model:value="businessForm.address!.city"
                    :placeholder="t('onboarding.fields.cityPlaceholder')"
                    size="large"
                  />
                </NFormItem>
              </NSpace>
              <NFormItem :label="t('onboarding.fields.country')" required>
                <NInput
                  v-model:value="businessForm.address!.country"
                  :placeholder="t('onboarding.fields.countryPlaceholder')"
                  size="large"
                />
              </NFormItem>
            </NForm>
          </NSpace>
        </template>

        <!-- Step 3: Contact -->
        <template v-if="currentStep === 3">
          <NSpace vertical :size="24">
            <NSpace vertical :size="4">
              <NText tag="h2" class="step-title">{{ t('onboarding.step3.heading') }}</NText>
              <NText depth="3">{{ t('onboarding.step3.description') }}</NText>
            </NSpace>
            <NForm label-placement="top">
              <NFormItem :label="t('onboarding.fields.email')" required>
                <NInput
                  v-model:value="businessForm.email"
                  :placeholder="t('onboarding.fields.emailPlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.phone')" required>
                <NInput
                  v-model:value="businessForm.phone"
                  :placeholder="t('onboarding.fields.phonePlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.website')">
                <NInput
                  v-model:value="businessForm.website"
                  :placeholder="t('onboarding.fields.websitePlaceholder')"
                  size="large"
                />
              </NFormItem>
            </NForm>
          </NSpace>
        </template>

        <!-- Step 4: Bank Details -->
        <template v-if="currentStep === 4">
          <NSpace vertical :size="24">
            <NSpace vertical :size="4">
              <NText tag="h2" class="step-title">{{ t('onboarding.step4.heading') }}</NText>
              <NText depth="3">{{ t('onboarding.step4.description') }}</NText>
            </NSpace>
            <NForm label-placement="top">
              <NFormItem :label="t('onboarding.fields.bankName')">
                <NInput
                  v-model:value="businessForm.bankDetails!.bankName"
                  :placeholder="t('onboarding.fields.bankNamePlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.accountHolder')">
                <NInput
                  v-model:value="businessForm.bankDetails!.accountHolder"
                  :placeholder="t('onboarding.fields.accountHolderPlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.iban')">
                <NInput
                  v-model:value="businessForm.bankDetails!.iban"
                  :placeholder="t('onboarding.fields.ibanPlaceholder')"
                  size="large"
                />
              </NFormItem>
              <NFormItem :label="t('onboarding.fields.bic')">
                <NInput
                  v-model:value="businessForm.bankDetails!.bic"
                  :placeholder="t('onboarding.fields.bicPlaceholder')"
                  size="large"
                />
              </NFormItem>
            </NForm>
          </NSpace>
        </template>

        <!-- Step 5: Complete -->
        <template v-if="currentStep === 5">
          <NResult
            status="success"
            :title="t('onboarding.step5.heading')"
            :description="t('onboarding.step5.description')"
          >
            <template #icon>
              <NIcon :size="64" color="#18a058">
                <CheckmarkCircleOutline />
              </NIcon>
            </template>
          </NResult>
        </template>

        <!-- Navigation Buttons -->
        <NSpace justify="space-between" class="step-navigation">
          <NSpace :size="12">
            <NButton
              v-if="currentStep > 1 && currentStep < 5"
              @click="prevStep"
              size="large"
            >
              <template #icon>
                <NIcon><ArrowBackOutline /></NIcon>
              </template>
              {{ t('onboarding.back') }}
            </NButton>
            <NButton
              v-if="currentStep === 1"
              text
              @click="skipOnboarding"
            >
              {{ t('onboarding.skipForNow') }}
            </NButton>
          </NSpace>
          
          <NSpace :size="12">
            <NButton
              v-if="currentStep < 5"
              type="primary"
              size="large"
              :disabled="!canProceed"
              @click="nextStep"
            >
              {{ currentStep === 4 ? t('onboarding.finish') : t('onboarding.next') }}
              <template #icon>
                <NIcon><ArrowForwardOutline /></NIcon>
              </template>
            </NButton>
            <NButton
              v-if="currentStep === 5"
              type="primary"
              size="large"
              :loading="saving"
              @click="completeOnboarding"
            >
              {{ t('onboarding.getStarted') }}
              <template #icon>
                <NIcon><RocketOutline /></NIcon>
              </template>
            </NButton>
          </NSpace>
        </NSpace>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.onboarding-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}

.onboarding-content {
  width: 100%;
  max-width: 600px;
}

.onboarding-header {
  margin-bottom: 32px;
  text-align: center;
}

.logo-container {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(24, 160, 88, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.welcome-title {
  font-size: 28px !important;
  font-weight: 700 !important;
  margin: 0 !important;
  color: #fff !important;
}

.welcome-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7) !important;
}

.onboarding-steps {
  margin-bottom: 24px;
}

.step-card {
  border-radius: 16px;
}

.step-title {
  font-size: 20px !important;
  font-weight: 600 !important;
  margin: 0 !important;
}

.step-navigation {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--n-border-color);
}
</style>
