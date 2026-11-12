import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { DelaPageResponse, DeloSummary } from '~/types/api'
import { translate } from '~/composables/useT'
import { plural } from '~/utils/format'

// Stage 11b helpers for the /dela browse (Фонд → Опись → pages of 25). Pure functions, unit-tested in
// test/cases-browse.test.ts. The URL query is the state: q, fond, opis, page.

export const DELA_PER_PAGE = 25

export interface DelaBrowseState {
  q: string
  fond?: number
  opis?: number
  /** 1-based. */
  page: number
}

function positiveInt(v: unknown): number | undefined {
  const raw = Array.isArray(v) ? v[0] : v
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return undefined
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : undefined
}

/** Reads the browse state from the route query; junk values fall back to «all» and page 1. */
export function parseDelaQuery(query: LocationQuery): DelaBrowseState {
  const rawQ = Array.isArray(query.q) ? query.q[0] : query.q
  const fond = positiveInt(query.fond)
  return {
    q: typeof rawQ === 'string' ? rawQ : '',
    fond,
    // An опись means nothing without its фонд.
    opis: fond === undefined ? undefined : positiveInt(query.opis),
    page: positiveInt(query.page) ?? 1,
  }
}

/** The route query for a state: defaults (empty q, no filter, page 1) are left out, so the URL stays short. */
export function toDelaQuery(s: DelaBrowseState): LocationQueryRaw {
  const out: LocationQueryRaw = {}
  const q = s.q.trim()
  if (q) out.q = q
  if (s.fond !== undefined) {
    out.fond = String(s.fond)
    if (s.opis !== undefined) out.opis = String(s.opis)
  }
  if (s.page > 1) out.page = String(s.page)
  return out
}

/**
 * A filter change: always back to page 1. A new фонд clears the опись (its описи are different), unless the
 * same patch names one.
 */
export function withFilters(s: DelaBrowseState, patch: Partial<Pick<DelaBrowseState, 'q' | 'fond' | 'opis'>>): DelaBrowseState {
  const next: DelaBrowseState = { ...s, ...patch, page: 1 }
  if ('fond' in patch && patch.fond !== s.fond && !('opis' in patch)) next.opis = undefined
  if (next.fond === undefined) next.opis = undefined
  return next
}

export function isFiltered(s: DelaBrowseState): boolean {
  return s.q.trim() !== '' || s.fond !== undefined
}

/**
 * One page of rows from either /api/dela shape. With `page` the backend answers `{total, page, per_page, items}`;
 * an older backend ignores `page` (and `opis`) and sends the whole plain list, which is filtered and sliced here.
 */
export function normalizeDelaResponse(
  resp: DelaPageResponse | DeloSummary[],
  s: DelaBrowseState,
  perPage = DELA_PER_PAGE,
): { total: number, items: DeloSummary[] } {
  if (!Array.isArray(resp)) return { total: resp.total, items: resp.items ?? [] }
  const rows = resp
    .filter(d => s.fond === undefined || d.fond === s.fond)
    .filter(d => s.opis === undefined || d.opis === s.opis)
  const start = (s.page - 1) * perPage
  return { total: rows.length, items: rows.slice(start, start + perPage) }
}

export function lastPage(total: number, perPage = DELA_PER_PAGE): number {
  return Math.max(1, Math.ceil(total / perPage))
}

/** «Показано 26–50 из 60», or null when there is nothing to count. */
export function shownLabel(page: number, count: number, total: number, perPage = DELA_PER_PAGE): string | null {
  if (total <= 0 || count <= 0) return null
  const from = (page - 1) * perPage + 1
  return translate('dela.shown', { from, to: from + count - 1, total })
}

/** Missing leaf numbers with runs collapsed: [4, 7, 8, 10, 11, 12] → «4, 7–8, 10–12». */
export function leafRanges(gaps: readonly number[]): string {
  const sorted = [...new Set(gaps)].sort((a, b) => a - b)
  const parts: string[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++
    parts.push(j === i ? String(sorted[i]) : `${sorted[i]}–${sorted[j]}`)
    i = j + 1
  }
  return parts.join(', ')
}

/** «13 листов» for the Пропуски cell, or null when nothing is missing (the cell then reads «нет»). */
export function gapsSummary(gaps: readonly number[] | null | undefined): string | null {
  if (!gaps || gaps.length === 0) return null
  return plural('plural.leaf', new Set(gaps).size)
}

/** Distinct описи of a plain /api/dela list (already access-filtered by the backend), ascending. */
export function opisiFromDela(rows: readonly Pick<DeloSummary, 'opis'>[]): number[] {
  return [...new Set(rows.map(r => r.opis))].sort((a, b) => a - b)
}

export interface NumberedOption {
  label: string
  value: number
}

/**
 * Search inside a Фонд or Опись select. Digits match the number first («7», «Ф.7», «оп 2»): numbers that start
 * with them, exact match on top. Anything else matches the label text.
 */
export function matchNumbered<T extends NumberedOption>(items: readonly T[], term: string): T[] {
  const t = term.trim().toLowerCase()
  if (!t) return [...items]
  const digits = /^\D{0,4}?(\d+)$/.exec(t)?.[1]
  if (digits) {
    const hits = items.filter(i => String(i.value).startsWith(digits))
    return [...hits.filter(i => String(i.value) === digits), ...hits.filter(i => String(i.value) !== digits)]
  }
  return items.filter(i => i.label.toLowerCase().includes(t))
}
