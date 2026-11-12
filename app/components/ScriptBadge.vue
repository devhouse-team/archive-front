<script setup lang="ts">
import type { Lang } from '~/types/api'
import { langLabel } from '~/composables/useT'

// The one script badge (handoff §1: RU / KK / KK-лат / KK-араб), the comp's ink chip: condensed face, wide
// tracking. It names an attribute, not a status, so it never takes a status colour. The full name is the
// accessible text; the short code is decoration.
const props = defineProps<{ lang: Lang }>()
const full = computed(() => langLabel(props.lang, true))
</script>

<template>
  <span
    class="inline-flex h-6 shrink-0 items-center rounded-[5px] bg-ink px-2 font-plate text-xs font-bold tracking-[0.06em] whitespace-nowrap text-white tabular-nums"
    :title="full"
  >
    <span aria-hidden="true">{{ langLabel(lang) }}</span>
    <span class="sr-only">{{ full }}</span>
  </span>
</template>
