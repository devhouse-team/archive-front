import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import DelaGapsCell from '~/components/dela/DelaGapsCell.vue'
import { useAuthStore } from '~/stores/auth'
import type { DeloSummary, Role, User } from '~/types/api'
import {
  gapsSummary, leafRanges, matchNumbered, normalizeDelaResponse, opisiFromDela, parseDelaQuery, shownLabel,
  toDelaQuery, withFilters,
} from '~/composables/useDelaBrowse'

// Stage 11b: /dela browse (Фонд → Опись), pagination kept in the URL, «Пропуски» summarised, both /api/dela shapes.

function useAppPinia() {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  useAuthStore().clear()
}
const user = (role: Role): User => ({ id: 1, username: role, full_name: `${role} Демо`, role, role_ru: role })

const summary = (i: number, over: Partial<DeloSummary> = {}): DeloSummary => ({
  id: 100 + i, fond: 3, opis: 1 + (i % 2), delo: i, shifr: `Ф.3 Оп.${1 + (i % 2)} Д.${i}`, eais_case_id: i,
  title: `Дело номер ${i}`, year_from: 1950, year_to: 1950, years: '1950',
  fond_creator: 'Отдел здравоохранения', doc_type: 'отчёты', access: 'open', lang_override: null,
  pages_total: 3, pages_done: 3, pages_failed: 0, gaps: [], low_conf: 0, langs: ['ru'], ...over,
})
const SIXTY = Array.from({ length: 60 }, (_, i) => summary(i + 1, i === 2 ? { gaps: [4, 7, 8], low_conf: 4 } : {}))

function queryOf(event: { path?: string, node: { req: { url?: string } } }): URLSearchParams {
  return new URL(event.path ?? event.node.req.url ?? '/', 'http://test').searchParams
}

async function settled() {
  await flushPromises()
  await new Promise(r => setTimeout(r, 50))
  await flushPromises()
}

describe('browse state in the URL', () => {
  it('round-trips q, fond, opis and page, leaving defaults out', () => {
    const s = parseDelaQuery({ q: 'школ', fond: '7', opis: '2', page: '3' })
    expect(s).toEqual({ q: 'школ', fond: 7, opis: 2, page: 3 })
    expect(toDelaQuery(s)).toEqual({ q: 'школ', fond: '7', opis: '2', page: '3' })
    expect(toDelaQuery({ q: ' ', page: 1 })).toEqual({})
  })

  it('ignores junk and an опись without its фонд', () => {
    expect(parseDelaQuery({ fond: 'x', opis: '2', page: '-1' })).toEqual({ q: '', fond: undefined, opis: undefined, page: 1 })
  })

  it('resets to page 1 on any filter change, and a new фонд clears the опись', () => {
    const s = { q: '', fond: 7, opis: 2, page: 4 }
    expect(withFilters(s, { q: 'школ' })).toEqual({ q: 'школ', fond: 7, opis: 2, page: 1 })
    expect(withFilters(s, { opis: 3 })).toEqual({ q: '', fond: 7, opis: 3, page: 1 })
    expect(withFilters(s, { fond: 1 })).toEqual({ q: '', fond: 1, opis: undefined, page: 1 })
    expect(withFilters(s, { fond: undefined })).toEqual({ q: '', fond: undefined, opis: undefined, page: 1 })
  })
})

describe('both /api/dela shapes', () => {
  it('passes the paged shape through', () => {
    const r = normalizeDelaResponse({ total: 60, page: 2, per_page: 25, items: SIXTY.slice(25, 50) }, { q: '', page: 2 })
    expect(r.total).toBe(60)
    expect(r.items[0]!.delo).toBe(26)
  })

  it('pages and filters a plain list on the client (an older backend ignores page and opis)', () => {
    const r = normalizeDelaResponse(SIXTY, { q: '', page: 3 })
    expect(r).toMatchObject({ total: 60 })
    expect(r.items.map(d => d.delo)).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60])
    const odd = normalizeDelaResponse(SIXTY, { q: '', fond: 3, opis: 2, page: 1 })
    expect(odd.total).toBe(30)
    expect(odd.items.every(d => d.opis === 2)).toBe(true)
  })

  it('counts «Показано 26–50 из 60»', () => {
    expect(shownLabel(2, 25, 60)).toBe('Показано 26–50 из 60')
    expect(shownLabel(3, 10, 60)).toBe('Показано 51–60 из 60')
    expect(shownLabel(1, 0, 0)).toBeNull()
  })

  it('lists описи from a plain list', () => {
    expect(opisiFromDela([{ opis: 2 }, { opis: 1 }, { opis: 2 }])).toEqual([1, 2])
  })

  it('matches a typed number first in the Фонд/Опись search', () => {
    const items = [{ value: 17, label: 'Ф.17 — Б' }, { value: 1, label: 'Ф.1 — А' }, { value: 7, label: 'Ф.7 — В' }]
    expect(matchNumbered(items, '1').map(i => i.value)).toEqual([1, 17])
    expect(matchNumbered(items, 'Ф.7').map(i => i.value)).toEqual([7])
    expect(matchNumbered(items, 'в').map(i => i.value)).toEqual([7])
  })
})

describe('«Пропуски» summary', () => {
  it('reads «нет» or «13 листов», with runs collapsed in the full list', () => {
    const gaps = [4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21]
    expect(gapsSummary(gaps)).toBe('13 листов')
    expect(gapsSummary([3])).toBe('1 лист')
    expect(gapsSummary([3, 5])).toBe('2 листа')
    expect(gapsSummary([])).toBeNull()
    expect(leafRanges(gaps)).toBe('4, 7–8, 10–17, 20–21')
  })

  it('renders a focusable button that names the missing leaves', async () => {
    useAppPinia()
    // UApp provides the tooltip context.
    const inApp = (gaps: number[]) => defineComponent({ render: () => h(UApp, null, { default: () => h(DelaGapsCell, { gaps }) }) })
    const w = await mountSuspended(inApp([4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21]))
    const button = w.get('button')
    expect(button.text()).toBe('13 листов')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('Пропуски: 13 листов, номера листов 4, 7–8, 10–17, 20–21')
    const none = await mountSuspended(inApp([]))
    expect(none.text()).toBe('нет')
    expect(none.find('button').exists()).toBe(false)
  })
})

describe('/dela page', { timeout: 30000 }, () => {
  let delaCalls: URLSearchParams[] = []
  let m1Calls = 0
  let m1Status = 200
  let plain = false

  beforeEach(() => {
    useAppPinia()
    delaCalls = []
    m1Calls = 0
    m1Status = 200
    plain = false
    registerEndpoint('/api/dela', (event: { path?: string, node: { req: { url?: string } } }) => {
      const q = queryOf(event)
      delaCalls.push(q)
      const fond = Number(q.get('fond') ?? 0)
      const opis = Number(q.get('opis') ?? 0)
      const rows = SIXTY.filter(d => (!fond || d.fond === fond) && (!opis || d.opis === opis))
      if (plain || !q.has('page')) return rows
      const page = Number(q.get('page'))
      const per = Number(q.get('per_page') ?? 25)
      return { total: rows.length, page, per_page: per, items: rows.slice((page - 1) * per, page * per) }
    })
    registerEndpoint('/api/search/facets', () => ({
      fonds: [{ fond: 3, creator: 'Отдел здравоохранения' }], doc_types: [], creators: [], years: { min: 1950, max: 1950 }, langs: ['ru'],
    }))
    registerEndpoint('/api/m1/cases', (event: { path?: string, node: { req: { url?: string }, res: { statusCode: number } } }) => {
      m1Calls++
      if (m1Status !== 200) {
        event.node.res.statusCode = m1Status
        return { detail: 'ЕАИС недоступна' }
      }
      const q = queryOf(event)
      if (q.has('fond')) return [{ opis: 1, n_dela: 30 }, { opis: 2, n_dela: 30 }, { opis: 9, n_dela: 1 }]
      return [{ fond: 3, fond_creator: 'Отдел здравоохранения', n_opisi: 3, n_dela: 61 }]
    })
  })

  async function mountDela(role: Role, route: string) {
    useAuthStore().setUser(user(role))
    const { default: Dela } = await import('~/pages/dela/index.vue')
    const w = await mountSuspended(defineComponent({ render: () => h(UApp, null, { default: () => h(Dela) }) }), { route })
    await settled()
    return w
  }

  it('asks for the page from the URL and keeps fond and опись when the page turns', async () => {
    const w = await mountDela('reader', '/dela?fond=3&opis=1&page=2')
    const first = delaCalls.find(q => q.has('page'))!
    expect(Object.fromEntries(first)).toMatchObject({ fond: '3', opis: '1', page: '2', per_page: '25' })
    expect(w.get('[role="status"]').text()).toBe('Показано 26–30 из 30')

    const pager = w.get('nav[aria-label="Страницы списка дел"]')
    const toFirst = pager.findAll('button').find(b => b.text() === '1')!
    await toFirst.trigger('click')
    await settled()
    const query = useRouter().currentRoute.value.query
    expect(query).toEqual({ fond: '3', opis: '1' })
    expect(w.get('[role="status"]').text()).toBe('Показано 1–25 из 30')
  })

  it('goes back to page 1 when the search text changes', async () => {
    const w = await mountDela('reader', '/dela?fond=3&page=2')
    await w.get('input[type="search"]').setValue('Дело')
    await new Promise(r => setTimeout(r, 400))
    await settled()
    expect(useRouter().currentRoute.value.query).toEqual({ q: 'Дело', fond: '3' })
  })

  it('renders a plain-list answer, paged on the client', async () => {
    plain = true
    const w = await mountDela('archivist', '/dela?page=3')
    expect(w.get('[role="status"]').text()).toBe('Показано 51–60 из 60')
    expect(w.findAll('tbody tr')).toHaveLength(10)
    expect(w.text()).toContain('Дело номер 51')
  })

  it('shows «На проверке» as a plain number and «Пропуски» as a count', async () => {
    const w = await mountDela('reader', '/dela')
    expect(w.findAll('tbody tr')).toHaveLength(25)
    expect(w.text()).not.toContain('пропущены л.')
    const third = w.findAll('tbody tr')[2]!.findAll('td')
    expect(third[5]!.text()).toBe('3 листа')
    expect(third[6]!.text()).toBe('4')
    expect(third[6]!.find('[class*="badge"], .rounded-md').exists()).toBe(false)
    expect(w.find('tbody [class*="i-lucide-scan-eye"]').exists()).toBe(false)
  })

  it('never asks ЕАИС for options as a reader: фонды come from facets, описи from their own cases', async () => {
    await mountDela('reader', '/dela?fond=3')
    expect(m1Calls).toBe(0)
    // The plain list for the фонд (no `page`) is what the Опись select is built from.
    expect(delaCalls.some(q => q.get('fond') === '3' && !q.has('page'))).toBe(true)
  })

  it('keeps the list working when ЕАИС is down for an editor', async () => {
    m1Status = 503
    const w = await mountDela('archivist', '/dela')
    expect(m1Calls).toBeGreaterThan(0)
    expect(w.text()).toContain('ЕАИС недоступна. Фонды и описи показаны по загруженным делам.')
    expect(w.get('[role="status"]').text()).toBe('Показано 1–25 из 60')
  })
})
