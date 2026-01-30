<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NSpace,
  NText,
  NGrid,
  NGridItem,
  NStatistic,
  NSpin,
  NButton,
  NTag,
  NEmpty,
  NList,
  NListItem,
  NThing,
  NDivider,
} from 'naive-ui';
import type { DashboardStatsDto } from '@crm-local/shared';
import * as api from '@/api/client';

const router = useRouter();
const { t } = useI18n();

const loading = ref(false);
const stats = ref<DashboardStatsDto | null>(null);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function loadStats(): Promise<void> {
  loading.value = true;
  try {
    stats.value = await api.getDashboardStats();
  } catch {
    stats.value = null;
  } finally {
    loading.value = false;
  }
}

function goToInvoice(id: string): void {
  void router.push(`/documents/${id}`);
}

function goToCustomer(id: string): void {
  void router.push(`/customers/${id}`);
}

onMounted(() => {
  void loadStats();
});
</script>

<template>
  <NSpace vertical :size="24">
    <!-- Header -->
    <NSpace vertical :size="4">
      <NText tag="h1" strong style="font-size: 28px; margin: 0">
        {{ t('dashboard.welcome') }}
      </NText>
      <NText depth="3">{{ t('dashboard.subtitle') }}</NText>
    </NSpace>

    <NSpin :show="loading">
      <template v-if="stats">
        <!-- Key Metrics Row -->
        <NGrid :cols="4" :x-gap="16" :y-gap="16">
          <!-- Total Earnings All Time -->
          <NGridItem>
            <NCard>
              <NStatistic :label="t('dashboard.allTime')" :value="formatCurrency(stats.totalEarningsAllTime)" />
              <NText depth="3" style="font-size: 12px">{{ t('dashboard.totalEarnings') }}</NText>
            </NCard>
          </NGridItem>

          <!-- This Year -->
          <NGridItem>
            <NCard>
              <NStatistic :label="t('dashboard.thisYear')" :value="formatCurrency(stats.totalEarningsThisYear)" />
            </NCard>
          </NGridItem>

          <!-- This Month -->
          <NGridItem>
            <NCard>
              <NStatistic :label="t('dashboard.thisMonth')" :value="formatCurrency(stats.totalEarningsThisMonth)" />
            </NCard>
          </NGridItem>

          <!-- Outstanding -->
          <NGridItem>
            <NCard>
              <NStatistic :label="t('dashboard.outstanding')" :value="formatCurrency(stats.outstandingAmount)" />
              <NText depth="3" style="font-size: 12px">{{ t('dashboard.outstandingDescription') }}</NText>
            </NCard>
          </NGridItem>
        </NGrid>

        <!-- Quick Stats Row -->
        <NGrid :cols="5" :x-gap="16" :y-gap="16" style="margin-top: 16px">
          <NGridItem>
            <NCard size="small">
              <NStatistic :label="t('dashboard.customers')" :value="stats.totalCustomers" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small">
              <NStatistic :label="t('dashboard.invoices')" :value="stats.totalInvoices" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small">
              <NStatistic :label="t('dashboard.offers')" :value="stats.totalOffers" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small">
              <NStatistic :label="t('dashboard.avgInvoice')" :value="formatCurrency(stats.averageInvoiceValue)" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small" :style="stats.overdueCount > 0 ? 'border-color: #d03050' : ''">
              <NStatistic :label="t('dashboard.overdue')">
                <NText :type="stats.overdueCount > 0 ? 'error' : 'success'">{{ stats.overdueCount }}</NText>
              </NStatistic>
            </NCard>
          </NGridItem>
        </NGrid>

        <NDivider />

        <!-- Main Content Grid -->
        <NGrid :cols="2" :x-gap="24" :y-gap="24">
          <!-- Overdue Invoices -->
          <NGridItem>
            <NCard :title="t('dashboard.overdueInvoices')">
              <template #header-extra>
                <NTag v-if="stats.overdueCount > 0" type="error" size="small">
                  {{ stats.overdueCount }}
                </NTag>
              </template>
              <NSpace vertical :size="12">
                <NText depth="3">{{ t('dashboard.overdueInvoicesDescription') }}</NText>
                <NList v-if="stats.overdueInvoices.length > 0" bordered>
                  <NListItem v-for="inv in stats.overdueInvoices" :key="inv.id">
                    <NThing>
                      <template #header>
                        <NSpace align="center" :size="8">
                          <NText strong>{{ inv.documentNumber }}</NText>
                          <NTag type="error" size="small">
                            {{ t('dashboard.daysOverdue', { days: inv.daysOverdue }) }}
                          </NTag>
                        </NSpace>
                      </template>
                      <template #description>
                        {{ inv.customerName }}
                      </template>
                      <template #header-extra>
                        <NText strong type="error">{{ formatCurrency(inv.total) }}</NText>
                      </template>
                      <template #action>
                        <NButton size="small" @click="goToInvoice(inv.id)">
                          {{ t('dashboard.viewInvoice') }}
                        </NButton>
                      </template>
                    </NThing>
                  </NListItem>
                </NList>
                <NEmpty v-else :description="t('dashboard.noOverdue')" />
              </NSpace>
            </NCard>
          </NGridItem>

          <!-- Top Customers -->
          <NGridItem>
            <NCard :title="t('dashboard.topCustomers')">
              <NSpace vertical :size="12">
                <NText depth="3">{{ t('dashboard.topCustomersDescription') }}</NText>
                <NList v-if="stats.topCustomers.length > 0" bordered>
                  <NListItem v-for="(customer, index) in stats.topCustomers" :key="customer.id">
                    <NThing>
                      <template #avatar>
                        <NTag :type="index === 0 ? 'success' : index === 1 ? 'info' : 'default'" round>
                          #{{ index + 1 }}
                        </NTag>
                      </template>
                      <template #header>
                        <NText strong>{{ customer.name }}</NText>
                      </template>
                      <template #description>
                        <NSpace :size="8">
                          <NText v-if="customer.company" depth="3">{{ customer.company }}</NText>
                          <NTag size="small">{{ t('dashboard.invoiceCount', { count: customer.invoiceCount }) }}</NTag>
                        </NSpace>
                      </template>
                      <template #header-extra>
                        <NText strong type="success">{{ formatCurrency(customer.totalRevenue) }}</NText>
                      </template>
                      <template #action>
                        <NButton size="small" @click="goToCustomer(customer.id)">
                          {{ t('dashboard.viewCustomer') }}
                        </NButton>
                      </template>
                    </NThing>
                  </NListItem>
                </NList>
                <NEmpty v-else :description="t('dashboard.noCustomers')" />
              </NSpace>
            </NCard>
          </NGridItem>

          <!-- Top Paid Invoices -->
          <NGridItem>
            <NCard :title="t('dashboard.topInvoices')">
              <NSpace vertical :size="12">
                <NText depth="3">{{ t('dashboard.topInvoicesDescription') }}</NText>
                <NList v-if="stats.topPaidInvoices.length > 0" bordered>
                  <NListItem v-for="(inv, index) in stats.topPaidInvoices" :key="inv.id">
                    <NThing>
                      <template #avatar>
                        <NTag :type="index === 0 ? 'success' : index === 1 ? 'info' : 'default'" round>
                          #{{ index + 1 }}
                        </NTag>
                      </template>
                      <template #header>
                        <NText strong>{{ inv.documentNumber }}</NText>
                      </template>
                      <template #description>
                        <NSpace :size="8">
                          <NText>{{ inv.customerName }}</NText>
                          <NText depth="3">• {{ t('dashboard.paidOn') }} {{ formatDate(inv.paidDate) }}</NText>
                        </NSpace>
                      </template>
                      <template #header-extra>
                        <NText strong type="success">{{ formatCurrency(inv.total) }}</NText>
                      </template>
                      <template #action>
                        <NButton size="small" @click="goToInvoice(inv.id)">
                          {{ t('dashboard.viewInvoice') }}
                        </NButton>
                      </template>
                    </NThing>
                  </NListItem>
                </NList>
                <NEmpty v-else :description="t('dashboard.noInvoices')" />
              </NSpace>
            </NCard>
          </NGridItem>

          <!-- Biggest Invoice Ever -->
          <NGridItem v-if="stats.biggestInvoiceEver">
            <NCard :title="t('dashboard.biggestEver')">
              <NSpace vertical :size="16" align="center" style="padding: 24px 0">
                <NStatistic :value="formatCurrency(stats.biggestInvoiceEver.total)" />
                <NSpace vertical :size="4" align="center">
                  <NText strong>{{ stats.biggestInvoiceEver.documentNumber }}</NText>
                  <NText>{{ stats.biggestInvoiceEver.customerName }}</NText>
                  <NText depth="3">{{ t('dashboard.paidOn') }} {{ formatDate(stats.biggestInvoiceEver.paidDate) }}</NText>
                </NSpace>
                <NButton @click="goToInvoice(stats.biggestInvoiceEver.id)">
                  {{ t('dashboard.viewInvoice') }}
                </NButton>
              </NSpace>
            </NCard>
          </NGridItem>
        </NGrid>
      </template>
    </NSpin>
  </NSpace>
</template>
