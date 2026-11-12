<script setup lang="ts">
import type { LeaderGeometry } from '~/composables/useViewer'

// The leader line (spec 2 §LocatorPin and leader line): from the pin on the scan, under the word's box, along
// the gutter, to the gutter-side (left) edge of the word's row in the text pane. Gold casing around an ink core.
// Decorative: the selection itself is announced by the text pane's live region.

const props = defineProps<{
  geometry: LeaderGeometry | null
  animate: boolean
}>()

const d = computed(() => {
  const g = props.geometry
  if (!g) return ''
  const r = (n: number) => Math.round(n * 2) / 2
  return `M ${r(g.x1)} ${r(g.y1)} V ${r(g.yUnder)} H ${r(g.gx)} V ${r(g.y2)} H ${r(g.x2)}`
})
const pathStyle = computed(() => ({ d: `path('${d.value}')` }))
</script>

<template>
  <svg
    class="pointer-events-none absolute inset-0 size-full overflow-visible"
    aria-hidden="true"
    focusable="false"
  >
    <g
      v-if="geometry"
      :class="['leader', animate && 'leader--animate']"
    >
      <path
        :d="d"
        :style="pathStyle"
        fill="none"
        stroke="var(--color-locator)"
        stroke-width="3"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <path
        :d="d"
        :style="pathStyle"
        fill="none"
        stroke="var(--color-ink)"
        stroke-width="1"
        stroke-linejoin="round"
      />
      <circle
        :cx="geometry.x2"
        :cy="geometry.y2"
        r="3.5"
        fill="var(--color-locator)"
        stroke="var(--color-ink)"
        stroke-width="1.5"
      />
    </g>
  </svg>
</template>

<style scoped>
.leader--animate path {
  transition: d 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

.leader--animate circle {
  transition: cx 120ms cubic-bezier(0.16, 1, 0.3, 1), cy 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .leader--animate path,
  .leader--animate circle {
    transition: none;
  }
}
</style>
