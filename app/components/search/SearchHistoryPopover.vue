<script setup lang="ts">
import type { HistoryItem, SavedQuery } from '~/types/api'
import type { SearchState } from '~/composables/useSearchQuery'
import { activeFilterCount, stateFromStored } from '~/composables/useSearchQuery'
import { formatTimestamp } from '~/utils/format'
import { isApiError } from '~/utils/api-error'

// History (last 20) and saved queries (handoff §5.4), in a popover so they never push the results down.
const emit = defineEmits<{ run: [state: SearchState] }>()

const { t } = useT()
const { notify } = useNotify()
const api = useApi()

const open = ref(false)
const tab = ref<'recent' | 'saved'>('recent')
const history = ref<HistoryItem[] | null>(null)
const saved = ref<SavedQuery[] | null>(null)
const loading = ref(false)
const error = ref(false)
const deleting = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = false
  try {
    const [h, s] = await Promise.all([
      api.request<HistoryItem[]>('/api/history', { errorMode: 'background' }),
      api.request<SavedQuery[]>('/api/saved-queries', { errorMode: 'background' }),
    ])
    history.value = h
    saved.value = s
  }
  catch {
    error.value = true
  }
  finally {
    loading.value = false
  }
}

watch(open, (v) => {
  if (v) void load()
})

function run(q: string, filters: HistoryItem['filters'] | SavedQuery['filters']) {
  open.value = false
  emit('run', stateFromStored(q, filters))
}

async function remove(row: SavedQuery) {
  deleting.value = row.id
  try {
    await api.search.deleteSaved(row.id)
    saved.value = (saved.value ?? []).filter(s => s.id !== row.id)
    notify(t('search.history.deleted', { name: row.name }), 'success')
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    deleting.value = null
  }
}

function hasFilters(filters: HistoryItem['filters'] | SavedQuery['filters']) {
  return activeFilterCount(stateFromStored('x', filters).filters) > 0
}

const tabs = computed(() => [
  { label: t('search.history.recent'), value: 'recent', slot: 'recent' as const },
  { label: t('search.history.saved'), value: 'saved', slot: 'saved' as const },
])
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
  >
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-history"
      :label="t('search.history.open')"
    />

    <template #content>
      <div class="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 p-3">
        <p class="text-sm font-semibold text-highlighted">
          {{ t('search.history.title') }}
        </p>
        <UTabs
          v-model="tab"
          :items="tabs"
          :content="false"
          variant="link"
          class="w-full"
        />

        <p
          v-if="loading && !history"
          class="py-3 text-sm text-muted"
          role="status"
        >
          {{ t('search.history.loading') }}
        </p>
        <UAlert
          v-else-if="error"
          color="error"
          variant="soft"
          :title="t('search.history.error')"
          :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: load }]"
        />

        <template v-else-if="tab === 'recent'">
          <p
            v-if="!history?.length"
            class="py-3 text-sm text-muted"
          >
            {{ t('search.history.empty') }}
          </p>
          <ul
            v-else
            class="-mx-1 flex max-h-80 flex-col overflow-y-auto"
          >
            <li
              v-for="row in history"
              :key="row.id"
            >
              <UButton
                block
                color="neutral"
                variant="ghost"
                class="justify-between gap-3 text-start"
                @click="run(row.q, row.filters)"
              >
                <span class="flex min-w-0 flex-1 flex-col">
                  <span
                    dir="auto"
                    class="truncate font-medium text-default"
                  >{{ row.q }}</span>
                  <span class="text-xs text-muted tabular-nums">
                    {{ t('search.history.hits', { n: row.hits }) }}<template v-if="hasFilters(row.filters)"> · {{ t('search.history.withFilters') }}</template>
                  </span>
                </span>
                <span class="shrink-0 text-xs text-muted tabular-nums">{{ formatTimestamp(row.ts) }}</span>
              </UButton>
            </li>
          </ul>
        </template>

        <template v-else>
          <p
            v-if="!saved?.length"
            class="py-3 text-sm text-muted"
          >
            {{ t('search.history.savedEmpty') }}
          </p>
          <ul
            v-else
            class="-mx-1 flex max-h-80 flex-col overflow-y-auto"
          >
            <li
              v-for="row in saved"
              :key="row.id"
              class="flex items-center gap-1"
            >
              <UButton
                block
                color="neutral"
                variant="ghost"
                class="min-w-0 flex-1 justify-start text-start"
                @click="run(row.q, row.filters)"
              >
                <span class="flex min-w-0 flex-col">
                  <span
                    dir="auto"
                    class="truncate font-medium text-default"
                  >{{ row.name }}</span>
                  <span
                    dir="auto"
                    class="truncate text-xs text-muted"
                  >{{ row.q }}<template v-if="hasFilters(row.filters)"> · {{ t('search.history.withFilters') }}</template></span>
                </span>
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :loading="deleting === row.id"
                :aria-label="t('search.history.delete', { name: row.name })"
                class="min-w-9 shrink-0"
                @click="remove(row)"
              />
            </li>
          </ul>
        </template>
      </div>
    </template>
  </UPopover>
</template>
