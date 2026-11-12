<script setup lang="ts">
// The case's years as the comp's chip: civic outline, condensed face, tabular figures. Empty years render
// nothing. The accessible text says what the number is.
withDefaults(defineProps<{
  years: string
  /** The context already names the value (a «Годы» column or term): no «Годы:» prefix for screen readers. */
  labelled?: boolean
}>(), { labelled: false })
const { t } = useT()
</script>

<template>
  <span
    v-if="years"
    class="inline-flex h-6 shrink-0 items-center rounded-[5px] px-2 font-plate text-xs font-bold tracking-[0.06em] whitespace-nowrap text-secondary tabular-nums ring-[1.5px] ring-secondary ring-inset"
  >
    <template v-if="labelled">{{ years }}</template>
    <template v-else>
      <span class="sr-only">{{ t('search.result.years', { years }) }}</span>
      <span aria-hidden="true">{{ years }}</span>
    </template>
  </span>
</template>
