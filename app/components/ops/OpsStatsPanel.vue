<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { StatsRow } from '~/types/api'
import { errorText, periodLabel } from '~/composables/useOps'

// Stats from /api/m1/stats (handoff §5.2): three small multiples with a day/month switch and a table view.
type Period = 'day' | 'month'

const { t } = useT()
const api = useApi()

const period = ref<Period>('day')
const showTable = ref(false)
const rows = ref<StatsRow[] | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let seq = 0

async function load() {
  const mine = ++seq
  loading.value = true
  error.value = null
  try {
    // 'background': a failure stays inside this panel instead of replacing the whole screen.
    const data = await api.request<StatsRow[]>('/api/m1/stats', { query: { period: period.value }, errorMode: 'background' })
    if (mine === seq) rows.value = data
  }
  catch (e) {
    if (mine === seq) error.value = errorText(e) ?? t('ops.stats.loadError')
  }
  finally {
    if (mine === seq) loading.value = false
  }
}

watch(period, load)
onMounted(load)

// The API answers newest first; charts read left to right in time.
const ordered = computed(() => [...(rows.value ?? [])].sort((a, b) => a.period.localeCompare(b.period)))
const isEmpty = computed(() => ordered.value.every(r => !r.uploaded && !r.errors && !r.pages))

const series = computed(() => (['uploaded', 'pages', 'errors'] as const).map(key => ({
  key,
  title: t(`ops.stats.${key}`),
  tone: key === 'errors' ? 'error' as const : 'meter' as const,
  rows: ordered.value.map(r => ({ period: r.period, label: periodLabel(r.period), value: r[key] })),
})))

const periodItems = computed(() => [
  { label: t('ops.stats.day'), value: 'day' },
  { label: t('ops.stats.month'), value: 'month' },
])

const columns = computed<TableColumn<StatsRow>[]>(() => [
  { accessorKey: 'period', header: t('ops.stats.period'), cell: ({ row }) => periodLabel(row.original.period) },
  { accessorKey: 'uploaded', header: t('ops.stats.uploaded') },
  { accessorKey: 'pages', header: t('ops.stats.pages') },
  { accessorKey: 'errors', header: t('ops.stats.errors') },
])
const tableUi = { th: 'bg-elevated py-2.5', td: 'py-2.5 tabular-nums text-default' }
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-lg bg-default p-5"
    aria-labelledby="ops-stats-title"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2
        id="ops-stats-title"
        class="text-lg font-semibold text-highlighted"
      >
        {{ t('ops.stats.title') }}
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <UTabs
          v-model="period"
          :items="periodItems"
          :content="false"
          :aria-label="t('ops.stats.periodLabel')"
          color="neutral"
        />
        <UButton
          color="neutral"
          variant="outline"
          :icon="showTable ? 'i-lucide-chart-column' : 'i-lucide-table'"
          :label="showTable ? t('ops.stats.showChart') : t('ops.stats.showTable')"
          :aria-pressed="showTable"
          @click="showTable = !showTable"
        />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="error"
      :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: load }]"
    />
    <div
      v-else-if="loading && !rows"
      class="grid gap-6 md:grid-cols-3"
      :aria-label="t('state.loading')"
      role="status"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-44"
      />
    </div>
    <p
      v-else-if="isEmpty"
      class="py-6 text-sm text-muted"
    >
      {{ t('ops.stats.empty') }}
    </p>
    <UTable
      v-else-if="showTable"
      :data="ordered"
      :columns="columns"
      :ui="tableUi"
      :caption="t('ops.stats.title')"
    />
    <div
      v-else
      class="grid gap-6 md:grid-cols-3"
      :class="loading ? 'opacity-60' : ''"
    >
      <OpsColumnChart
        v-for="s in series"
        :key="s.key"
        :title="s.title"
        :rows="s.rows"
        :tone="s.tone"
      />
    </div>
  </section>
</template>
