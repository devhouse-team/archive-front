<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { M1File } from '~/types/api'
import { fileShifr } from '~/composables/useOps'
import { useHealthStore } from '~/stores/health'
import { formatDuration, formatTimestamp } from '~/utils/format'
import { FILE_STATUS } from '~/utils/status'

// The upload queue (/api/m1/files). Server paths (spool_path, archive_path, error_path) arrive in each row
// and are never read here: only the columns below are rendered (handoff §4).
const props = defineProps<{
  rows: M1File[] | null
  loading: boolean
  filtered: boolean
  sending: number | null
}>()
const emit = defineEmits<{ sendNow: [file: M1File] }>()

const { t } = useT()
const health = useHealthStore()

function retryCountdown(f: M1File): string | null {
  if (f.status !== 'retry' || !f.next_run_at) return null
  const left = Math.max(0, Math.ceil(f.next_run_at - health.now / 1000))
  return t('upload.retryIn', { time: formatDuration(left) })
}

const columns = computed<TableColumn<M1File>[]>(() => [
  { accessorKey: 'name', header: t('upload.cols.name') },
  { id: 'shifr', header: t('upload.cols.shifr') },
  { accessorKey: 'n_pages', header: t('upload.cols.pages'), meta: { class: { th: 'text-end', td: 'text-end tabular-nums' } } },
  { accessorKey: 'status', header: t('upload.cols.status') },
  { accessorKey: 'attempts', header: t('upload.cols.attempts'), meta: { class: { th: 'text-end', td: 'text-end tabular-nums' } } },
  { accessorKey: 'updated_at', header: t('upload.cols.updated') },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, t('upload.cols.actions')) },
])

const tableUi = {
  root: 'rounded-lg bg-default',
  th: 'bg-elevated py-2.5 text-[13px]',
  td: 'py-2 text-default',
  empty: 'py-10 text-center text-sm text-muted',
}

const emptyText = computed(() => props.filtered ? t('upload.queue.emptyFiltered') : t('upload.queue.empty'))
</script>

<template>
  <UTable
    :data="rows ?? []"
    :columns="columns"
    :loading="loading && !rows"
    :ui="tableUi"
    :caption="t('upload.queue.title')"
    :get-row-id="(row: M1File) => String(row.id)"
  >
    <template #name-cell="{ row }">
      <span class="font-medium text-highlighted">{{ row.original.name }}</span>
      <span class="ms-2 text-xs text-muted">{{ row.original.workplace }}</span>
    </template>
    <template #shifr-cell="{ row }">
      <span
        v-if="fileShifr(row.original)"
        :title="row.original.shifr_source ? t(`upload.source.${row.original.shifr_source}`) : undefined"
      >
        <ShifrPlate
          variant="compact"
          :shifr="fileShifr(row.original)!"
        />
      </span>
      <span
        v-else
        class="text-muted"
      >{{ t('upload.noShifr') }}</span>
    </template>
    <template #n_pages-cell="{ row }">
      {{ row.original.n_pages ?? '' }}
    </template>
    <template #status-cell="{ row }">
      <span class="inline-flex items-center gap-2">
        <!-- Uploaded is the normal end state: quiet, so the retry and invalid badges stand out. -->
        <span
          v-if="row.original.status === 'uploaded'"
          class="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted"
        >
          <UIcon
            name="i-lucide-check"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          {{ t(FILE_STATUS.uploaded.label) }}
        </span>
        <UBadge
          v-else
          variant="soft"
          :color="FILE_STATUS[row.original.status].color"
          :label="t(FILE_STATUS[row.original.status].label)"
        />
        <span
          v-if="retryCountdown(row.original)"
          class="text-xs text-muted tabular-nums"
        >{{ retryCountdown(row.original) }}</span>
      </span>
    </template>
    <template #attempts-cell="{ row }">
      {{ row.original.attempts ?? 0 }}
    </template>
    <template #updated_at-cell="{ row }">
      <span class="text-muted tabular-nums">{{ formatTimestamp(row.original.updated_at) }}</span>
    </template>
    <template #actions-cell="{ row }">
      <div class="flex justify-end">
        <UButton
          v-if="row.original.status === 'retry'"
          color="neutral"
          variant="outline"
          icon="i-lucide-send"
          :label="t('upload.sendNow')"
          :aria-label="t('upload.sendNowFor', { name: row.original.name })"
          :loading="sending === row.original.id"
          @click="emit('sendNow', row.original)"
        />
        <UButton
          v-else-if="row.original.status === 'invalid'"
          to="/errors"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
          :label="t('upload.toErrors')"
        />
      </div>
    </template>
    <template #loading>
      {{ t('state.loading') }}
    </template>
    <template #empty>
      {{ emptyText }}
    </template>
  </UTable>
</template>
