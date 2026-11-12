<script setup lang="ts">
import { useHealthStore } from '~/stores/health'
import { retryLabel } from '~/utils/eais'
import { formatTimestamp } from '~/utils/format'

// ЕАИС outage banner on the operator panel (handoff §4; PRODUCT principle 5: honest system state).
// State and countdown come from the health store the shell already polls; this component never polls.
// The header indicator announces online ⇄ down changes, so this banner is not a live region itself.
const props = defineProps<{
  /** Files waiting for ЕАИС: queued + retry. */
  waiting: number
}>()

const { t } = useT()
const health = useHealthStore()

const down = computed(() => health.eaisOnline === false)
const title = computed(() => {
  const since = health.data?.eais_down_since
  return since ? t('ops.banner.since', { time: formatTimestamp(since) }) : t('eais.down')
})
const description = computed(() => [
  props.waiting > 0 ? t('ops.banner.waiting', { count: props.waiting }) : '',
  retryLabel(health.retryIn) ? `${retryLabel(health.retryIn)}.` : '',
  t('ops.banner.safe'),
].filter(Boolean).join(' '))
</script>

<template>
  <UAlert
    v-if="down"
    color="error"
    variant="solid"
    icon="i-lucide-cloud-off"
    :title="title"
    :description="description"
    :ui="{ description: 'tabular-nums' }"
  />
</template>
