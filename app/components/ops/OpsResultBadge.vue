<script setup lang="ts">
import type { JournalResult } from '~/types/api'
import { JOURNAL_RESULT } from '~/composables/useOps'

// Journal result as a soft badge: icon plus word, never colour alone.
const props = defineProps<{ result: JournalResult | string }>()
const { t } = useT()

const known = computed(() => (props.result in JOURNAL_RESULT ? props.result as JournalResult : null))
</script>

<template>
  <UBadge
    v-if="known"
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
