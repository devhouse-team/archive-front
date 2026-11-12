<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { JournalResult, JournalRow } from '~/types/api'
import { errorText, JOURNAL_RESULT } from '~/composables/useOps'
import { ACCESS } from '~/utils/access'
import { baseNames, formatTimestamp } from '~/utils/format'
import { parseShifr } from '~/utils/shifr'

// Журнал (handoff §6 #10; surface brief app-pages-journal-vue). STAFF only.
// The API has no total: «Далее» is offered while a full page comes back.
definePageMeta({ roles: ACCESS.journal, title: 'pages.journal' })

const LIMIT = 50
const RESULTS = Object.keys(JOURNAL_RESULT) as JournalResult[]

const { t } = useT()
const api = useApi()
const route = useRoute()
const router = useRouter()

function resultFromQuery(v: unknown): JournalResult | 'all' {
  return typeof v === 'string' && (RESULTS as string[]).includes(v) ? v as JournalResult : 'all'
}
function offsetFromQuery(v: unknown): number {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n - (n % LIMIT) : 0
}

const result = ref<JournalResult | 'all'>(resultFromQuery(route.query.result))
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const offset = ref(offsetFromQuery(route.query.offset))
const rows = ref<JournalRow[] | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

let seq = 0
async function load() {
  const mine = ++seq
  loading.value = true
  try {
    const data = await api.request<JournalRow[]>('/api/m1/journal', {
      query: { q: q.value.trim(), result: result.value === 'all' ? '' : result.value, limit: LIMIT, offset: offset.value },
      errorMode: 'background',
    })
    if (mine !== seq) return
    rows.value = data
    loadError.value = null
  }
  catch (e) {
    if (mine === seq) loadError.value = errorText(e) ?? t('journal.loadError')
  }
  finally {
    if (mine === seq) loading.value = false
  }
}

function syncUrl() {
  void router.replace({
    query: {
      result: result.value === 'all' ? undefined : result.value,
      q: q.value.trim() || undefined,
      offset: offset.value || undefined,
    },
  })
}

onMounted(load)

watch(result, () => {
  offset.value = 0
  syncUrl()
  void load()
})
let debounce: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    offset.value = 0
    syncUrl()
    void load()
  }, 300)
})
onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce)
})

function go(delta: number) {
  offset.value = Math.max(0, offset.value + delta * LIMIT)
  syncUrl()
  void load()
}

const hasNext = computed(() => (rows.value?.length ?? 0) === LIMIT)
const range = computed(() => rows.value && rows.value.length
  ? t('journal.range', { from: offset.value + 1, to: offset.value + rows.value.length })
  : '')
const filtered = computed(() => result.value !== 'all' || q.value.trim() !== '')

const resultItems = computed(() => [
  { label: t('journal.allResults'), value: 'all' },
  ...RESULTS.map(r => ({ label: t(`journal.results.${r}`), value: r })),
])

const columns = computed<TableColumn<JournalRow>[]>(() => [
  { accessorKey: 'ts', header: t('journal.cols.time') },
  { accessorKey: 'actor', header: t('journal.cols.actor') },
  { accessorKey: 'action', header: t('journal.cols.action') },
  { accessorKey: 'file_name', header: t('journal.cols.file'), meta: { class: { td: 'whitespace-normal max-w-72 break-words' } } },
  { accessorKey: 'shifr', header: t('journal.cols.shifr') },
  { accessorKey: 'result', header: t('journal.cols.result') },
  { accessorKey: 'details', header: t('journal.cols.details'), meta: { class: { td: 'whitespace-normal min-w-56 text-muted' } } },
])

const tableUi = {
  root: 'rounded-lg bg-default',
  th: 'bg-elevated py-2.5 text-[13px]',
  td: 'py-2.5 align-top text-default',
  empty: 'py-10 text-center text-sm text-muted',
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-4">
    <h1 class="sr-only">
      {{ t('pages.journal') }}
    </h1>

    <div class="flex flex-wrap items-center gap-2">
      <USelect
        v-model="result"
        :items="resultItems"
        :aria-label="t('journal.result')"
        class="w-44"
      />
      <UInput
        v-model="q"
        type="search"
        icon="i-lucide-search"
        :placeholder="t('journal.search')"
        :aria-label="t('journal.searchLabel')"
        class="w-full max-w-md"
      />
    </div>

    <UAlert
      v-if="loadError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: load }]"
    />

    <UTable
      v-if="!loadError || rows"
      :data="rows ?? []"
      :columns="columns"
      :loading="loading"
      :ui="tableUi"
      :caption="t('pages.journal')"
      :class="loading && rows ? 'opacity-70' : ''"
    >
      <template #ts-cell="{ row }">
        <time
          class="text-muted tabular-nums"
          :datetime="row.original.ts.replace(' ', 'T')"
        >{{ formatTimestamp(row.original.ts) }}</time>
      </template>
      <template #actor-cell="{ row }">
        <span class="font-medium">{{ row.original.actor }}</span>
      </template>
      <template #shifr-cell="{ row }">
        <ShifrPlate
          v-if="parseShifr(row.original.shifr)"
          variant="compact"
          :shifr="parseShifr(row.original.shifr)!"
        />
        <span
          v-else
          class="tabular-nums"
        >{{ row.original.shifr }}</span>
      </template>
      <template #result-cell="{ row }">
        <OpsResultBadge :result="row.original.result" />
      </template>
      <template #file_name-cell="{ row }">
        {{ row.original.file_name ? baseNames(row.original.file_name) : '' }}
      </template>
      <template #details-cell="{ row }">
        {{ row.original.details ? baseNames(row.original.details) : '' }}
      </template>
      <template #loading>
        {{ t('state.loading') }}
      </template>
      <template #empty>
        {{ filtered ? t('journal.emptyFiltered') : t('journal.empty') }}
      </template>
    </UTable>

    <nav
      v-if="rows && (offset > 0 || hasNext)"
      :aria-label="t('journal.pagination')"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted tabular-nums">
        {{ range }}
      </p>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-chevron-left"
          :label="t('journal.prev')"
          :disabled="offset === 0 || loading"
          @click="go(-1)"
        />
        <UButton
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-chevron-right"
          :label="t('journal.next')"
          :disabled="!hasNext || loading"
          @click="go(1)"
        />
      </div>
    </nav>
  </div>
</template>
