<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { RouteLocationRaw } from 'vue-router'
import type { ExportFormat, PageDetail } from '~/types/api'
import { confPercent, leafNavLabels } from '~/composables/useViewer'
import { langLabel } from '~/composables/useT'
import { PAGE_STATUS, reviewStatus } from '~/utils/status'
import { parseShifr } from '~/utils/shifr'

// The page-context band, calm version (Stage 11c, 2026-11-12). Users are archive staff with little IT background:
// one line names the page (compact шифр, title, years, leaf navigation); one line says what needs doing
// («Слов для проверки: N») and offers one primary action. Language, status and engine are folded under
// «Подробнее»; export and re-OCR under «Ещё ⋯». The mean, meter, threshold and legend show in Правка only.
const props = defineProps<{
  page: PageDetail
  threshold: number
  lowCount: number
  canReview: boolean
  canRetry: boolean
  reviewing: boolean
  retrying: boolean
  /** Правка mode (EDITORS only): the full confidence strip with mean, meter, threshold and legend. */
  editable?: boolean
  /** Query kept on prev/next (mode, hl, fz). */
  navQuery: Record<string, string>
}>()

const emit = defineEmits<{
  export: [fmt: ExportFormat]
  reviewed: []
  retry: []
}>()

const { t } = useT()
const leafNav = computed(() => leafNavLabels(props.page))

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
const showRetry = computed(() => props.canRetry && done.value)
/** «Ещё ⋯»: export formats (everyone, done pages), then «Распознать заново» (STAFF). Not rendered when empty. */
const moreItems = computed<DropdownMenuItem[][]>(() => {
  if (!done.value) return []
  const groups: DropdownMenuItem[][] = [[
    { type: 'label', label: t('viewer.export.group') },
    ...FORMATS.map(fmt => ({
      label: t(`viewer.export.${fmt}`),
      icon: fmt === 'pdf' ? 'i-lucide-file-text' : 'i-lucide-file-down',
      onSelect: () => emit('export', fmt),
    })),
  ]]
  if (showRetry.value) {
    groups.push([{
      label: t('viewer.retry.action'),
      icon: 'i-lucide-refresh-cw',
      disabled: props.retrying,
      onSelect: () => emit('retry'),
    }])
  }
  return groups
})

const mean = computed(() => props.page.mean_conf)
const meterWidth = computed(() => `${Math.max(0, Math.min(100, mean.value ?? 0))}%`)
const total = computed(() => props.page.words.length)
</script>

<template>
  <section
    class="rounded-lg bg-default ring-1 ring-default"
    :aria-label="t('viewer.context.label')"
  >
    <div class="flex flex-col gap-2 px-4 pt-3 pb-3 sm:px-5">
      <!-- Line 1: which page this is. -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ShifrPlate
          v-if="shifr"
          :shifr="shifr"
          variant="compact"
          :to="`/dela/${page.delo_id}`"
          class="font-plate text-lg/7 font-semibold tracking-[0.02em]"
        />
        <h1
          class="min-w-0 flex-1 basis-64 text-[22px]/7 font-semibold text-highlighted"
          dir="auto"
        >
          {{ page.delo.title }}
          <YearChip
            :years="page.delo.years"
            class="ms-2 align-[3px]"
          />
          <UBadge
            v-if="canReview && page.delo.access === 'restricted'"
            color="neutral"
            variant="soft"
            icon="i-lucide-lock"
            :label="t('access.restricted')"
            class="ms-2 align-[3px]"
          />
        </h1>
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
            :label="leafNav.prev ?? undefined"
            :aria-label="page.prev_leaf != null ? t('viewer.context.prevLeaf', { leaf: page.prev_leaf }) : t('viewer.context.prev')"
          />
          <UButton
            v-else
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="outline"
            disabled
            :aria-label="t('viewer.context.prev')"
          />
          <span class="min-w-16 text-center text-base font-semibold text-highlighted tabular-nums">
            <span aria-hidden="true">{{ t('viewer.context.position', { position: page.position, count: page.count }) }}</span>
            <span class="sr-only">{{ t('viewer.context.positionAria', { position: page.position, count: page.count }) }}</span>
          </span>
          <UButton
            v-if="page.next_id !== null"
            :to="pageLink(page.next_id)"
            :icon="leafNav.next ? undefined : 'i-lucide-chevron-right'"
            :trailing-icon="leafNav.next ? 'i-lucide-chevron-right' : undefined"
            color="neutral"
            variant="outline"
            :label="leafNav.next ?? undefined"
            :aria-label="page.next_leaf != null ? t('viewer.context.nextLeaf', { leaf: page.next_leaf }) : t('viewer.context.next')"
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

      <!-- Line 2: what needs doing, details folded away, one primary action. -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p
          v-if="done"
          class="flex items-center gap-2 text-base text-default"
          data-testid="viewer-to-check"
        >
          <template v-if="lowCount > 0">
            <span
              class="legend-swatch legend-swatch--low"
              aria-hidden="true"
            />
            <span class="tabular-nums">{{ t('viewer.confidence.toCheck', { count: lowCount }) }}</span>
          </template>
          <template v-else>
            <UIcon
              name="i-lucide-check"
              class="size-4 text-muted"
              aria-hidden="true"
            />
            <span>{{ t('viewer.confidence.allSure') }}</span>
          </template>
        </p>

        <UPopover :content="{ align: 'start' }">
          <UButton
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
            :label="t('viewer.context.details')"
            data-testid="viewer-details"
            class="text-muted"
          />
          <template #content>
            <dl
              class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 p-4 text-[15px]"
              :aria-label="t('viewer.context.detailsTitle')"
              data-testid="viewer-details-panel"
            >
              <template v-if="page.lang">
                <dt class="text-muted">
                  {{ t('viewer.context.lang') }}
                </dt>
                <dd class="flex items-center gap-2 text-default">
                  <ScriptBadge :lang="page.lang" />
                  <span aria-hidden="true">{{ langLabel(page.lang, true) }}</span>
                </dd>
              </template>
              <dt class="text-muted">
                {{ t('viewer.context.status') }}
              </dt>
              <dd>
                <UBadge
                  :color="status.color"
                  variant="soft"
                  :icon="status.icon"
                  :label="t(status.label)"
                  :ui="{ leadingIcon: page.status === 'running' ? 'animate-spin motion-reduce:animate-none' : '' }"
                />
              </dd>
              <template v-if="review">
                <dt class="text-muted">
                  {{ t('viewer.context.review') }}
                </dt>
                <dd>
                  <UBadge
                    :color="review.color"
                    variant="soft"
                    :label="t(review.label)"
                  />
                </dd>
              </template>
              <template v-if="engine">
                <dt class="text-muted">
                  {{ t('viewer.context.engineLabel') }}
                </dt>
                <dd class="text-default">
                  {{ engine }}
                </dd>
              </template>
            </dl>
          </template>
        </UPopover>

        <div
          class="ms-auto flex flex-wrap items-center gap-2"
          role="group"
          :aria-label="t('viewer.context.actions')"
        >
          <UDropdownMenu
            v-if="moreItems.length"
            :items="moreItems"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-ellipsis"
              :loading="retrying"
              :label="t('viewer.context.more')"
              :aria-label="showRetry ? t('viewer.context.moreAria') : t('viewer.context.moreExportOnly')"
              data-testid="viewer-more"
            />
          </UDropdownMenu>
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

    <!-- Правка only: the full confidence strip. -->
    <div
      v-if="done && editable"
      class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-default px-4 py-2.5 text-sm sm:px-5"
      data-testid="viewer-confidence-strip"
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
  flex-shrink: 0;
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
