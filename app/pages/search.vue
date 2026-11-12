<script setup lang="ts">
import type { Facets, Fuzzy, SearchResponse, SearchSort } from '~/types/api'
import type { SearchFilterState, SearchState } from '~/composables/useSearchQuery'
import {
  activeFilterCount, parseSearchQuery, SEARCH_PAGE_SIZE, toSearchParams, toSearchQuery,
} from '~/composables/useSearchQuery'
import { ACCESS } from '~/utils/access'
import { plural } from '~/utils/format'

definePageMeta({ roles: ACCESS.search, title: 'pages.search' })

// M3 search (handoff §5.4, §6 #8). The URL is the state: every control writes the route query, and a watcher
// on the route runs the search. Back/forward, reload and shared links therefore show the same list.
const { t } = useT()
const api = useApi()
const route = useRoute()
const router = useRouter()

const state = computed(() => parseSearchQuery(route.query))

function navigate(next: SearchState) {
  return router.push({ path: '/search', query: toSearchQuery(next) })
}

// ---------- query box ----------
const draft = ref(state.value.q)
watch(() => state.value.q, (q) => {
  draft.value = q
})
const draftEmpty = computed(() => draft.value.trim() === '')
const inputId = useId()
const hintId = useId()

async function submit() {
  const q = draft.value.trim()
  if (!q) return
  const next = { ...state.value, q, page: 1 }
  // The same query again: the route does not change, so run it directly (the user asked for fresh results).
  if (JSON.stringify(toSearchQuery(next)) === JSON.stringify(toSearchQuery(state.value))) void run()
  else await navigate(next)
}

function runExample(q: string) {
  draft.value = q
  void navigate({ ...state.value, q, page: 1 })
}

// ---------- fuzzy and sort ----------
const fuzzyItems = computed(() => ([0, 1, 2] as const).map(v => ({ label: t(`search.fuzzy.f${v}`), value: String(v) })))
const sortItems = computed(() => (['rel', 'date', 'shifr'] as const).map(v => ({ label: t(`search.sort.${v}`), value: v })))
function setFuzzy(v: string | number | null | undefined) {
  const fuzzy = Number(v) as Fuzzy
  if (fuzzy !== state.value.fuzzy) void navigate({ ...state.value, fuzzy, page: 1 })
}
function setSort(v: string | null | undefined) {
  if (v && v !== state.value.sort) void navigate({ ...state.value, sort: v as SearchSort, page: 1 })
}

// ---------- filters ----------
const facets = ref<Facets | null>(null)
const facetsLoading = ref(false)
const facetsError = ref(false)
async function loadFacets() {
  facetsLoading.value = true
  facetsError.value = false
  try {
    facets.value = await api.request<Facets>('/api/search/facets', { errorMode: 'background' })
  }
  catch {
    facetsError.value = true
  }
  finally {
    facetsLoading.value = false
  }
}
onMounted(loadFacets)

function setFilters(filters: SearchFilterState) {
  void navigate({ ...state.value, filters, page: 1 })
}
const filterCount = computed(() => activeFilterCount(state.value.filters))
const filtersOpen = ref(false)

// ---------- results ----------
const response = ref<SearchResponse | null>(null)
const loading = ref(false)
const failed = ref(false)
let seq = 0

async function run() {
  const current = state.value
  const mine = ++seq
  if (!current.q) {
    response.value = null
    loading.value = false
    failed.value = false
    return
  }
  loading.value = true
  failed.value = false
  let redirecting = false
  try {
    const res = await api.request<SearchResponse>('/api/search', { query: { ...toSearchParams(current) }, errorMode: 'background' })
    if (mine !== seq) return
    // A stale ?page= past the end (bookmark, results changed): go back to page 1 instead of an empty list.
    // Stay in the loading state until page 1 answers, so the empty past-end page never flashes.
    if (!res.error && res.items.length === 0 && res.total > 0 && current.page > 1) {
      redirecting = true
      void router.replace({ path: '/search', query: toSearchQuery({ ...current, page: 1 }) })
      return
    }
    response.value = res
  }
  catch {
    if (mine !== seq) return
    failed.value = true
  }
  finally {
    if (mine === seq && !redirecting) loading.value = false
  }
}

watch(() => route.query, () => {
  if (route.path === '/search') void run()
}, { immediate: true, deep: true })

const serverError = computed(() => response.value?.error ?? null)
const items = computed(() => response.value?.items ?? [])
const hasResults = computed(() => items.value.length > 0)
const pageCount = computed(() => response.value?.pages ?? Math.ceil((response.value?.total ?? 0) / SEARCH_PAGE_SIZE))

const summary = computed(() => {
  const r = response.value
  if (!r || r.error || r.total === 0) return ''
  const cases = plural('search.plural.case', r.total)
  const pages = plural('search.plural.page', r.pages_total)
  return t('search.summary', { cases, pages })
})
/** Empty and out-of-range answers (no items) — told apart by total. */
const isEmpty = computed(() => !!response.value && !serverError.value && !hasResults.value && response.value.total === 0)
const outOfRange = computed(() => !!response.value && !serverError.value && !hasResults.value && response.value.total > 0)

/**
 * What the role="status" line says (WCAG 4.1.3): progress, the count, «Ничего не найдено», or the failure.
 * For empty and failed searches the panel below already shows the words, so the line carries them for
 * assistive tech only.
 */
const statusNote = computed(() => {
  if (loading.value || !state.value.q) return ''
  if (failed.value) return t('search.error')
  if (isEmpty.value) return t('search.empty.title')
  if (outOfRange.value) return t('search.outOfRange')
  return ''
})

const took = computed(() => {
  const r = response.value
  if (!r || r.error || !r.took) return ''
  return t('search.took', { sec: r.took.toLocaleString('ru-RU', { maximumFractionDigits: 3 }) })
})

const resultsEl = useTemplateRef<HTMLElement>('results')
function setPage(page: number) {
  void navigate({ ...state.value, page }).then(() => {
    resultsEl.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  })
}

const examples = computed(() => [
  { q: t('search.initial.examples.word'), hint: t('search.initial.examples.wordHint') },
  { q: t('search.initial.examples.phrase'), hint: t('search.initial.examples.phraseHint') },
  { q: t('search.initial.examples.bool'), hint: t('search.initial.examples.boolHint') },
])

// Below 640 px the three fuzzy levels stack: side by side they need ~380 px (brief: no horizontal scroll at 375).
const narrow = ref(false)
let narrowQuery: MediaQueryList | null = null
const onNarrow = (e: MediaQueryListEvent) => {
  narrow.value = e.matches
}
onMounted(() => {
  narrowQuery = window.matchMedia('(max-width: 639px)')
  narrow.value = narrowQuery.matches
  narrowQuery.addEventListener('change', onNarrow)
})
onBeforeUnmount(() => narrowQuery?.removeEventListener('change', onNarrow))

const radioUi = {
  legend: 'sr-only',
  item: 'min-h-9 px-3 py-0 items-center has-data-[state=checked]:bg-primary/10 has-data-[state=checked]:border-primary',
  label: 'text-sm font-medium whitespace-nowrap',
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
    <h1 class="sr-only">
      {{ t('pages.search') }}
    </h1>

    <!-- Query box: one field, the syntax hint under it, then fuzzy / sort / history on one quiet row. -->
    <section class="flex flex-col gap-3 rounded-lg bg-default p-4 sm:p-5">
      <form
        role="search"
        class="flex flex-col gap-2"
        novalidate
        @submit.prevent="submit"
      >
        <label
          :for="inputId"
          class="sr-only"
        >{{ t('search.form.label') }}</label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput
            :id="inputId"
            v-model="draft"
            type="search"
            size="xl"
            dir="auto"
            icon="i-lucide-search"
            autocomplete="off"
            enterkeyhint="search"
            :placeholder="t('search.form.placeholder')"
            :aria-describedby="hintId"
            class="min-w-0 flex-1"
            :ui="{ base: 'text-base' }"
          />
          <UButton
            type="submit"
            size="xl"
            icon="i-lucide-search"
            :label="t('search.form.submit')"
            :disabled="draftEmpty"
            class="justify-center sm:min-w-32"
          />
        </div>
        <div
          :id="hintId"
          class="flex flex-col gap-0.5 text-sm"
        >
          <p
            v-if="draftEmpty"
            class="flex items-center gap-1.5 text-toned"
          >
            <UIcon
              name="i-lucide-info"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            {{ t('search.form.emptyReason') }}
          </p>
          <p class="text-muted">
            {{ t('search.form.syntax') }}
          </p>
        </div>
        <UAlert
          v-if="serverError"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="serverError"
          role="status"
        />
      </form>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-default pt-3">
        <URadioGroup
          :legend="t('search.fuzzy.label')"
          :model-value="String(state.fuzzy)"
          :items="fuzzyItems"
          :orientation="narrow ? 'vertical' : 'horizontal'"
          variant="table"
          :class="narrow && 'w-full'"
          size="lg"
          :ui="radioUi"
          @update:model-value="setFuzzy"
        />
        <div class="flex items-center gap-2">
          <label
            for="search-sort"
            class="text-sm text-muted"
          >{{ t('search.sort.label') }}</label>
          <USelect
            id="search-sort"
            :model-value="state.sort"
            :items="sortItems"
            class="w-52"
            @update:model-value="setSort"
          />
        </div>
        <div class="ms-auto flex flex-wrap items-center gap-2">
          <SearchHistoryPopover @run="navigate" />
          <SearchSavePopover
            v-if="state.q"
            :state="state"
          />
        </div>
      </div>
    </section>

    <div class="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <!-- Filter column (≥ lg). Below lg the same form opens in a slideover. -->
      <aside
        class="hidden rounded-lg bg-default p-4 lg:block"
        :aria-label="t('search.filters.title')"
      >
        <h2 class="mb-4 text-base font-semibold text-highlighted">
          {{ t('search.filters.title') }}
        </h2>
        <SearchFilters
          id-prefix="filters-side"
          :facets="facets"
          :loading="facetsLoading"
          :error="facetsError"
          :filters="state.filters"
          @update:filters="setFilters"
          @retry="loadFacets"
        />
      </aside>

      <section
        ref="results"
        class="flex min-w-0 scroll-mt-4 flex-col gap-3"
        :aria-busy="loading || undefined"
        :aria-label="t('pages.search')"
      >
        <div
          class="flex min-h-9 flex-wrap items-center justify-between gap-2"
          :class="!loading && (!summary || outOfRange) && 'lg:min-h-0'"
        >
          <p
            class="text-sm text-muted tabular-nums"
            role="status"
          >
            <template v-if="loading">
              {{ t('search.loading') }}
            </template>
            <span
              v-else-if="statusNote"
              class="sr-only"
            >{{ statusNote }}</span>
            <template v-else-if="summary">
              <span class="font-semibold text-default">{{ summary }}</span>
              <span v-if="took"> · {{ took }}</span>
            </template>
          </p>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-sliders-horizontal"
            class="lg:hidden"
            :label="filterCount ? t('search.filters.openCount', { n: filterCount }) : t('search.filters.open')"
            @click="filtersOpen = true"
          />
        </div>

        <!-- Initial: no query yet. -->
        <div
          v-if="!state.q"
          class="flex flex-col gap-4 rounded-lg bg-default p-5 sm:p-6"
        >
          <div class="flex flex-col gap-1">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t('search.initial.title') }}
            </h2>
            <p class="max-w-[68ch] text-sm text-muted">
              {{ t('search.initial.body') }}
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <h3 class="text-sm font-semibold text-default">
              {{ t('search.initial.examplesTitle') }}
            </h3>
            <ul class="flex flex-col gap-1">
              <li
                v-for="ex in examples"
                :key="ex.q"
                class="flex flex-wrap items-center gap-x-3"
              >
                <UButton
                  color="neutral"
                  variant="soft"
                  :label="ex.q"
                  class="font-medium"
                  @click="runExample(ex.q)"
                />
                <span class="text-sm text-muted">{{ ex.hint }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Error. -->
        <UAlert
          v-else-if="failed"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="t('search.error')"
          :description="t('errors.genericBody')"
          :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: run }]"
        />

        <!-- First load. -->
        <div
          v-else-if="loading && !hasResults"
          class="flex flex-col gap-3"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="flex flex-col gap-3 rounded-lg bg-default p-5"
          >
            <USkeleton class="h-4 w-40" />
            <USkeleton class="h-6 w-2/3" />
            <USkeleton class="h-4 w-1/2" />
            <USkeleton class="h-12 w-full" />
          </div>
        </div>

        <!-- Past the last page: normally redirected to page 1 at once; the button covers a slow redirect. -->
        <div
          v-else-if="outOfRange"
          class="flex flex-col items-start gap-3 rounded-lg bg-default p-5 sm:p-6"
        >
          <h2 class="text-lg font-semibold text-highlighted">
            {{ t('search.outOfRange') }}
          </h2>
          <UButton
            icon="i-lucide-arrow-left"
            :label="t('search.toFirstPage')"
            @click="navigate({ ...state, page: 1 })"
          />
        </div>

        <!-- Empty. -->
        <div
          v-else-if="isEmpty"
          class="flex flex-col items-start gap-3 rounded-lg bg-default p-5 sm:p-6"
        >
          <h2 class="text-lg font-semibold text-highlighted">
            {{ t('search.empty.title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ t('search.empty.body') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="state.fuzzy < 2"
              icon="i-lucide-spell-check"
              :label="t('search.empty.fuzzy')"
              @click="navigate({ ...state, fuzzy: (state.fuzzy + 1) as Fuzzy, page: 1 })"
            />
            <UButton
              v-if="filterCount"
              color="neutral"
              variant="outline"
              icon="i-lucide-filter-x"
              :label="t('search.empty.reset')"
              @click="setFilters({})"
            />
          </div>
        </div>

        <!-- Results, grouped by case. Old results stay (dimmed) while the next page loads. -->
        <template v-else-if="hasResults">
          <ol
            class="flex flex-col gap-3 transition-opacity"
            :class="loading && 'opacity-60'"
          >
            <li
              v-for="(item, i) in items"
              :key="item.delo_id"
            >
              <SearchResult
                :item="item"
                :primary="i === 0 && state.page === 1"
                :q="state.q"
                :fuzzy="state.fuzzy"
              />
            </li>
          </ol>
          <nav
            v-if="pageCount > 1"
            class="flex justify-center py-2"
            :aria-label="t('search.pagination')"
          >
            <UPagination
              :page="state.page"
              :total="response?.total ?? 0"
              :items-per-page="SEARCH_PAGE_SIZE"
              :sibling-count="1"
              show-edges
              @update:page="setPage"
            />
          </nav>
        </template>
      </section>
    </div>

    <USlideover
      v-model:open="filtersOpen"
      :title="t('search.filters.title')"
      side="right"
      :ui="{ content: 'max-w-[min(24rem,100vw)]' }"
    >
      <template #body>
        <SearchFilters
          id-prefix="filters-sheet"
          :facets="facets"
          :loading="facetsLoading"
          :error="facetsError"
          :filters="state.filters"
          @update:filters="setFilters"
          @retry="loadFacets"
        />
      </template>
      <template #footer>
        <UButton
          block
          :label="t('search.filters.apply')"
          @click="filtersOpen = false"
        />
      </template>
    </USlideover>
  </div>
</template>
