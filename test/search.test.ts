import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import SearchRestrictedBadge from '~/components/search/SearchRestrictedBadge.vue'
import SearchPage from '~/pages/search.vue'
import { useAuthStore } from '~/stores/auth'
import { useCollectionsStore } from '~/stores/collections'
import { plural, pluralForm } from '~/utils/format'
import type { Role, User } from '~/types/api'
import { ROLES } from '~/types/api'
import {
  activeFilterCount, pageLink, parseSearchQuery, stateFromStored, storedFilters, toSearchParams, toSearchQuery,
} from '~/composables/useSearchQuery'

function useAppPinia() {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  useAuthStore().clear()
}
const user = (role: Role, id = 1): User => ({ id, username: role, full_name: `${role} Демо`, role, role_ru: role })

describe('search URL ⇄ state', () => {
  it('round-trips query, fuzzy, sort, page and every filter', () => {
    const query = {
      q: 'мектеп', fuzzy: '2', sort: 'date', page: '3',
      fond: '7', opis: '2', delo: '4', year_from: '1926', year_to: '1940', lang: 'kk-arab', doc_type: 'сообщения', creator: 'Акмолинский отдел',
    }
    const state = parseSearchQuery(query)
    expect(state).toEqual({
      q: 'мектеп', fuzzy: 2, sort: 'date', page: 3,
      filters: { fond: '7', opis: '2', delo: '4', year_from: '1926', year_to: '1940', lang: 'kk-arab', doc_type: 'сообщения', creator: 'Акмолинский отдел' },
    })
    expect(toSearchQuery(state)).toEqual(query)
    expect(parseSearchQuery(toSearchQuery(state) as Record<string, string>)).toEqual(state)
  })

  it('leaves defaults out of the URL', () => {
    expect(toSearchQuery(parseSearchQuery({ q: ' мектеп ', fuzzy: '0', sort: 'rel', page: '1' }))).toEqual({ q: 'мектеп' })
    expect(toSearchQuery(parseSearchQuery({}))).toEqual({})
  })

  it('drops malformed values instead of sending them to the API', () => {
    const s = parseSearchQuery({ q: 'x', fuzzy: '7', sort: 'nope', page: '-2', fond: 'abc', lang: 'en', year_from: '19 26' })
    expect(s).toEqual({ q: 'x', fuzzy: 0, sort: 'rel', page: 1, filters: {} })
  })

  it('sends numeric filters as numbers and keeps the query', () => {
    const params = toSearchParams(parseSearchQuery({ q: 'школа', fond: '1', year_to: '1962', lang: 'ru', page: '2' }))
    expect(params).toEqual({ q: 'школа', fuzzy: 0, sort: 'rel', page: 2, fond: 1, year_to: 1962, lang: 'ru' })
  })

  it('restores saved queries and history (fuzzy and sort ride in filters)', () => {
    const state = parseSearchQuery({ q: 'мектеп', fuzzy: '1', sort: 'shifr', lang: 'kk-cyrl' })
    const stored = storedFilters(state)
    expect(stored).toEqual({ lang: 'kk-cyrl', fuzzy: 1, sort: 'shifr' })
    expect(stateFromStored('мектеп', stored)).toEqual(state)
    expect(stateFromStored('мектеп', { fuzzy: 0 } as never)).toEqual(parseSearchQuery({ q: 'мектеп' }))
  })

  it('counts a year range once', () => {
    expect(activeFilterCount({ year_from: '1926', year_to: '1940', lang: 'ru' })).toBe(2)
    expect(activeFilterCount({ year_to: '1940' })).toBe(1)
  })

  it('links a hit to its page with hl and fz', () => {
    expect(pageLink(6, 'мектеп', 1)).toEqual({ path: '/page/6', query: { hl: 'мектеп', fz: '1' } })
  })

  it('picks Russian plural forms', () => {
    expect([1, 2, 5, 11, 21, 22, 25, 112].map(pluralForm)).toEqual(['one', 'few', 'many', 'many', 'one', 'few', 'many', 'many'])
    expect([1, 3, 5, 21].map(n => plural('plural.leaf', n))).toEqual(['1 лист', '3 листа', '5 листов', '21 лист'])
  })
})

// Mounting the whole page compiles its component tree on first use; under a loaded machine that alone can pass 5 s.
describe('search page', { timeout: 30000 }, () => {
  beforeEach(() => {
    useAppPinia()
    useAuthStore().setUser(user('reader'))
    registerEndpoint('/api/search/facets', () => ({ fonds: [], doc_types: [], creators: [], years: { min: 1926, max: 1962 }, langs: ['ru'] }))
  })

  it('keeps submit disabled until a query is typed, and says why', async () => {
    const w = await mountSuspended(SearchPage, { route: '/search' })
    const submit = w.get('form[role="search"] button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Введите слово или фразу, чтобы начать поиск')

    const input = w.get('form[role="search"] input')
    await input.setValue('   ')
    expect(submit.attributes('disabled')).toBeDefined()

    await input.setValue('мектеп')
    expect(submit.attributes('disabled')).toBeUndefined()
    expect(w.text()).not.toContain('Введите слово или фразу, чтобы начать поиск')
    // The reason and the syntax hint are tied to the field.
    const describedBy = input.attributes('aria-describedby')!
    expect(w.get(`[id="${describedBy}"]`).text()).toContain('И / ИЛИ / НЕ')
  })

  async function settled() {
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await flushPromises()
  }

  it('announces an empty search in the role="status" line (WCAG 4.1.3)', async () => {
    registerEndpoint('/api/search', () => ({ total: 0, pages_total: 0, page: 1, pages: 0, items: [], took: 0.004 }))
    const w = await mountSuspended(SearchPage, { route: '/search?q=%D0%B0%D0%B1%D1%8B%D1%80' })
    await settled()
    expect(w.get('[role="status"]').text()).toBe('Ничего не найдено')
    // The visible panel still carries the heading and the suggestions.
    expect(w.findAll('h2').map(h => h.text())).toContain('Ничего не найдено')
    expect(w.text()).toContain('Искать с опечатками')
  })

  it('announces a failed search in the role="status" line', async () => {
    registerEndpoint('/api/search', (event: { node: { res: { statusCode: number } } }) => {
      event.node.res.statusCode = 500
      return { detail: 'Внутренняя ошибка' }
    })
    const w = await mountSuspended(SearchPage, { route: '/search?q=%D1%88%D0%BA%D0%BE%D0%BB%D0%B0' })
    await settled()
    expect(w.get('[role="status"]').text()).toBe('Поиск не выполнен')
    expect(w.text()).toContain('Повторить')
  })

  it('sends a ?page= past the end back to page 1', async () => {
    registerEndpoint('/api/search', () => ({ total: 25, pages_total: 30, page: 9, pages: 2, items: [], took: 0.003 }))
    const w = await mountSuspended(SearchPage, { route: '/search?q=x&page=9' })
    await settled()
    expect(useRouter().currentRoute.value.query.page).toBeUndefined()
    expect(useRouter().currentRoute.value.query.q).toBe('x')
    expect(w.text()).not.toContain('Ничего не найдено')
  })

  it('announces the count when there are results', async () => {
    registerEndpoint('/api/search', () => ({
      total: 1, pages_total: 2, page: 1, pages: 1, took: 0.007,
      items: [{
        delo_id: 2, shifr: 'Ф.7 Оп.2 Д.9', title: 'Отчёты школ Целинограда', access: 'open', years: '1962', lang: 'kk-cyrl',
        langs: ['kk-cyrl'], doc_type: 'отчёты', best_page_id: 4, leaf: 1, hits_pages: 2, score: 0,
        snippet_html: 'ЕСЕП <mark>мектептері</mark>', pages: [{ page_id: 4, leaf: 1 }, { page_id: 5, leaf: 2 }],
      }],
    }))
    const w = await mountSuspended(SearchPage, { route: '/search?q=%D0%BC%D0%B5%D0%BA%D1%82%D0%B5%D0%BF' })
    await settled()
    expect(w.get('[role="status"]').text()).toContain('Найдено 1 дело · 2 страницы')
    // Label-in-name: the accessible name of «Открыть л. 1» starts with its visible text.
    const open = w.findAll('a').find(a => a.text().includes('Открыть л. 1'))!
    expect(open.attributes('aria-label')!.startsWith('Открыть л. 1')).toBe(true)
    // One label on the disclosure; the state rides on aria-expanded.
    const toggle = w.findAll('button').find(b => b.text().includes('Все страницы дела'))!
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('shows the server\'s «Введите запрос» inline', async () => {
    registerEndpoint('/api/search', () => ({ total: 0, pages_total: 0, items: [], took: 0, error: 'Введите запрос' }))
    const w = await mountSuspended(SearchPage, { route: '/search?q=%22%22' })
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    expect(w.text()).toContain('Введите запрос')
    expect(w.text()).not.toContain('Ничего не найдено')
  })
})

describe('restricted badge', () => {
  beforeEach(useAppPinia)

  it.each(ROLES)('%s', async (role) => {
    useAuthStore().setUser(user(role))
    const restricted = await mountSuspended(SearchRestrictedBadge, { props: { access: 'restricted' } })
    const editor = role === 'admin' || role === 'archivist'
    expect(restricted.text().includes('Ограниченный доступ')).toBe(editor)
    const open = await mountSuspended(SearchRestrictedBadge, { props: { access: 'open' } })
    expect(open.text()).toBe('')
  })
})

describe('add to collection', () => {
  beforeEach(useAppPinia)

  it('is idempotent: a second add of the same page posts nothing; counts come from the server', async () => {
    useAuthStore().setUser(user('reader', 4))
    let posts = 0
    const pages = new Set<number>([9])
    registerEndpoint('/api/collections', () => [{ id: 11, user_id: 4, name: 'Справка №1', created_at: '2026-11-12 00:00:00', n: pages.size, updated_at: null }])
    registerEndpoint('/api/collections/11/items', {
      method: 'POST',
      handler: async (event) => {
        posts++
        // @ts-expect-error the alias is resolved by the test environment and has no type declaration
        const { readBody } = await import('#nuxt-test-utils/h3')
        const body = await readBody(event) as { page_id: number }
        pages.add(body.page_id)
        return { ok: true }
      },
    })
    const store = useCollectionsStore()
    await store.load(true)
    expect(store.list).toHaveLength(1)
    expect(await store.addPage(11, 6)).toBe('added')
    expect(store.has(11, 6)).toBe(true)
    expect(store.list[0]!.n).toBe(2)
    expect(await store.addPage(11, 6)).toBe('already')
    expect(posts).toBe(1)
    expect(store.list[0]!.n).toBe(2)
    // A page already on the server (added elsewhere): posted once, reported as «уже есть», remembered.
    expect(await store.addPage(11, 9)).toBe('already')
    expect(store.has(11, 9)).toBe(true)
    expect(posts).toBe(2)
    // A removal on the collection screen takes the count from the server again.
    pages.delete(6)
    store.forgetPage(11, 6)
    await vi.waitFor(() => expect(store.list[0]!.n).toBe(1))
    expect(store.has(11, 6)).toBe(false)
  })

  it('forgets another user\'s collections after a re-login in the same tab', async () => {
    useAuthStore().setUser(user('reader', 4))
    registerEndpoint('/api/collections', () => [{ id: 11, user_id: 4, name: 'Справка №1', created_at: '', n: 0, updated_at: null }])
    const store = useCollectionsStore()
    await store.load(true)
    useAuthStore().setUser(user('archivist', 2))
    registerEndpoint('/api/collections', () => [])
    await store.load()
    expect(store.list).toEqual([])
  })
})

describe('v-html', () => {
  // Vitest runs from the project root (import.meta.url is not a file: URL under the nuxt environment).
  const appDir = join(process.cwd(), 'app')
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name)
      return statSync(p).isDirectory() ? walk(p) : /\.(vue|ts|tsx|js)$/.test(name) ? [p] : []
    })
  }

  it('is used only for snippet_html, in one component', () => {
    const uses: string[] = []
    const bindings: string[] = []
    for (const file of walk(appDir)) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/v-html\s*=\s*"([^"]*)"|innerHTML\s*=|:inner-?html/gi)) {
        uses.push(`${relative(appDir, file)}: ${m[0]}`)
      }
      for (const m of src.matchAll(/:snippet-html="([^"]*)"/g)) bindings.push(m[1]!)
    }
    expect(uses).toEqual(['components/search/SearchSnippet.vue: v-html="snippetHtml"'])
    // Every caller feeds the component a payload's snippet_html and nothing else.
    expect(bindings.length).toBeGreaterThan(0)
    for (const b of bindings) expect(b).toMatch(/^\w+\.snippet_html$/)
  })

  it('renders the snippet in a dir="auto" container', () => {
    const src = readFileSync(join(appDir, 'components/search/SearchSnippet.vue'), 'utf8')
    expect(src).toMatch(/dir="auto"[\s\S]*v-html="snippetHtml"/)
  })
})
