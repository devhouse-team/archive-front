<script setup lang="ts">
import { gapsSummary, leafRanges } from '~/composables/useDelaBrowse'

// Stage 11b «Пропуски» cell: «нет» or «13 листов». The full list of missing leaves sits in a tooltip on a real
// button, so it opens on keyboard focus as well as on hover; the button's name carries the list for screen
// readers. Neutral text: amber is kept for confidence (DESIGN.md, The One Job Rule).
const props = defineProps<{ gaps: readonly number[] | null | undefined }>()
const { t } = useT()

const summary = computed(() => gapsSummary(props.gaps))
const leaves = computed(() => leafRanges(props.gaps ?? []))
</script>

<template>
  <UTooltip
    v-if="summary"
    :text="t('dela.gapsTooltip', { leaves })"
    :delay-duration="150"
    :content="{ side: 'top', align: 'start' }"
    :ui="{ content: 'h-auto max-w-80 py-1.5 text-sm', text: 'whitespace-normal tabular-nums' }"
  >
    <button
      type="button"
      class="-my-2 inline-flex min-h-9 items-center whitespace-nowrap rounded-sm text-default tabular-nums underline decoration-dotted decoration-1 underline-offset-4 hover:text-highlighted hover:decoration-solid"
      :aria-label="t('dela.gapsAria', { count: summary, leaves })"
    >
      {{ summary }}
    </button>
  </UTooltip>
  <span
    v-else
    class="text-dimmed"
  >{{ t('dela.gapsNone') }}</span>
</template>
