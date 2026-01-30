<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NCard,
  NSpace,
  NText,
  NGrid,
  NGridItem,
  NStatistic,
  NSelect,
  NSpin,
  NDataTable,
  NDivider,
  NTag,
  type SelectOption,
  type DataTableColumns,
} from 'naive-ui';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import type {
  FinancialOverviewDto,
  Quarter,
  VatBreakdownDto,
  AgingBucketDto,
} from '@crm-local/shared';
import * as api from '@/api/client';

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const { t } = useI18n();

// State
const loading = ref(false);
const overview = ref<FinancialOverviewDto | null>(null);
const selectedYear = ref(new Date().getFullYear());
const selectedQuarter = ref<Quarter>(getCurrentQuarter());

// Options
const yearOptions = computed<SelectOption[]>(() => {
  const currentYear = new Date().getFullYear();
  const years: SelectOption[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ label: String(y), value: y });
  }
  return years;
});

const quarterOptions = computed<SelectOption[]>(() => [
  { label: t('financial.q1'), value: 'Q1' },
  { label: t('financial.q2'), value: 'Q2' },
  { label: t('financial.q3'), value: 'Q3' },
  { label: t('financial.q4'), value: 'Q4' },
]);

function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// Load data
async function loadData(): Promise<void> {
  loading.value = true;
  try {
    overview.value = await api.getFinancialOverview(selectedYear.value, selectedQuarter.value);
  } catch {
    overview.value = null;
  } finally {
    loading.value = false;
  }
}

// Watch for filter changes
watch([selectedYear, selectedQuarter], () => {
  void loadData();
});

onMounted(() => {
  void loadData();
});

// Get months for the selected quarter
function getQuarterMonthRange(quarter: Quarter): [number, number, number] {
  switch (quarter) {
    case 'Q1': return [1, 2, 3];
    case 'Q2': return [4, 5, 6];
    case 'Q3': return [7, 8, 9];
    case 'Q4': return [10, 11, 12];
  }
}

// Filter monthly data to selected quarter
const quarterMonthlyRevenue = computed(() => {
  if (!overview.value) return [];
  const quarterMonths = getQuarterMonthRange(selectedQuarter.value);
  return overview.value.monthlyRevenue.filter((m) => quarterMonths.includes(m.month));
});

// Chart options
const revenueChartOptions = computed(() => {
  if (!overview.value) return {};
  
  const months = quarterMonthlyRevenue.value;
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number; seriesName: string }>) => {
        const month = params[0]?.name ?? '';
        let html = `<strong>${month}</strong><br/>`;
        params.forEach((p) => {
          html += `${p.seriesName}: ${formatCurrency(p.value)}<br/>`;
        });
        return html;
      },
    },
    legend: {
      data: [t('financial.revenue'), t('financial.vat')],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: months.map((m) => m.monthName),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => `€${(value / 1000).toFixed(0)}k`,
      },
    },
    series: [
      {
        name: t('financial.revenue'),
        type: 'bar',
        data: months.map((m) => m.revenue),
        itemStyle: { color: '#18a058' },
      },
      {
        name: t('financial.vat'),
        type: 'bar',
        data: months.map((m) => m.vatAmount),
        itemStyle: { color: '#2080f0' },
      },
    ],
  };
});

const statusPieOptions = computed(() => {
  if (!overview.value) return {};
  
  const statusData = overview.value.statusBreakdown;
  const colorMap: Record<string, string> = {
    draft: '#909399',
    sent: '#2080f0',
    paid: '#18a058',
    overdue: '#f0a020',
    cancelled: '#d03050',
    accepted: '#18a058',
    rejected: '#d03050',
  };
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => {
        return `${params.name}: ${formatCurrency(params.value)} (${params.percent.toFixed(1)}%)`;
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: statusData.map((s) => ({
          name: t(`status.${s.status}`),
          value: s.amount,
          itemStyle: { color: colorMap[s.status] ?? '#909399' },
        })),
      },
    ],
  };
});

// Table columns for VAT breakdown
const vatColumns = computed<DataTableColumns<VatBreakdownDto>>(() => [
  {
    title: t('financial.rate'),
    key: 'rate',
    render: (row) => `${String(row.rate)}%`,
  },
  {
    title: t('financial.revenueAtRate'),
    key: 'revenue',
    render: (row) => formatCurrency(row.revenue),
  },
  {
    title: t('financial.vatAtRate'),
    key: 'vatAmount',
    render: (row) => formatCurrency(row.vatAmount),
  },
]);

// Table columns for aging
const agingColumns = computed<DataTableColumns<AgingBucketDto>>(() => [
  {
    title: t('financial.agingBucket'),
    key: 'label',
  },
  {
    title: t('financial.count'),
    key: 'count',
  },
  {
    title: t('financial.amount'),
    key: 'amount',
    render: (row) => formatCurrency(row.amount),
  },
]);

</script>

<template>
  <NSpace vertical :size="24">
    <!-- Header with title and filters -->
    <NSpace vertical :size="8">
      <NSpace justify="space-between" align="center">
        <NText tag="h1" strong style="font-size: 24px; margin: 0">
          {{ t('financial.title') }}
        </NText>
        <NSpace :size="12">
          <NSelect
            v-model:value="selectedYear"
            :options="yearOptions"
            style="width: 100px"
          />
          <NSelect
            v-model:value="selectedQuarter"
            :options="quarterOptions"
            style="width: 150px"
          />
        </NSpace>
      </NSpace>
      <NText depth="3">{{ t('financial.subtitle') }}</NText>
    </NSpace>

    <NSpin :show="loading">
      <template v-if="overview">
        <!-- Key Metrics -->
        <NGrid :cols="4" :x-gap="16" :y-gap="16">
          <NGridItem>
            <NCard>
              <NStatistic :label="t('financial.totalRevenue')" :value="formatCurrency(overview.quarterSummary.totalRevenue)" />
              <NText depth="3" style="font-size: 12px">{{ t('financial.totalRevenueHelp') }}</NText>
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard>
              <NStatistic :label="t('financial.totalVat')" :value="formatCurrency(overview.quarterSummary.totalVat)" />
              <NText depth="3" style="font-size: 12px">{{ t('financial.totalVatHelp') }}</NText>
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard>
              <NStatistic :label="t('financial.invoiceCount')" :value="overview.quarterSummary.invoiceCount" />
              <NText depth="3" style="font-size: 12px">{{ t('financial.invoiceCountHelp') }}</NText>
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard>
              <NStatistic :label="t('financial.outstandingAmount')" :value="formatCurrency(overview.quarterSummary.outstandingAmount)" />
              <NSpace vertical :size="4">
                <NText v-if="overview.quarterSummary.overdueAmount > 0" type="error" style="font-size: 12px">
                  {{ t('financial.overdueAmount') }}: {{ formatCurrency(overview.quarterSummary.overdueAmount) }}
                </NText>
                <NText depth="3" style="font-size: 12px">{{ t('financial.outstandingHelp') }}</NText>
              </NSpace>
            </NCard>
          </NGridItem>
        </NGrid>

        <NDivider />

        <!-- Monthly Revenue Chart -->
        <NCard :title="t('financial.quarterlyRevenue')">
          <template #header-extra>
            <NText depth="3" style="font-size: 12px">{{ t('financial.quarterlyRevenueDescription') }}</NText>
          </template>
          <VChart :option="revenueChartOptions" style="height: 300px" autoresize />
        </NCard>

        <NGrid :cols="2" :x-gap="16" :y-gap="16">
          <!-- BTW/VAT Breakdown -->
          <NGridItem>
            <NCard :title="t('financial.btwOverview')">
              <NSpace vertical :size="16">
                <NText depth="3">
                  {{ t('financial.btwDescription') }}
                </NText>
                <NDataTable
                  :columns="vatColumns"
                  :data="overview.quarterSummary.vatBreakdown"
                  :pagination="false"
                  size="small"
                />
                <NDivider style="margin: 8px 0" />
                <NSpace justify="space-between">
                  <NText strong>{{ t('financial.totalVat') }}</NText>
                  <NText strong>{{ formatCurrency(overview.quarterSummary.totalVat) }}</NText>
                </NSpace>
              </NSpace>
            </NCard>
          </NGridItem>

          <!-- Status Breakdown Pie Chart -->
          <NGridItem>
            <NCard :title="t('financial.statusBreakdown')">
              <NSpace vertical :size="12">
                <NText depth="3">{{ t('financial.statusDescription') }}</NText>
                <VChart :option="statusPieOptions" style="height: 220px" autoresize />
              </NSpace>
            </NCard>
          </NGridItem>
        </NGrid>

        <NGrid :cols="2" :x-gap="16" :y-gap="16">
          <!-- Invoice Aging -->
          <NGridItem>
            <NCard :title="t('financial.invoiceAging')">
              <NSpace vertical :size="12">
                <NText depth="3">{{ t('financial.invoiceAgingDescription') }}</NText>
                <NDataTable
                  :columns="agingColumns"
                  :data="overview.aging"
                  :pagination="false"
                  size="small"
                />
              </NSpace>
            </NCard>
          </NGridItem>

          <!-- Year to Date Summary -->
          <NGridItem>
            <NCard :title="t('financial.ytd')">
              <NSpace vertical :size="12">
                <NText depth="3">{{ t('financial.ytdDescription') }}</NText>
                <NSpace justify="space-between">
                  <NText>{{ t('financial.ytdRevenue') }}</NText>
                  <NText strong>{{ formatCurrency(overview.ytdRevenue) }}</NText>
                </NSpace>
                <NSpace justify="space-between">
                  <NText>{{ t('financial.ytdVat') }}</NText>
                  <NText strong>{{ formatCurrency(overview.ytdVat) }}</NText>
                </NSpace>
                <NSpace justify="space-between">
                  <NText>{{ t('financial.ytdInvoices') }}</NText>
                  <NText strong>{{ overview.ytdInvoiceCount }}</NText>
                </NSpace>
                <NDivider style="margin: 8px 0" />
                <NSpace v-if="overview.previousYearComparison" justify="space-between" align="center">
                  <NText depth="3">{{ t('financial.comparison') }}</NText>
                  <NTag :type="overview.previousYearComparison.percentageChange >= 0 ? 'success' : 'error'">
                    {{ formatPercentage(overview.previousYearComparison.percentageChange) }}
                  </NTag>
                </NSpace>
              </NSpace>
            </NCard>
          </NGridItem>
        </NGrid>
      </template>

      <NCard v-else-if="!loading">
        <NText>{{ t('financial.noData') }}</NText>
      </NCard>
    </NSpin>
  </NSpace>
</template>
