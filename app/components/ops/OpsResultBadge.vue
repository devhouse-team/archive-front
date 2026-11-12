<script setup lang="ts">
import type { JournalResult } from '~/types/api'
import { JOURNAL_RESULT } from '~/composables/useOps'

// Journal result. Success is the normal case, so it stays quiet (muted check plus word); only errors and other
// results get a soft badge, so the red rows stand out in a long list. Icon plus word, never colour alone.
const props = defineProps<{ result: JournalResult | string }>()
const { t } = useT()

const known = computed(() => (props.result in JOURNAL_RESULT ? props.result as JournalResult : null))
</script>

<template>
  <span
    v-if="known === 'ok'"
    class="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted"
  >
    <UIcon
      :name="JOURNAL_RESULT.ok.icon"
      class="size-4 shrink-0"
      aria-hidden="true"
    />
    {{ t('journal.results.ok') }}
  </span>
  <UBadge
    v-else-if="known"
    variant="soft"
    :color="JOURNAL_RESULT[known].color"
    :icon="JOURNAL_RESULT[known].icon"
    :label="t(`journal.results.${known}`)"
  />
  <UBadge
    v-else
    variant="soft"
    color="neutral"
    :label="result"
  />
</template>
