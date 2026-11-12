import { describe, expect, it } from 'vitest'
import { createMockApi, escapeHtml } from '../server/mock/core'
import type { MockFixtures, MockRequest } from '../server/mock/core'
import fixtures from '../server/mock/fixtures.json'
import type { DeloSummary, SearchResponse } from '~/types/api'

// Д.21 «Личные дела сотрудников» (id 5) is the seeded restricted case.
const RESTRICTED_DELO = 5

function session(role: string) {
  const api = createMockApi(fixtures as unknown as MockFixtures)
  const res = api.handle({ method: 'POST', path: '/api/login', query: {}, body: { username: role, password: role } })
  expect(res.status).toBe(200)
  const token = res.setSession!
  const call = (method: string, path: string, query: Record<string, string> = {}, body?: unknown) =>
    api.handle({ method, path, query, body, session: token } satisfies MockRequest)
  return { api, call }
}

const restrictedPageIds = (fixtures as unknown as MockFixtures).dela.find(d => d.id === RESTRICTED_DELO)!.pages.map(p => p.id)

describe('mock auth', () => {
  it('logs in all four roles and answers /api/me', () => {
    for (const role of ['admin', 'archivist', 'operator', 'reader']) {
      const { call } = session(role)
      expect(call('GET', '/api/me').body).toMatchObject({ username: role, role })
    }
  })

  it('rejects a wrong password with the backend detail', () => {
    const api = createMockApi(fixtures as unknown as MockFixtures)
    const res = api.handle({ method: 'POST', path: '/api/login', query: {}, body: { username: 'reader', password: 'x' } })
    expect(res).toMatchObject({ status: 401, body: { detail: 'Неверный логин или пароль' } })
  })

  it('401 without a session, and logout ends it', () => {
    const { api, call } = session('reader')
    expect(api.handle({ method: 'GET', path: '/api/me', query: {} })).toMatchObject({ status: 401, body: { detail: 'Требуется вход' } })
    expect(call('POST', '/api/logout').setSession).toBe('')
    expect(call('GET', '/api/me').status).toBe(401)
  })

  it('guards STAFF / EDITORS / admin routes with 403', () => {
    expect(session('reader').call('GET', '/api/m1/queue').status).toBe(403)
    expect(session('reader').call('GET', '/api/notifications').status).toBe(403)
    expect(session('operator').call('GET', '/api/review').status).toBe(403)
    expect(session('archivist').call('GET', '/api/users').status).toBe(403)
    expect(session('admin').call('GET', '/api/users').status).toBe(200)
  })
})

describe('mock restricted filtering', () => {
  for (const role of ['operator', 'reader']) {
    it(`${role}: the restricted case leaves no trace`, () => {
      const { call } = session(role)
      const dela = call('GET', '/api/dela').body as DeloSummary[]
      expect(dela.some(d => d.id === RESTRICTED_DELO)).toBe(false)
      expect(dela.every(d => d.access === 'open')).toBe(true)

      expect(call('GET', `/api/dela/${RESTRICTED_DELO}`)).toMatchObject({ status: 404, body: { detail: 'Дело не найдено' } })
      for (const id of restrictedPageIds) {
        expect(call('GET', `/api/pages/${id}`).status).toBe(404)
        expect(call('GET', `/api/pages/${id}/image`).status).toBe(404)
        expect(call('GET', `/api/pages/${id}/export`, { fmt: 'txt' }).status).toBe(404)
      }
      expect(call('GET', `/api/search/delo/${RESTRICTED_DELO}`, { q: 'дело' }).status).toBe(404)

      const facets = call('GET', '/api/search/facets').body as { doc_types: string[] }
      expect(facets.doc_types).not.toContain('личные дела')

      // A collection item pointing at a hidden page cannot be added
      const c = call('POST', '/api/collections', {}, { name: 'Справка' }).body as { id: number }
      expect(call('POST', `/api/collections/${c.id}/items`, {}, { page_id: restrictedPageIds[0] }).status).toBe(404)
    })
  }

  for (const role of ['admin', 'archivist']) {
    it(`${role}: sees the restricted case`, () => {
      const { call } = session(role)
      const dela = call('GET', '/api/dela').body as DeloSummary[]
      expect(dela.find(d => d.id === RESTRICTED_DELO)?.access).toBe('restricted')
      expect(call('GET', `/api/dela/${RESTRICTED_DELO}`).status).toBe(200)
      expect(call('GET', `/api/pages/${restrictedPageIds[0]}`).status).toBe(200)
    })
  }

  it('search hides restricted hits from non-editors only', () => {
    const word = (fixtures as unknown as MockFixtures).pages.find(p => p.delo_id === RESTRICTED_DELO)!
      .words.find(w => w.text.replace(/[^\p{L}]/gu, '').length >= 5)!.text.replace(/[^\p{L}]/gu, '')
    const inResults = (role: string) =>
      (session(role).call('GET', '/api/search', { q: word }).body as SearchResponse).items.some(i => i.delo_id === RESTRICTED_DELO)
    expect(inResults('archivist')).toBe(true)
    expect(inResults('admin')).toBe(true)
    expect(inResults('reader')).toBe(false)
    expect(inResults('operator')).toBe(false)
  })
})

describe('mock search', () => {
  it('returns case-grouped items with escaped snippets and <mark> only', () => {
    const res = session('reader').call('GET', '/api/search', { q: 'мектеп' }).body as SearchResponse
    expect(res.total).toBeGreaterThan(0)
    for (const item of res.items) {
      expect(item.snippet_html).toContain('<mark>')
      const withoutMarks = item.snippet_html.replace(/<\/?mark>/g, '')
      expect(withoutMarks).not.toMatch(/[<>]/)
    }
  })

  it('an empty query is HTTP 200 with an error field (handoff §9)', () => {
    expect(session('reader').call('GET', '/api/search', { q: '' })).toMatchObject({
      status: 200,
      body: { total: 0, items: [], error: 'Введите запрос' },
    })
  })

  it('page detail carries the per-engine low_word_conf', () => {
    expect(session('reader').call('GET', '/api/pages/9').body).toMatchObject({ engine: 'tesseract', low_word_conf: 60 })
  })

  it('escapes HTML in user data', () => {
    expect(escapeHtml('<script>"x"&\'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot;&amp;&#x27;y&#x27;&lt;/script&gt;')
  })
})
