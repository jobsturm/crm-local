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
  NDatePicker,
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
  VatBreakdownDto,
  AgingBucketDto,
} from '@crm-local/shared';
import * as api from '@/api/client';
import type { DatePreset } from '@/api/client';

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
const selectedPreset = ref<DatePreset>(getCurrentQuarter());
const selectedYear = ref(new Date().getFullYear());
const customDateRange = ref<[number, number] | null>(null);

// Get current quarter
function getCurrentQuarter(): DatePreset {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

// Preset options
const presetOptions = computed<SelectOption[]>(() => [
  { label: t('financial.presets.q1', { year: selectedYear.value }), value: 'Q1' },
  { label: t('financial.presets.q2', { year: selectedYear.value }), value: 'Q2' },
  { label: t('financial.presets.q3', { year: selectedYear.value }), value: 'Q3' },
  { label: t('financial.presets.q4', { year: selectedYear.value }), value: 'Q4' },
  { label: t('financial.presets.thisYear'), value: 'thisYear' },
  { label: t('financial.presets.yearToDate'), value: 'yearToDate' },
  { label: t('financial.presets.allTime'), value: 'allTime' },
  { label: t('financial.presets.custom'), value: 'custom' },
]);

// Year options for year selector
const yearOptions = computed<SelectOption[]>(() => {
  const currentYear = new Date().getFullYear();
  const years: SelectOption[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ label: String(y), value: y });
  }
  return years;
});

// Check if we need to show year selector (for quarter presets)
const showYearSelector = computed(() => 
  ['Q1', 'Q2', 'Q3', 'Q4'].includes(selectedPreset.value)
);

// Check if we need to show custom date picker
const showCustomDatePicker = computed(() => selectedPreset.value === 'custom');

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
    const params: api.FinancialOverviewParams = {
      preset: selectedPreset.value,
      year: selectedYear.value,
    };
    
    // Add custom date range if selected
    if (selectedPreset.value === 'custom' && customDateRange.value) {
      params.startDate = new Date(customDateRange.value[0]).toISOString();
      params.endDate = new Date(customDateRange.value[1]).toISOString();
    }
    
    overview.value = await api.getFinancialOverview(params);
  } catch {
    overview.value = null;
  } finally {
    loading.value = false;
  }
}

// Watch for filter changes
watch([selectedPreset, selectedYear, customDateRange], () => {
  // Only load if we have valid custom dates or not in custom mode
  if (selectedPreset.value !== 'custom' || customDateRange.value) {
    void loadData();
  }
});

onMounted(() => {
  void loadData();
});

// Get the chart title based on granularity
const revenueChartTitle = computed(() => {
  if (!overview.value) return t('financial.quarterlyRevenue');
  const granularity = overview.value.timeSeriesGranularity;
  switch (granularity) {
    case 'day': return t('financial.dailyRevenue');
    case 'week': return t('financial.weeklyRevenue');
    default: return t('financial.monthlyRevenue');
  }
});

// Chart options - uses timeSeriesRevenue with dynamic granularity
const revenueChartOptions = computed(() => {
  if (!overview.value) return {};
  
  const timeSeries = overview.value.timeSeriesRevenue;
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number; seriesName: string }>) => {
        const label = params[0]?.name ?? '';
        let html = `<strong>${label}</strong><br/>`;
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
      data: timeSeries.map((d) => d.label),
      axisLabel: {
        // Rotate labels if there are many data points
        rotate: timeSeries.length > 12 ? 45 : 0,
        interval: timeSeries.length > 31 ? 'auto' : 0,
      },
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
        data: timeSeries.map((d) => d.revenue),
        itemStyle: { color: '#18a058' },
      },
      {
        name: t('financial.vat'),
        type: 'bar',
        data: timeSeries.map((d) => d.vatAmount),
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
        <NSpace :size="12" align="center">
          <NSelect
            v-model:value="selectedPreset"
            :options="presetOptions"
            style="width: 180px"
          />
          <NSelect
            v-if="showYearSelector"
            v-model:value="selectedYear"
            :options="yearOptions"
            style="width: 100px"
          />
          <NDatePicker
            v-if="showCustomDatePicker"
            v-model:value="customDateRange"
            type="daterange"
            clearable
            :placeholder="t('financial.selectDateRange')"
            style="width: 280px"
          />
        </NSpace>
      </NSpace>
      <NText depth="3">{{ t('financial.subtitle') }}</NText>
    </NSpace>

    <NSpin :show="loading">
      <NSpace v-if="overview" vertical :size="24">
        <!-- Key Metrics -->
        <NGrid :cols="5" :x-gap="16" :y-gap="16">
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
              <NStatistic :label="t('financial.totalIncludingVat')" :value="formatCurrency(overview.quarterSummary.totalRevenue + overview.quarterSummary.totalVat)" />
              <NText depth="3" style="font-size: 12px">{{ t('financial.totalIncludingVatHelp') }}</NText>
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

        <!-- Revenue Chart (day/week/month based on date range) -->
        <NCard :title="revenueChartTitle">
          <template #header-extra>
            <NText depth="3" style="font-size: 12px">{{ t('financial.revenueChartDescription') }}</NText>
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
                <NSpace vertical :size="8">
                  <NSpace justify="space-between">
                    <NText strong>{{ t('financial.totalRevenueLabel') }}</NText>
                    <NText strong>{{ formatCurrency(overview.quarterSummary.totalRevenue) }}</NText>
                  </NSpace>
                  <NSpace justify="space-between">
                    <NText strong>{{ t('financial.totalVatLabel') }}</NText>
                    <NText strong>{{ formatCurrency(overview.quarterSummary.totalVat) }}</NText>
                  </NSpace>
                  <NDivider style="margin: 4px 0" />
                  <NSpace justify="space-between">
                    <NText strong>{{ t('financial.grandTotalLabel') }}</NText>
                    <NText strong>{{ formatCurrency(overview.quarterSummary.totalRevenue + overview.quarterSummary.totalVat) }}</NText>
                  </NSpace>
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
      </NSpace>

      <NCard v-else-if="!loading">
        <NText>{{ t('financial.noData') }}</NText>
      </NCard>
    </NSpin>
  </NSpace>
</template>
