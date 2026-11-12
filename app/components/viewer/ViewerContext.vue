<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { RouteLocationRaw } from 'vue-router'
import type { ExportFormat, PageDetail } from '~/types/api'
import { confPercent } from '~/composables/useViewer'
import { PAGE_STATUS, reviewStatus } from '~/utils/status'
import { parseShifr } from '~/utils/shifr'

// The page-context band (surface brief FIRST VIEWPORT): the address plate top-left, leaf navigation top-right;
// title, years, script and status under it; actions ending in the primary «Отметить проверенной».
// Then the confidence strip: mean, share of low words, legend.
const props = defineProps<{
  page: PageDetail
  threshold: number
  lowCount: number
  canReview: boolean
  canRetry: boolean
  reviewing: boolean
  retrying: boolean
  /** Query kept on prev/next (mode, hl, fz). */
  navQuery: Record<string, string>
}>()

const emit = defineEmits<{
  export: [fmt: ExportFormat]
  reviewed: []
  retry: []
}>()

const { t } = useT()

const shifr = computed(() => {
  const parts = parseShifr(props.page.delo.shifr)
  return parts ? { ...parts, leaf: props.page.leaf } : null
})

const status = computed(() => PAGE_STATUS[props.page.status])
const review = computed(() => reviewStatus(props.page))
const done = computed(() => props.page.status === 'done')
const engine = computed(() => {
  const e = props.page.engine
  if (!e) return null
  return e === 'tesseract' || e === 'vlm' ? t(`viewer.engines.${e}`) : e
})

const pageLink = (id: number): RouteLocationRaw => ({ path: `/page/${id}`, query: props.navQuery })

const FORMATS: ExportFormat[] = ['txt', 'json', 'hocr', 'alto', 'pdf']
const exportItems = computed<DropdownMenuItem[]>(() => FORMATS.map(fmt => ({
  label: t(`viewer.export.${fmt}`),
  icon: fmt === 'pdf' ? 'i-lucide-file-text' : 'i-lucide-file-down',
  onSelect: () => emit('export', fmt),
})))

const mean = computed(() => props.page.mean_conf)
const meterWidth = computed(() => `${Math.max(0, Math.min(100, mean.value ?? 0))}%`)
const total = computed(() => props.page.words.length)
</script>

<template>
  <section
    class="rounded-lg bg-default ring-1 ring-default"
    :aria-label="t('viewer.context.label')"
  >
    <div class="flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <ShifrPlate
          v-if="shifr"
          :shifr="shifr"
          current="leaf"
          :delo-id="page.delo_id"
        />
        <nav
          class="flex items-center gap-1"
          :aria-label="t('viewer.context.leafNav')"
        >
          <UButton
            v-if="page.prev_id !== null"
            :to="pageLink(page.prev_id)"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="outline"
            :aria-label="t('viewer.context.prev')"
          />
          <UButton
            v-else
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="outline"
            disabled
            :aria-label="t('viewer.context.prev')"
          />
          <span class="min-w-16 text-center text-sm font-semibold text-highlighted tabular-nums">
            <span aria-hidden="true">{{ t('viewer.context.position', { position: page.position, count: page.count }) }}</span>
            <span class="sr-only">{{ t('viewer.context.positionAria', { position: page.position, count: page.count }) }}</span>
          </span>
          <UButton
            v-if="page.next_id !== null"
            :to="pageLink(page.next_id)"
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="outline"
            :aria-label="t('viewer.context.next')"
          />
          <UButton
            v-else
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="outline"
            disabled
            :aria-label="t('viewer.context.next')"
          />
        </nav>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1
            class="min-w-0 text-[22px]/7 font-semibold text-highlighted"
            dir="auto"
          >
            {{ page.delo.title }}
          </h1>
          <span
            v-if="page.delo.years"
            class="text-sm text-muted tabular-nums"
          >{{ page.delo.years }}</span>
          <UBadge
            v-if="page.lang"
            color="neutral"
            variant="outline"
            class="font-plate tracking-[0.04em]"
            :label="t(`langs.${page.lang}`)"
          />
          <UBadge
            :color="status.color"
            variant="soft"
            :icon="status.icon"
            :label="t(status.label)"
            :ui="{ leadingIcon: page.status === 'running' ? 'animate-spin motion-reduce:animate-none' : '' }"
          />
          <UBadge
            v-if="review"
            :color="review.color"
            variant="soft"
            :label="t(review.label)"
          />
          <UBadge
            v-if="canReview && page.delo.access === 'restricted'"
            color="neutral"
            variant="soft"
            icon="i-lucide-lock"
            :label="t('access.restricted')"
          />
          <span
            v-if="engine"
            class="text-[13px] text-muted"
          >{{ t('viewer.context.engine', { engine }) }}</span>
        </div>

        <div
          class="flex flex-wrap items-center gap-2"
          role="group"
          :aria-label="t('viewer.context.actions')"
        >
          <UDropdownMenu
            v-if="done"
            :items="exportItems"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              trailing-icon="i-lucide-chevron-down"
              :label="t('viewer.export.label')"
            />
          </UDropdownMenu>
          <UButton
            v-if="canRetry && done"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="retrying"
            :label="t('viewer.retry.action')"
            @click="emit('retry')"
          />
          <UButton
            v-if="canReview && done"
            trailing-icon="i-lucide-arrow-right"
            :loading="reviewing"
            :label="reviewing ? t('viewer.reviewed.saving') : t('viewer.reviewed.action')"
            @click="emit('reviewed')"
          />
        </div>
      </div>
    </div>

    <div
      v-if="done"
      class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-default px-4 py-2.5 text-[13px] sm:px-5"
    >
      <div class="flex items-center gap-2">
        <span class="text-muted">{{ t('viewer.confidence.mean') }}</span>
        <b class="font-semibold text-highlighted tabular-nums">
          {{ mean === null ? t('viewer.confidence.none') : t('viewer.confidence.meanValue', { value: confPercent(mean, 1) }) }}
        </b>
        <span
          class="relative h-1.5 w-24 overflow-hidden rounded-full bg-meter-track"
          aria-hidden="true"
        >
          <span
            :class="['absolute inset-y-0 start-0 rounded-full', page.low_conf === 1 ? 'bg-warning' : 'bg-meter']"
            :style="{ width: meterWidth }"
          />
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-muted">{{ t('viewer.confidence.low') }}</span>
        <b :class="['font-semibold tabular-nums', lowCount > 0 ? 'text-warning' : 'text-highlighted']">
          {{ t('viewer.confidence.lowValue', { count: lowCount, total }) }}
        </b>
        <span class="text-muted tabular-nums">· {{ t('viewer.confidence.threshold', { value: confPercent(threshold, 1) }) }}</span>
      </div>
      <ul
        class="ms-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-muted"
        :aria-label="t('viewer.confidence.legend')"
      >
        <li class="flex items-center gap-1.5">
          <span
            class="legend-swatch legend-swatch--low"
            aria-hidden="true"
          />{{ t('viewer.confidence.legendLow', { value: confPercent(threshold, 1) }) }}
        </li>
        <li
          v-if="page.highlight_word_ids.length"
          class="flex items-center gap-1.5"
        >
          <span
            class="legend-swatch legend-swatch--hit"
            aria-hidden="true"
          />{{ t('viewer.confidence.legendHit') }}
        </li>
        <li class="flex items-center gap-1.5">
          <span
            class="legend-swatch legend-swatch--corrected"
            aria-hidden="true"
          />{{ t('viewer.confidence.legendCorrected') }}
        </li>
        <li class="flex items-center gap-1.5">
          <span
            class="legend-pin"
            aria-hidden="true"
          />{{ t('viewer.confidence.legendHere') }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.legend-swatch {
  display: inline-block;
  width: 18px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--color-ink);
  box-shadow: 0 0 0 1px var(--color-halo);
}

.legend-swatch--low {
  border-style: dashed;
  background: var(--color-lowconf-fill);
}

.legend-swatch--hit {
  border-width: 2px;
  background: var(--color-hit);
}

.legend-swatch--corrected {
  border: 0;
  box-shadow: none;
  border-bottom: 1px dotted var(--ui-border-accented);
  border-radius: 0;
}

.legend-pin {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: var(--color-locator);
  box-shadow: 0 0 0 1.5px var(--color-ink);
}
</style>
