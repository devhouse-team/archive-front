<script setup lang="ts">
import type { EaisView } from '~/utils/eais'

// The visible face of the header ЕАИС indicator, shared by the reader's static status and the STAFF button.
// White text on the civic field; "down" is a solid error badge with words (spec 2 §Status mapping).
defineProps<{ view: EaisView, showProblems: boolean }>()
const { t } = useT()
</script>

<template>
  <span class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-white">
    <template v-if="view.state === 'online'">
      <span
        class="size-2 shrink-0 rounded-full bg-eais-ok shadow-[0_0_0_1.5px_var(--color-white)]"
        aria-hidden="true"
      />
      <span class="truncate">{{ view.label }}</span>
    </template>
    <UBadge
      v-else-if="view.state === 'down'"
      color="error"
      variant="solid"
      size="md"
      icon="i-lucide-cloud-off"
      :label="view.label"
      class="shrink-0"
    />
    <span
      v-else
      class="truncate text-rail-muted"
    >{{ view.label }}</span>
    <template v-if="view.state === 'down' && view.retry">
      <span class="hidden whitespace-nowrap tabular-nums sm:inline">{{ view.retry }}</span>
      <span class="whitespace-nowrap tabular-nums sm:hidden">
        <span class="sr-only">{{ view.retry }}</span>
        <span aria-hidden="true">{{ view.retryShort }}</span>
      </span>
    </template>
    <span
      v-if="showProblems && view.problems > 0"
      class="flex items-center gap-1 whitespace-nowrap"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <span class="tabular-nums">{{ t('eais.problems', { count: view.problems }) }}</span>
    </span>
  </span>
</template>
