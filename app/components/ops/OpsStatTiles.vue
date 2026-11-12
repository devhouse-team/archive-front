<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { MessageKey } from '~/composables/useT'
import type { QueueCounters } from '~/types/api'

// Count tiles for the operator panel (surface brief app-pages-ops-vue). One strip, one link per count,
// each to the screen that lists those files. A count that needs action carries an icon and a word, not colour alone.
const props = defineProps<{
  queue: QueueCounters | null
  loading: boolean
}>()

const { t } = useT()

interface Tile {
  id: string
  label: MessageKey
  value: number
  to: RouteLocationRaw
  /** Status cue when the count is above zero. */
  alert?: 'error' | 'warning'
  /** Where the link goes, when that is wider than the count (today's uploads → every uploaded file). */
  target?: MessageKey
}

const tiles = computed<Tile[]>(() => {
  const q = props.queue
  return [
    { id: 'queued', label: 'ops.tiles.queued', value: q?.files.queued ?? 0, to: { path: '/upload', query: { status: 'queued' } } },
    { id: 'retry', label: 'ops.tiles.retry', value: q?.files.retry ?? 0, to: { path: '/upload', query: { status: 'retry' } }, alert: 'warning' },
    { id: 'uploaded', label: 'ops.tiles.uploadedToday', value: q?.uploaded_today ?? 0, to: { path: '/upload', query: { status: 'uploaded' } }, target: 'ops.tiles.uploadedTarget' },
    { id: 'invalid', label: 'ops.tiles.invalid', value: q?.files.invalid ?? 0, to: '/errors', alert: 'error' },
    { id: 'ocrPending', label: 'ops.tiles.ocrPending', value: q?.ocr.pending ?? 0, to: '/dela' },
    { id: 'ocrRunning', label: 'ops.tiles.ocrRunning', value: q?.ocr.running ?? 0, to: '/dela' },
  ]
})

const ICON = { error: 'i-lucide-circle-alert', warning: 'i-lucide-rotate-cw' } as const
const nf = new Intl.NumberFormat('ru-RU')
</script>

<template>
  <nav
    :aria-label="t('ops.tiles.label')"
    class="overflow-hidden rounded-lg bg-default"
  >
    <ul class="grid grid-cols-2 gap-px bg-(--ui-border) sm:grid-cols-3 xl:grid-cols-6">
      <li
        v-for="tile in tiles"
        :key="tile.id"
        class="bg-default"
      >
        <NuxtLink
          :to="tile.to"
          class="group flex min-h-24 flex-col justify-between gap-2 px-5 py-4 transition-colors hover:bg-elevated/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          <span class="flex flex-col">
            <span class="text-sm text-muted group-hover:text-toned">{{ t(tile.label) }}</span>
            <span
              v-if="tile.target"
              class="text-xs text-muted"
            >{{ t(tile.target) }}</span>
          </span>
          <span class="flex items-baseline gap-2">
            <USkeleton
              v-if="loading && !queue"
              class="h-8 w-12"
            />
            <span
              v-else
              class="text-[28px]/8 font-semibold tabular-nums"
              :class="tile.alert && tile.value > 0 ? (tile.alert === 'error' ? 'text-error' : 'text-warning') : 'text-highlighted'"
            >{{ nf.format(tile.value) }}</span>
            <span
              v-if="tile.alert && tile.value > 0"
              class="inline-flex items-center gap-1 text-xs font-medium"
              :class="tile.alert === 'error' ? 'text-error' : 'text-warning'"
            >
              <UIcon
                :name="ICON[tile.alert]"
                class="size-3.5"
                aria-hidden="true"
              />
              {{ t('ops.tiles.needsAttention') }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
