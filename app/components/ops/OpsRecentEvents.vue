<script setup lang="ts">
import type { JournalRow } from '~/types/api'
import { baseNames, formatTimestamp } from '~/utils/format'
import { parseShifr } from '~/utils/shifr'

// The last journal rows on the operator panel. User data is rendered by interpolation only.
defineProps<{
  rows: JournalRow[] | null
  loading: boolean
  error: string | null
}>()
const emit = defineEmits<{ retry: [] }>()

const { t } = useT()
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-lg bg-default p-5"
    aria-labelledby="ops-events-title"
  >
    <div class="flex items-center justify-between gap-2">
      <h2
        id="ops-events-title"
        class="text-lg font-semibold text-highlighted"
      >
        {{ t('ops.events.title') }}
      </h2>
      <UButton
        to="/journal"
        variant="link"
        trailing-icon="i-lucide-arrow-right"
        :label="t('ops.events.all')"
      />
    </div>

    <UAlert
      v-if="error && !rows"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="error"
      :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: () => emit('retry') }]"
    />
    <div
      v-else-if="loading && !rows"
      class="flex flex-col gap-2"
      role="status"
      :aria-label="t('state.loading')"
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-10"
      />
    </div>
    <p
      v-else-if="!rows || rows.length === 0"
      class="py-6 text-sm text-muted"
    >
      {{ t('ops.events.empty') }}
    </p>
    <ol
      v-else
      class="flex flex-col divide-y divide-default"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        class="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 py-2.5 text-sm"
      >
        <time
          class="pt-0.5 text-muted tabular-nums"
          :datetime="row.ts.replace(' ', 'T')"
        >{{ formatTimestamp(row.ts) }}</time>
        <div class="min-w-0">
          <p class="text-default">
            <span class="font-medium">{{ row.actor }}</span>
            <span class="text-muted"> · </span>
            <span>{{ row.action }}</span>
          </p>
          <p
            v-if="row.file_name || row.shifr || row.details"
            class="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-muted"
          >
            <span
              v-if="row.file_name"
              class="truncate"
            >{{ baseNames(row.file_name) }}</span>
            <ShifrPlate
              v-if="parseShifr(row.shifr)"
              variant="compact"
              :shifr="parseShifr(row.shifr)!"
            />
            <span
              v-else-if="row.shifr"
              class="tabular-nums"
            >{{ row.shifr }}</span>
            <span v-if="row.details">{{ baseNames(row.details) }}</span>
          </p>
        </div>
        <OpsResultBadge :result="row.result" />
      </li>
    </ol>
  </section>
</template>
