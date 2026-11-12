<script setup lang="ts">
// One small multiple of the ops stats (dataviz: one series per chart, one axis, no dual scale).
// Columns ≤24 px, 4 px rounded data end, square at the baseline, value printed on the tallest column only.
// The chart is a picture for sighted users (role="img" + summary); the exact numbers live in the table view.
const props = defineProps<{
  title: string
  rows: { period: string, label: string, value: number }[]
  tone?: 'meter' | 'error'
}>()

const { t } = useT()
const nf = new Intl.NumberFormat('ru-RU')

const max = computed(() => Math.max(0, ...props.rows.map(r => r.value)))
const total = computed(() => props.rows.reduce((a, r) => a + r.value, 0))
const peak = computed(() => props.rows.find(r => r.value === max.value && max.value > 0) ?? null)

const summary = computed(() => peak.value
  ? t('ops.stats.summary', { series: props.title, total: nf.format(total.value), max: nf.format(max.value), period: peak.value.label })
  : t('ops.stats.summaryEmpty', { series: props.title }))

function height(v: number): string {
  if (max.value === 0 || v === 0) return '0px'
  // A non-zero value never collapses below 3 px, so it reads as "some", not "none".
  return `max(3px, ${(v / max.value) * 100}%)`
}

/** With many columns only the first and last period are labelled, so labels never truncate; the table has all. */
function showLabel(i: number): boolean {
  const n = props.rows.length
  return n <= 6 || i === 0 || i === n - 1
}

const fill = computed(() => props.tone === 'error' ? 'bg-error' : 'bg-meter')
</script>

<template>
  <figure class="flex min-w-0 flex-col gap-3">
    <figcaption class="flex flex-col gap-0.5">
      <span class="text-sm font-medium text-highlighted">{{ title }}</span>
      <span class="text-xs text-muted tabular-nums">{{ t('ops.stats.total', { total: nf.format(total) }) }}</span>
    </figcaption>
    <div
      role="img"
      :aria-label="summary"
      class="flex flex-col"
    >
      <!-- Plot: columns grow from one baseline; pt-5 leaves room for the peak label. -->
      <div class="flex h-32 items-stretch gap-1 border-b border-accented pt-5">
        <UTooltip
          v-for="row in rows"
          :key="row.period"
          :text="t('ops.stats.bar', { period: row.label, value: nf.format(row.value) })"
          :content="{ side: 'top' }"
        >
          <div
            class="relative flex min-w-0 flex-1 items-end justify-center"
            aria-hidden="true"
          >
            <div
              class="relative w-full max-w-6 rounded-t-[4px]"
              :class="fill"
              :style="{ height: height(row.value) }"
            >
              <span
                v-if="peak && row.period === peak.period"
                class="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-medium text-highlighted tabular-nums"
              >{{ nf.format(row.value) }}</span>
            </div>
          </div>
        </UTooltip>
      </div>
      <div
        class="flex gap-1 pt-1.5"
        aria-hidden="true"
      >
        <span
          v-for="(row, i) in rows"
          :key="row.period"
          class="relative h-4 min-w-0 flex-1 text-xs text-muted tabular-nums"
        ><span
          v-if="showLabel(i)"
          class="absolute top-0 whitespace-nowrap"
          :class="rows.length <= 6 ? 'inset-x-0 text-center' : i === 0 ? 'start-0' : 'end-0'"
        >{{ row.label }}</span></span>
      </div>
    </div>
  </figure>
</template>
