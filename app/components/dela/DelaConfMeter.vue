<script setup lang="ts">
import { delaConf } from '~/composables/useCases'

// Mean-confidence meter (spec 2 §Colour roles «Confidence meter»): slate-700 on slate-200, warning only when the
// backend flagged the page low_conf = 1. The number is always printed, so colour is never the only cue.
const props = withDefaults(defineProps<{
  conf: number | null
  /** The page's low_conf flag from the backend; the UI never recomputes it. */
  low?: boolean
}>(), { low: false })

const { t } = useT()
const value = computed(() => delaConf(props.conf))
const width = computed(() => `${Math.max(0, Math.min(100, props.conf ?? 0))}%`)
</script>

<template>
  <span
    v-if="value !== null"
    role="meter"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="conf ?? 0"
    :aria-label="t('dela.meter.aria', { conf: value })"
    class="inline-flex items-center gap-2"
  >
    <span
      class="relative h-1.5 w-16 overflow-hidden rounded-full bg-meter-track"
      aria-hidden="true"
    >
      <span
        class="absolute inset-y-0 start-0 rounded-full"
        :class="low ? 'bg-warning' : 'bg-meter'"
        :style="{ width }"
      />
    </span>
    <span
      class="text-sm tabular-nums"
      :class="low ? 'font-medium text-warning' : 'text-default'"
      aria-hidden="true"
    >{{ t('dela.card.conf', { conf: value }) }}</span>
  </span>
  <span
    v-else
    class="text-dimmed"
  >{{ t('dela.meter.none') }}</span>
</template>
