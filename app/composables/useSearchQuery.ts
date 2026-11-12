import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { Fuzzy, Lang, SearchFilters, SearchParams, SearchSort } from '~/types/api'

// Stage 6 search state. Everything the user sets on /search lives in the URL query, so back/forward, reload
// and a copied link all reproduce the same result list. These helpers are pure; the page wires them to the router.

export const SEARCH_PAGE_SIZE = 20

export const FILTER_KEYS = ['fond', 'opis', 'delo', 'year_from', 'year_to', 'lang', 'doc_type', 'creator'] as const
export type FilterKey = typeof FILTER_KEYS[number]

const NUMERIC_FILTERS: readonly FilterKey[] = ['fond', 'opis', 'delo', 'year_from', 'year_to']
const LANGS: readonly Lang[] = ['ru', 'kk-cyrl', 'kk-latn', 'kk-arab']
const SORTS: readonly SearchSort[] = ['rel', 'date', 'shifr']

/** Filter values as the UI holds them: numbers stay strings (as typed), absent = undefined. */
export type SearchFilterState = Partial<Record<FilterKey, string>>

export interface SearchState {
  q: string
  fuzzy: Fuzzy
  sort: SearchSort
  page: number
  filters: SearchFilterState
}

export const DEFAULT_SEARCH: Readonly<SearchState> = Object.freeze({ q: '', fuzzy: 0, sort: 'rel', page: 1, filters: {} })

function first(value: LocationQuery[string] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : ''
}

function cleanFilter(key: FilterKey, raw: string): string | undefined {
  const v = raw.trim()
  if (!v) return undefined
  if (NUMERIC_FILTERS.includes(key)) return /^\d{1,6}$/.test(v) ? v : undefined
  if (key === 'lang') return (LANGS as readonly string[]).includes(v) ? v : undefined
  return v.slice(0, 200)
}

/** Route query → state. Unknown or malformed values fall back to the defaults instead of reaching the API. */
export function parseSearchQuery(query: LocationQuery): SearchState {
  const fz = Number(first(query.fuzzy))
  const sort = first(query.sort) as SearchSort
  const page = Number.parseInt(first(query.page), 10)
  const filters: SearchFilterState = {}
  for (const key of FILTER_KEYS) {
    const v = cleanFilter(key, first(query[key]))
    if (v !== undefined) filters[key] = v
  }
  return {
    q: first(query.q).trim(),
    fuzzy: (fz === 1 || fz === 2 ? fz : 0) as Fuzzy,
    sort: SORTS.includes(sort) ? sort : 'rel',
    page: Number.isFinite(page) && page > 1 ? page : 1,
    filters,
  }
}

/** State → route query. Defaults are left out so a plain search keeps a short URL (?q=мектеп). */
export function toSearchQuery(state: SearchState): LocationQueryRaw {
  const out: LocationQueryRaw = {}
  if (state.q.trim()) out.q = state.q.trim()
  if (state.fuzzy !== 0) out.fuzzy = String(state.fuzzy)
  if (state.sort !== 'rel') out.sort = state.sort
  if (state.page > 1) out.page = String(state.page)
  for (const key of FILTER_KEYS) {
    const v = state.filters[key]
    if (v) out[key] = v
  }
  return out
}

/** State → /api/search params. Only called with a non-empty query (handoff §9). */
export function toSearchParams(state: SearchState): SearchParams {
  const filters: Record<string, string | number> = {}
  for (const key of FILTER_KEYS) {
    const v = state.filters[key]
    if (v) filters[key] = NUMERIC_FILTERS.includes(key) ? Number(v) : v
  }
  return { ...(filters as SearchFilters), q: state.q, fuzzy: state.fuzzy, sort: state.sort, page: state.page }
}

/** Saved-query and history payloads → state (their filters may also carry fuzzy and sort). */
export function stateFromStored(q: string, stored: (SearchFilters & { fuzzy?: unknown, sort?: unknown }) | null | undefined): SearchState {
  const query: LocationQuery = { q }
  if (stored) {
    for (const [k, v] of Object.entries(stored)) {
      if (v !== null && v !== undefined && v !== '') query[k] = String(v)
    }
  }
  return parseSearchQuery(query)
}

/** State → the filters object kept with a saved query (fuzzy and sort included, defaults left out). */
export function storedFilters(state: SearchState): SearchFilters {
  const out: Record<string, string | number> = {}
  for (const key of FILTER_KEYS) {
    const v = state.filters[key]
    if (v) out[key] = NUMERIC_FILTERS.includes(key) ? Number(v) : v
  }
  if (state.fuzzy !== 0) out.fuzzy = state.fuzzy
  if (state.sort !== 'rel') out.sort = state.sort
  return out as SearchFilters
}

export function activeFilterCount(filters: SearchFilterState): number {
  // A year range counts once.
  let n = 0
  for (const key of FILTER_KEYS) if (filters[key] && key !== 'year_to') n++
  if (filters.year_to && !filters.year_from) n++
  return n
}

/** Russian plural form for n: one (1, 21), few (2–4, 22–24), many (0, 5–20, 25…). */
export function pluralForm(n: number): 'one' | 'few' | 'many' {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'one'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
  return 'many'
}

/** The page link for a hit: /page/:id?hl=<q>&fz=<fuzzy> (handoff §4 highlighting). */
export function pageLink(pageId: number, q: string, fuzzy: Fuzzy) {
  const query: Record<string, string> = { fz: String(fuzzy) }
  if (q) query.hl = q
  return { path: `/page/${pageId}`, query }
}
