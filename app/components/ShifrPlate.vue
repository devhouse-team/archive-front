<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { ShifrParts, ShifrSegment } from '~/utils/shifr'
import { formatShifr, shifrAriaLabel, shifrSegments } from '~/utils/shifr'

// Signature component (spec 2 §ShifrPlate): the archive address Ф.1 › Оп.1 › Д.15 › л.3 as enamel plates,
// or the compact inline «Ф.1 Оп.1 Д.12 · л.3». Stage 11c (2026-11-12) dropped the bilingual micro-labels
// (ҚОР · ФОНД): the short prefix already names the level. The plate.*.kk/ru strings stay in ru.ts for a
// future Kazakh UI.
const props = withDefaults(defineProps<{
  shifr: ShifrParts
  variant?: 'plate' | 'compact'
  /** The segment that is "you are here": aria-current="page" and the gold dot. */
  current?: ShifrSegment
  /** Link targets per segment. Segments without one render as plain plates. */
  links?: Partial<Record<ShifrSegment, RouteLocationRaw>>
  /** Shortcut for links.delo = /dela/:id. */
  deloId?: number | null
  /** Compact variant only: makes the whole inline шифр one link (the viewer header links it to its дело). */
  to?: RouteLocationRaw
}>(), { variant: 'plate', current: undefined, links: undefined, deloId: null, to: undefined })

const { t } = useT()
const NuxtLink = resolveComponent('NuxtLink')

const SHORT = {
  fond: 'plate.fond.short',
  opis: 'plate.opis.short',
  delo: 'plate.delo.short',
  leaf: 'plate.leaf.short',
} as const

const ariaLabel = computed(() => shifrAriaLabel(props.shifr))
const compactText = computed(() => formatShifr(props.shifr))

const segments = computed(() => shifrSegments(props.shifr).map((id) => {
  const to = props.links?.[id] ?? (id === 'delo' && props.deloId != null ? `/dela/${props.deloId}` : undefined)
  return {
    id,
    value: `${t(SHORT[id])}${props.shifr[id]}`,
    to,
    current: props.current === id,
  }
}))

// Enamel plate: civic fill, a 1 px white inner rule 3 px in from the edge.
const plateClass = [
  'relative inline-flex h-10 flex-col justify-center rounded-md bg-secondary px-3 text-white whitespace-nowrap',
  'shadow-[inset_0_0_0_3px_var(--ui-secondary),inset_0_0_0_4px_rgb(255_255_255/0.55)]',
].join(' ')
</script>

<template>
  <component
    :is="to ? NuxtLink : 'span'"
    v-if="variant === 'compact'"
    :to="to"
    :class="[
      'whitespace-nowrap text-secondary tabular-nums',
      to && 'rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    ]"
  >
    <span class="sr-only">{{ ariaLabel }}</span>
    <span aria-hidden="true">{{ compactText }}</span>
  </component>

  <div
    v-else
    role="group"
    :aria-label="ariaLabel"
    class="flex flex-wrap items-center gap-x-1 gap-y-2"
  >
    <template
      v-for="(seg, i) in segments"
      :key="seg.id"
    >
      <span
        v-if="i > 0"
        class="px-0.5 font-plate text-xl/none font-semibold text-secondary"
        aria-hidden="true"
      >›</span>
      <component
        :is="seg.to ? NuxtLink : 'span'"
        :to="seg.to"
        :aria-current="seg.current ? 'page' : undefined"
        :class="[plateClass, seg.to && 'transition-colors hover:bg-rail-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary']"
      >
        <span class="font-plate text-lg/5 font-semibold tracking-[0.02em] tabular-nums">{{ seg.value }}</span>
        <span
          v-if="seg.current"
          class="absolute -end-1 -top-1 size-2.5 rounded-full bg-locator shadow-[0_0_0_1.5px_var(--color-ink),0_0_0_3px_var(--ui-bg)]"
          aria-hidden="true"
        />
      </component>
    </template>
  </div>
</template>
