<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { DelaPageResponse, DeloSummary, Facets } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { ApiError } from '~/utils/api-error'
import { deloLangs } from '~/composables/useCases'
import {
  DELA_PER_PAGE, isFiltered, lastPage, matchNumbered, normalizeDelaResponse, opisiFromDela, parseDelaQuery,
  shownLabel, toDelaQuery, withFilters,
} from '~/composables/useDelaBrowse'
import type { DelaBrowseState, NumberedOption } from '~/composables/useDelaBrowse'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ roles: ACCESS.dela, title: 'pages.dela' })

// Handoff §6 #5 and §5.3, surface brief app-pages-dela-index-vue (Stage 11b). Browse Фонд → Опись → pages of 25.
// The URL query (q, fond, opis, page) is the state: selects and page turns push history, typing replaces it,
// and back/forward re-read it.
const { t } = useT()
const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const state = computed(() => parseDelaQuery(route.query))
const filtered = computed(() => isFiltered(state.value))
/** Editors see restricted cases (and the 🔒) and read the Фонд/Опись lists from ЕАИС. */
const isEditor = computed(() => auth.can('restricted'))

function go(next: DelaBrowseState, mode: 'push' | 'replace' = 'push') {
  void router[mode]({ path: '/dela', query: toDelaQuery(next) })
}

// ---------- the list ----------
const rows = ref<DeloSummary[]>([])
const total = ref(0)
const loading = ref(true)
const loadError = ref<string | null>(null)
const listTop = ref<HTMLElement | null>(null)

let seq = 0
async function load() {
  const mine = ++seq
  const s = state.value
  loading.value = true
  loadError.value = null
  try {
    const resp = await api.request<DelaPageResponse | DeloSummary[]>('/api/dela', {
      query: { q: s.q.trim() || undefined, fond: s.fond, opis: s.opis, page: s.page, per_page: DELA_PER_PAGE },
      errorMode: 'background',
    })
    if (mine !== seq) return
    const page = normalizeDelaResponse(resp, s)
    // A page past the end (a stale link, or the list shrank): go to the last real page instead of an empty one.
    if (page.items.length === 0 && page.total > 0 && s.page > lastPage(page.total)) {
      go({ ...s, page: lastPage(page.total) }, 'replace')
      return
    }
    rows.value = page.items
    total.value = page.total
  }
  catch (e) {
    if (mine !== seq) return
    if (e instanceof ApiError && e.kind === 'unauthorized') return
    loadError.value = e instanceof Error && e.message ? e.message : t('dela.error')
  }
  finally {
    if (mine === seq) loading.value = false
  }
}

const shown = computed(() => (loading.value && rows.value.length === 0 ? null : shownLabel(state.value.page, rows.value.length, total.value)))
const pageCount = computed(() => lastPage(total.value))

function setPage(page: number) {
  go({ ...state.value, page })
  // Bring the top of the list back into view; the count line there says which rows are shown now.
  listTop.value?.scrollIntoView({ block: 'nearest' })
}

// ---------- search box (debounced, replaces history) ----------
const qInput = ref(state.value.q)
let debounce: ReturnType<typeof setTimeout> | null = null
watch(qInput, (v) => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    if (v.trim() !== state.value.q.trim()) go(withFilters(state.value, { q: v }), 'replace')
  }, 300)
})
// Back/forward or «Сбросить» changed q in the URL: show it in the box.
watch(() => state.value.q, (v) => {
  if (v.trim() !== qInput.value.trim()) qInput.value = v
})
onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce)
})

function reset() {
  qInput.value = ''
  go({ q: '', page: 1 })
}

// ---------- Фонд and Опись options ----------
// Editors (admin, archivist) read the ЕАИС cascade (GET /api/m1/cases). Everyone else, and editors while ЕАИС is
// down, gets lists built only from cases they can see: фонды from /api/search/facets and описи from the plain
// /api/dela?fond=N list. So an опись that holds only restricted cases never shows up for a reader or an operator.
const fondRows = ref<NumberedOption[]>([])
const opisRows = ref<NumberedOption[]>([])
const opisLoading = ref(false)
const optionsNote = ref<string | null>(null)
let eaisDown = false

function noteEaisDown(e: unknown) {
  eaisDown = true
  const detail = e instanceof ApiError ? (e.detail ?? e.message) : t('errors.network')
  optionsNote.value = t('dela.optionsFallback', { detail: detail.replace(/\.\s*$/, '') })
}

const isUnauthorized = (e: unknown) => e instanceof ApiError && e.kind === 'unauthorized'

async function loadFonds() {
  if (isEditor.value) {
    try {
      const list = await api.m1.fonds('background')
      fondRows.value = list.map(f => ({ value: f.fond, label: t('dela.fondOption', { fond: f.fond, creator: f.fond_creator }) }))
      return
    }
    catch (e) {
      if (isUnauthorized(e)) return
      noteEaisDown(e)
    }
  }
  try {
    const facets = await api.request<Facets>('/api/search/facets', { errorMode: 'background' })
    fondRows.value = facets.fonds.map(f => ({ value: f.fond, label: t('dela.fondOption', { fond: f.fond, creator: f.creator }) }))
  }
  catch {
    // The select keeps «Все фонды» and the current фонд; the list itself still works.
  }
}

const opisCache = new Map<number, NumberedOption[]>()
let opisSeq = 0
async function loadOpisi(fond: number | undefined) {
  const mine = ++opisSeq
  opisRows.value = []
  opisLoading.value = false
  if (fond === undefined) return
  const cached = opisCache.get(fond)
  if (cached) {
    opisRows.value = cached
    return
  }
  opisLoading.value = true
  let numbers: number[] | null = null
  if (isEditor.value && !eaisDown) {
    try {
      numbers = (await api.m1.opisi(fond, 'background')).map(o => o.opis).sort((a, b) => a - b)
    }
    catch (e) {
      if (isUnauthorized(e)) return
      noteEaisDown(e)
    }
  }
  if (numbers === null) {
    try {
      const resp = await api.request<DeloSummary[] | DelaPageResponse>('/api/dela', { query: { fond }, errorMode: 'background' })
      numbers = opisiFromDela(Array.isArray(resp) ? resp : resp.items)
    }
    catch {
      numbers = null
    }
  }
  if (mine !== opisSeq) return
  opisLoading.value = false
  if (numbers === null) return
  const options = numbers.map(o => ({ value: o, label: t('dela.opisOption', { opis: o }) }))
  opisCache.set(fond, options)
  opisRows.value = options
}

/** USelectMenu needs a non-empty value for «Все …»; 0 is never a real фонд or опись number. */
const ALL = 0

const fondModel = computed<number>({
  get: () => state.value.fond ?? ALL,
  set: v => go(withFilters(state.value, { fond: v === ALL ? undefined : v })),
})
const opisModel = computed<number>({
  get: () => state.value.opis ?? ALL,
  set: v => go(withFilters(state.value, { opis: v === ALL ? undefined : v })),
})

const fondTerm = ref('')
const opisTerm = ref('')

const fondLabel = computed(() => {
  const f = state.value.fond
  if (f === undefined) return t('dela.fondAll')
  return fondRows.value.find(r => r.value === f)?.label ?? t('dela.fondShort', { fond: f })
})
const opisLabel = computed(() => {
  if (state.value.fond === undefined) return t('dela.opisFirst')
  const o = state.value.opis
  return o === undefined ? t('dela.opisAll') : t('dela.opisOption', { opis: o })
})

const fondItems = computed(() => fondTerm.value.trim()
  ? matchNumbered(fondRows.value, fondTerm.value)
  : [{ value: ALL, label: t('dela.fondAll') }, ...fondRows.value])
const opisItems = computed(() => opisTerm.value.trim()
  ? matchNumbered(opisRows.value, opisTerm.value)
  : [{ value: ALL, label: t('dela.opisAll') }, ...opisRows.value])

// ---------- wiring ----------
watch(() => JSON.stringify(toDelaQuery(state.value)), () => void load())
watch(() => state.value.fond, fond => void loadOpisi(fond))

void load()
void loadFonds().then(() => loadOpisi(state.value.fond))

// ---------- table ----------
const langsOf = deloLangs

const columns = computed<TableColumn<DeloSummary>[]>(() => [
  { id: 'shifr', header: t('dela.cols.shifr'), meta: { class: { td: 'whitespace-nowrap' } } },
  { id: 'title', header: t('dela.cols.title') },
  { id: 'years', header: t('dela.cols.years') },
  { id: 'langs', header: t('dela.cols.langs') },
  { id: 'pages', header: t('dela.cols.pages'), meta: { class: { td: 'whitespace-nowrap' } } },
  { id: 'gaps', header: t('dela.cols.gaps') },
  { id: 'lowConf', header: t('dela.cols.lowConf'), meta: { class: { th: 'text-end', td: 'text-end' } } },
])

// The title link is the keyboard path; a click anywhere else on the row opens the case too.
function onRowClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('a, button, input, [role="button"]')) return
  const tr = target.closest('tbody > tr')
  if (!tr?.parentElement) return
  const index = Array.prototype.indexOf.call(tr.parentElement.children, tr)
  const row = rows.value[index]
  if (row) void navigateTo(`/dela/${row.id}`)
}

const tableUi = {
  root: 'overflow-x-auto',
  thead: 'bg-elevated',
  th: 'py-2.5 text-[13px] font-semibold text-toned',
  td: 'py-3 text-sm text-default align-top',
  tbody: '[&>tr]:cursor-pointer [&>tr]:hover:bg-elevated/40',
}
const selectUi = { content: 'min-w-(--reka-combobox-trigger-width)', item: 'min-h-9' }
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-4">
    <h1 class="sr-only">
      {{ t('dela.title') }}
    </h1>

    <section
      class="flex flex-col gap-2 rounded-lg bg-default p-4"
      :aria-label="t('dela.toolbar')"
    >
      <div class="flex flex-wrap items-end gap-3">
        <UFormField
          :label="t('dela.q')"
          class="min-w-[16rem] flex-1"
        >
          <UInput
            v-model="qInput"
            type="search"
            icon="i-lucide-search"
            :placeholder="t('dela.qPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('dela.fond')"
          class="w-full sm:w-80"
        >
          <USelectMenu
            v-model="fondModel"
            v-model:search-term="fondTerm"
            :items="fondItems"
            value-key="value"
            ignore-filter
            :search-input="{ placeholder: t('dela.fondSearch'), icon: 'i-lucide-search' }"
            :ui="selectUi"
            class="w-full"
          >
            <template #default="{ ui }">
              <span :class="ui.value()">{{ fondLabel }}</span>
            </template>
            <template #empty>
              {{ t('dela.optionsEmpty') }}
            </template>
          </USelectMenu>
        </UFormField>
        <UFormField
          :label="t('dela.opis')"
          class="w-full sm:w-52"
        >
          <USelectMenu
            v-model="opisModel"
            v-model:search-term="opisTerm"
            :items="opisItems"
            value-key="value"
            ignore-filter
            :disabled="state.fond === undefined"
            :loading="opisLoading"
            :search-input="{ placeholder: t('dela.opisSearch'), icon: 'i-lucide-search' }"
            :ui="selectUi"
            class="w-full"
          >
            <template #default="{ ui }">
              <span :class="state.fond === undefined ? ui.placeholder() : ui.value()">{{ opisLabel }}</span>
            </template>
            <template #empty>
              {{ t('dela.optionsEmpty') }}
            </template>
          </USelectMenu>
        </UFormField>
        <UButton
          v-if="filtered"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          :label="t('dela.reset')"
          @click="reset"
        />
      </div>
      <p
        v-if="optionsNote"
        class="text-sm text-muted"
      >
        {{ optionsNote }}
      </p>
    </section>

    <!-- The one row-count line style (Stage 9): muted, small, tabular, top-left above the list. -->
    <p
      ref="listTop"
      class="min-h-5 scroll-mt-4 text-sm text-muted tabular-nums"
      role="status"
    >
      <template v-if="!loadError && shown">
        {{ shown }}
      </template>
    </p>

    <UAlert
      v-if="loadError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('dela.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />

    <section
      v-else
      class="overflow-hidden rounded-lg bg-default"
    >
      <div
        v-if="loading && rows.length === 0"
        class="flex flex-col gap-3 p-4"
        :aria-label="t('dela.loading')"
        aria-busy="true"
      >
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="h-12 w-full"
        />
      </div>

      <div
        v-else-if="rows.length === 0"
        class="flex flex-col items-start gap-2 p-8"
      >
        <UIcon
          :name="filtered ? 'i-lucide-search-x' : 'i-lucide-folder-open'"
          class="size-7 text-muted"
          aria-hidden="true"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          {{ filtered ? t('dela.emptyFiltered') : t('dela.empty') }}
        </h2>
        <p class="max-w-[68ch] text-sm text-muted">
          {{ filtered ? t('dela.emptyFilteredBody') : t('dela.emptyBody') }}
        </p>
        <UButton
          v-if="filtered"
          color="neutral"
          variant="outline"
          :label="t('dela.resetFilters')"
          class="mt-1"
          @click="reset"
        />
      </div>

      <template v-else>
        <!-- Mouse shortcut only: the title link in each row is the keyboard path to the same case. -->
        <div @click="onRowClick">
          <UTable
            :data="rows"
            :columns="columns"
            :loading="loading"
            :ui="tableUi"
          >
            <template #shifr-cell="{ row }">
              <ShifrPlate
                variant="compact"
                :shifr="row.original"
                class="font-medium"
              />
            </template>
            <template #title-cell="{ row }">
              <div class="flex min-w-[14rem] max-w-[32rem] flex-col items-start gap-1 whitespace-normal">
                <NuxtLink
                  :to="`/dela/${row.original.id}`"
                  dir="auto"
                  class="-my-2 py-2 font-medium text-highlighted underline-offset-4 hover:text-primary hover:underline"
                >{{ row.original.title }}</NuxtLink>
                <span
                  v-if="state.fond === undefined"
                  dir="auto"
                  class="text-[13px] text-muted"
                >{{ row.original.fond_creator }}</span>
                <DelaRestrictedBadge :access="row.original.access" />
              </div>
            </template>
            <template #years-cell="{ row }">
              <YearChip
                :years="row.original.years"
                labelled
              />
            </template>
            <template #langs-cell="{ row }">
              <DelaLangBadges
                :langs="langsOf(row.original)"
                class="min-w-24"
              />
            </template>
            <template #pages-cell="{ row }">
              <span class="tabular-nums">{{ t('dela.pagesDone', { done: row.original.pages_done, total: row.original.pages_total }) }}</span>
              <span
                v-if="row.original.pages_failed > 0"
                class="ms-2"
              >
                <UBadge
                  color="error"
                  variant="soft"
                  size="md"
                  icon="i-lucide-circle-alert"
                  :label="String(row.original.pages_failed)"
                  :aria-label="t('dela.card.stats.failed') + ': ' + row.original.pages_failed"
                />
              </span>
            </template>
            <template #gaps-cell="{ row }">
              <DelaGapsCell :gaps="row.original.gaps" />
            </template>
            <template #lowConf-cell="{ row }">
              <span
                class="tabular-nums"
                :class="row.original.low_conf > 0 ? 'text-default' : 'text-dimmed'"
              >{{ row.original.low_conf }}</span>
            </template>
          </UTable>
        </div>

        <nav
          v-if="pageCount > 1"
          class="flex justify-end border-t border-default px-4 py-3"
          :aria-label="t('dela.pagination')"
        >
          <UPagination
            :page="state.page"
            :total="total"
            :items-per-page="DELA_PER_PAGE"
            :sibling-count="1"
            show-edges
            @update:page="setPage"
          />
        </nav>
      </template>
    </section>
  </div>
</template>
