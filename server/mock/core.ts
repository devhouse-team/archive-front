// In-memory mock of the FastAPI backend for offline work and tests (NUXT_PUBLIC_API_MOCK=1).
// Built from real responses (fixtures.json, captured by scripts/capture-mock-fixtures.mjs) and handoff §5.
// Follows the backend's rules: cookie session, role guards (STAFF / EDITORS / admin), restricted cases hidden
// from operator and reader everywhere and 404 on direct links, errors as {"detail": "..."}.
// Server-side messages copy the backend's own Russian strings so the UI sees what production sends.

import type {
  Access, AdminUser, CollectionItem, DeloDetail, DeloPage, DeloSummary, EaisCase, FileStatus, Health, JournalRow,
  Lang, M1File, Notification, PageDetail, Role, SearchItem, StatsRow, User, Word,
} from '../../app/types/api'

export interface MockFixtures {
  users: AdminUser[]
  health: Health
  notifications: Notification[]
  files: M1File[]
  journal: JournalRow[]
  statsDay: StatsRow[]
  statsMonth: StatsRow[]
  dela: DeloDetail[]
  pages: Array<Omit<PageDetail, 'highlight_word_ids'>>
  eaisCases: EaisCase[]
}

export interface MockRequest {
  method: string
  path: string
  query: Record<string, string>
  body?: unknown
  /** Value of the `session` cookie. */
  session?: string
}

export interface MockResponse {
  status: number
  body?: unknown
  /** Raw body (exports, images); `body` is ignored when set. */
  raw?: string
  headers?: Record<string, string>
  /** New session token to set as the `session` cookie; '' clears it. */
  setSession?: string
}

const STAFF: Role[] = ['admin', 'archivist', 'operator']
const EDITORS: Role[] = ['admin', 'archivist']
const ROLES_RU: Record<Role, string> = { admin: 'Администратор', archivist: 'Архивист', operator: 'Оператор', reader: 'Читатель' }
const NO_ACCESS = 'Недостаточно прав для этого раздела. Обратитесь к администратору.'
const LOW_WORD_CONF = 60
const PER_PAGE = 20

class HttpError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail)
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function now(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

interface ParsedQuery {
  include: string[]
  exclude: string[]
}

/** A small stand-in for the server's query syntax: words, "phrases", И/ИЛИ/НЕ, -word. Prefix matching for morphology. */
export function parseQuery(q: string): ParsedQuery {
  const include: string[] = []
  const exclude: string[] = []
  let negateNext = false
  for (const raw of q.replace(/["«»]/g, ' ').split(/\s+/).filter(Boolean)) {
    const upper = raw.toUpperCase()
    if (['И', 'AND', 'ИЛИ', 'OR'].includes(upper)) continue
    if (['НЕ', 'NOT'].includes(upper)) {
      negateNext = true
      continue
    }
    const neg = negateNext || raw.startsWith('-')
    negateNext = false
    const term = norm(raw.replace(/^-/, ''))
    if (!term) continue
    ;(neg ? exclude : include).push(term)
  }
  return { include, exclude }
}

function stem(term: string, fuzzy: number): string {
  const keep = fuzzy > 0 ? Math.max(3, term.length - 3) : Math.max(4, term.length - 2)
  return term.slice(0, Math.min(term.length, keep))
}

function wordMatches(word: Word, term: string, fuzzy: number): boolean {
  const w = norm(word.text)
  const s = stem(term, fuzzy)
  return fuzzy > 1 ? w.includes(s) : w.startsWith(s)
}

export function createMockApi(fixtures: MockFixtures) {
  // ---------- state (fresh copy per instance) ----------
  const users = fixtures.users.map(u => ({ ...u, password: u.username }))
  const sessions = new Map<string, number>()
  const dela = new Map<number, DeloDetail>(clone(fixtures.dela).map(d => [d.id, d]))
  const pages = new Map<number, Omit<PageDetail, 'highlight_word_ids'>>(clone(fixtures.pages).map(p => [p.id, p]))
  const files = clone(fixtures.files)
  const notifications = clone(fixtures.notifications)
  const journal = clone(fixtures.journal)
  const eaisCases = clone(fixtures.eaisCases)
  const collections: Array<{ id: number, user_id: number, name: string, created_at: string, items: Map<number, string> }> = []
  const saved: Array<{ id: number, user_id: number, name: string, q: string, filters: Record<string, unknown> }> = []
  const history: Array<{ id: number, user_id: number, ts: string, q: string, filters: Record<string, unknown>, hits: number }> = []
  let eaisOnline = fixtures.health.eais_online
  let eaisDownSince: number | null = null
  let seq = 1000
  const nextId = () => ++seq

  // ---------- helpers ----------
  const me = (u: AdminUser): User => ({ id: u.id, username: u.username, full_name: u.full_name, role: u.role, role_ru: ROLES_RU[u.role] })

  function currentUser(req: MockRequest): AdminUser {
    const id = req.session ? sessions.get(req.session) : undefined
    const user = id === undefined ? undefined : users.find(u => u.id === id)
    if (!user) throw new HttpError(401, 'Требуется вход')
    return user
  }

  function require(req: MockRequest, roles: Role[]): AdminUser {
    const user = currentUser(req)
    if (!roles.includes(user.role)) throw new HttpError(403, NO_ACCESS)
    return user
  }

  const canSee = (user: AdminUser, access: Access) => access === 'open' || EDITORS.includes(user.role)

  function getDelo(user: AdminUser, id: number): DeloDetail {
    const d = dela.get(id)
    if (!d || !canSee(user, d.access)) throw new HttpError(404, 'Дело не найдено')
    return d
  }

  function getPage(user: AdminUser, id: number) {
    const p = pages.get(id)
    if (!p) throw new HttpError(404, 'Страница не найдена')
    return { page: p, delo: getDelo(user, p.delo_id) }
  }

  function summary(d: DeloDetail): DeloSummary {
    const { pages: list, ...rest } = d
    const st = (s: DeloPage['status']) => list.filter(p => p.status === s).length
    return {
      ...rest,
      pages_total: list.length,
      pages_done: st('done'),
      pages_failed: st('failed'),
      low_conf: list.filter(p => p.status === 'done' && p.low_conf === 1 && p.reviewed === 0).length,
    }
  }

  function syncDeloPage(pageId: number) {
    const p = pages.get(pageId)
    if (!p) return
    const d = dela.get(p.delo_id)
    const row = d?.pages.find(x => x.id === pageId)
    if (row) Object.assign(row, { mean_conf: p.mean_conf, low_conf: p.low_conf, reviewed: p.reviewed, status: p.status })
  }

  function visibleDela(user: AdminUser) {
    return [...dela.values()].filter(d => canSee(user, d.access)).sort((a, b) => a.fond - b.fond || a.opis - b.opis || a.delo - b.delo)
  }

  function log(actor: string, action: string, result: JournalRow['result'] = 'ok', details = '', shifr = '') {
    journal.unshift({ id: nextId(), ts: now(), actor, action, file_name: '', shifr, result, details })
  }

  function int(v: unknown, fallback = 0): number {
    const n = Number.parseInt(String(v ?? ''), 10)
    return Number.isFinite(n) ? n : fallback
  }

  function retryIn(): number | null {
    if (eaisOnline || eaisDownSince === null) return null
    const elapsed = Math.floor((Date.now() - eaisDownSince) / 1000)
    return 60 - (elapsed % 60)
  }

  function highlightIds(page: Omit<PageDetail, 'highlight_word_ids'>, q: string, fuzzy: number): number[] {
    if (!q.trim()) return []
    const { include } = parseQuery(q)
    return page.words.filter(w => include.some(t => wordMatches(w, t, fuzzy))).map(w => w.id)
  }

  function snippet(page: Omit<PageDetail, 'highlight_word_ids'>, include: string[], fuzzy: number): string {
    const words = [...page.words].sort((a, b) => a.idx - b.idx)
    const isHit = (w: Word) => include.some(t => wordMatches(w, t, fuzzy))
    const first = Math.max(0, words.findIndex(isHit))
    const start = Math.max(0, first - 4)
    const end = Math.min(words.length, start + 18)
    const body = words.slice(start, end)
      .map(w => (isHit(w) ? `<mark>${escapeHtml(w.text)}</mark>` : escapeHtml(w.text)))
      .join(' ')
    return `${start > 0 ? '… ' : ''}${body}${end < words.length ? ' …' : ''}`
  }

  function pageMatches(page: Omit<PageDetail, 'highlight_word_ids'>, parsed: ParsedQuery, fuzzy: number): number {
    if (page.status !== 'done') return 0
    const hits = parsed.include.map(t => page.words.filter(w => wordMatches(w, t, fuzzy)).length)
    if (hits.some(h => h === 0)) return 0
    if (parsed.exclude.some(t => page.words.some(w => wordMatches(w, t, fuzzy)))) return 0
    return hits.reduce((a, b) => a + b, 0)
  }

  function search(user: AdminUser, query: Record<string, string>) {
    const q = (query.q ?? '').trim()
    const fuzzy = int(query.fuzzy)
    if (!q) return { total: 0, pages_total: 0, items: [], took: 0, error: 'Введите запрос' }
    const parsed = parseQuery(q)
    if (!parsed.include.length) return { total: 0, pages_total: 0, items: [], took: 0, error: 'Не удалось разобрать запрос' }
    const t0 = Date.now()
    const items: Array<SearchItem & { _hits: number, _year: number }> = []
    let pagesTotal = 0
    for (const d of visibleDela(user)) {
      if (query.fond && d.fond !== int(query.fond)) continue
      if (query.opis && d.opis !== int(query.opis)) continue
      if (query.delo && d.delo !== int(query.delo)) continue
      if (query.year_from && (d.year_to ?? 0) < int(query.year_from)) continue
      if (query.year_to && (d.year_from ?? 9999) > int(query.year_to)) continue
      if (query.doc_type && d.doc_type !== query.doc_type) continue
      if (query.creator && d.fond_creator !== query.creator) continue
      const matched = d.pages
        .map(row => pages.get(row.id))
        .filter((p): p is Omit<PageDetail, 'highlight_word_ids'> => !!p && (!query.lang || p.lang === query.lang))
        .map(p => ({ p, hits: pageMatches(p, parsed, fuzzy) }))
        .filter(x => x.hits > 0)
      if (!matched.length) continue
      pagesTotal += matched.length
      const best = [...matched].sort((a, b) => b.hits - a.hits || a.p.leaf - b.p.leaf)[0]!
      const langs = [...new Set(matched.map(x => x.p.lang).filter((l): l is Lang => !!l))]
      items.push({
        delo_id: d.id, shifr: d.shifr, title: d.title, access: d.access, years: d.years,
        lang: best.p.lang, langs, doc_type: d.doc_type, best_page_id: best.p.id, leaf: best.p.leaf,
        hits_pages: matched.length, snippet_html: snippet(best.p, parsed.include, fuzzy), score: 0,
        pages: matched.map(x => ({ page_id: x.p.id, leaf: x.p.leaf })).sort((a, b) => a.leaf - b.leaf),
        _hits: matched.reduce((a, x) => a + x.hits, 0), _year: d.year_from ?? 0,
      })
    }
    const sort = query.sort ?? 'rel'
    if (sort === 'date') items.sort((a, b) => b._year - a._year)
    else if (sort === 'shifr') items.sort((a, b) => a.shifr.localeCompare(b.shifr, 'ru', { numeric: true }))
    else items.sort((a, b) => b._hits - a._hits)
    const page = Math.max(1, int(query.page, 1))
    const total = items.length
    const slice = items.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(({ _hits, _year, ...it }) => it)
    const filters = Object.fromEntries(Object.entries(query).filter(([k]) => !['q', 'sort', 'page'].includes(k)))
    history.unshift({ id: nextId(), user_id: user.id, ts: now(), q, filters: { ...filters, fuzzy }, hits: total })
    return { total, pages_total: pagesTotal, page, pages: Math.ceil(total / PER_PAGE), took: (Date.now() - t0) / 1000, items: slice }
  }

  function exportText(list: Array<Omit<PageDetail, 'highlight_word_ids'>>, shifr: string): string {
    return list.map((p) => {
      const lines = new Map<number, Word[]>()
      for (const w of [...p.words].sort((a, b) => a.idx - b.idx)) lines.set(w.line, [...(lines.get(w.line) ?? []), w])
      const text = [...lines.keys()].sort((a, b) => a - b).map(k => lines.get(k)!.map(w => w.text).join(' ')).join('\n')
      return `${shifr} л.${p.leaf}\n\n${text}\n`
    }).join('\n')
  }

  function attachment(raw: string, contentType: string, filename: string): MockResponse {
    return {
      status: 200,
      raw,
      headers: { 'content-type': contentType, 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` },
    }
  }

  function exportPages(user: AdminUser, list: Array<Omit<PageDetail, 'highlight_word_ids'>>, shifr: string, fmt: string, name: string): MockResponse {
    if (!list.length) throw new HttpError(404, 'Нет распознанных страниц')
    log(user.username, `экспорт ${fmt.toUpperCase()}`, 'ok', name, shifr)
    if (fmt === 'txt') return attachment(exportText(list, shifr), 'text/plain; charset=utf-8', `${name}.txt`)
    if (fmt === 'json') return attachment(JSON.stringify(list.map(p => ({ shifr, leaf: p.leaf, words: p.words }))), 'application/json', `${name}.json`)
    throw new HttpError(400, 'Неизвестный формат')
  }

  function pageImage(page: Omit<PageDetail, 'highlight_word_ids'>, w: number): MockResponse {
    const boxes = page.words.map(x => `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" rx="4" fill="#3d3a33" fill-opacity="0.22"/>`).join('')
    const size = w ? ` width="${Math.max(80, Math.min(w, 800))}"` : ` width="${page.width}" height="${page.height}"`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}"${size}><rect width="100%" height="100%" fill="#F2EEE4"/>${boxes}</svg>`
    return { status: 200, raw: svg, headers: { 'content-type': 'image/svg+xml' } }
  }

  // ---------- routes ----------
  type Handler = (req: MockRequest, params: string[]) => MockResponse | unknown
  const routes: Array<[string, RegExp, Handler]> = []
  const on = (method: string, pattern: string, handler: Handler) =>
    routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, '(\\d+)')}$`), handler])

  // 5.1 auth and state
  on('POST', '/api/login', (req) => {
    const body = (req.body ?? {}) as { username?: string, password?: string }
    const u = users.find(x => x.username === (body.username ?? '').trim())
    if (!u || u.password !== (body.password ?? '')) {
      log(body.username || '?', 'вход', 'error', 'неверный логин или пароль')
      throw new HttpError(401, 'Неверный логин или пароль')
    }
    const token = `mock-${u.username}-${nextId()}-${Math.random().toString(36).slice(2)}`
    sessions.set(token, u.id)
    log(u.username, 'вход')
    return { status: 200, body: me(u), setSession: token }
  })
  on('POST', '/api/logout', (req) => {
    if (req.session) sessions.delete(req.session)
    return { status: 200, body: { ok: true }, setSession: '' }
  })
  on('GET', '/api/me', req => me(currentUser(req)))
  on('GET', '/api/health', (req) => {
    currentUser(req)
    const nri = retryIn()
    const t = Date.now() / 1000
    return {
      ...fixtures.health, eais_online: eaisOnline,
      eais_down_since: eaisDownSince ? new Date(eaisDownSince).toISOString() : null,
      next_retry_in: nri, next_retry_at: nri === null ? null : t + nri, server_time: t,
    }
  })
  on('GET', '/api/notifications', (req) => {
    require(req, STAFF)
    return { unread: notifications.filter(n => n.read === 0).length, items: notifications.slice(0, 20) }
  })
  on('POST', '/api/notifications/read', (req) => {
    require(req, STAFF)
    for (const n of notifications) n.read = 1
    return { ok: true }
  })

  // 5.2 M1
  on('POST', '/api/upload', (req) => {
    require(req, STAFF)
    throw new HttpError(400, 'Загрузка файлов недоступна в демо-режиме без сервера')
  })
  on('GET', '/api/m1/files', (req) => {
    require(req, STAFF)
    const { status, q } = req.query
    const limit = int(req.query.limit, 200)
    return files
      .filter(f => !status || f.status === status)
      .filter(f => !q || f.name.includes(q) || f.shifr.includes(q))
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
  })
  on('GET', '/api/m1/files/:id/preview', (req, [id]) => {
    require(req, STAFF)
    if (!files.some(f => f.id === int(id))) throw new HttpError(404, 'Файл не найден')
    throw new HttpError(415, 'Превью недоступно')
  })
  on('GET', '/api/m1/queue', (req) => {
    require(req, STAFF)
    const count = (s: FileStatus) => files.filter(f => f.status === s).length
    const allPages = [...pages.values()]
    const nri = retryIn()
    return {
      files: { queued: count('queued'), retry: count('retry'), uploaded: count('uploaded'), invalid: count('invalid') },
      uploaded_today: count('uploaded'),
      pages_today: allPages.filter(p => p.status === 'done').length,
      pages_done: allPages.filter(p => p.status === 'done').length,
      ocr: { pending: allPages.filter(p => p.status === 'pending').length, running: allPages.filter(p => p.status === 'running').length, failed: allPages.filter(p => p.status === 'failed').length },
      ocr_failed: [],
      review: allPages.filter(p => p.status === 'done' && p.low_conf === 1 && p.reviewed === 0).length,
      next_retry_at: nri === null ? null : Date.now() / 1000 + nri,
      next_retry_in: nri,
    }
  })
  on('GET', '/api/m1/check-case', (req) => {
    require(req, STAFF)
    if (!eaisOnline) return { found: null, detail: 'ЕАИС недоступна' }
    const c = eaisCases.find(x => x.fond === int(req.query.fond) && x.opis === int(req.query.opis) && x.delo === int(req.query.delo))
    return { found: !!c, title: c ? c.title : null }
  })
  on('POST', '/api/m1/files/:id/shifr', (req, [id]) => {
    const user = require(req, STAFF)
    const f = files.find(x => x.id === int(id))
    if (!f) throw new HttpError(404, 'Файл не найден')
    const body = (req.body ?? {}) as Record<string, unknown>
    const [fond, opis, delo] = ['fond', 'opis', 'delo'].map(k => int(body[k], Number.NaN))
    if ([fond, opis, delo].some(n => Number.isNaN(n))) throw new HttpError(400, 'Фонд, опись, дело и лист — целые числа')
    const leaf = int(body.leaf, 0) || null
    Object.assign(f, { fond, opis, delo, leaf_start: leaf, shifr_source: 'manual', status: 'queued', error_reason: null, updated_at: now() })
    f.shifr = `Ф.${fond} Оп.${opis} Д.${delo}${leaf ? ` л.${leaf}` : ''}`
    log(user.username, 'исправление шифра', 'info', '', f.shifr)
    return f
  })
  on('POST', '/api/m1/files/:id/retry', (req, [id]) => {
    const user = require(req, STAFF)
    const f = files.find(x => x.id === int(id))
    if (!f) throw new HttpError(404, 'Файл не найден')
    if (f.status === 'invalid') Object.assign(f, { status: 'queued', error_reason: null, updated_at: now() })
    log(user.username, f.status === 'retry' ? 'отправить сейчас' : 'отправить повторно', 'info', String(f.id))
    return f
  })
  on('POST', '/api/m1/jobs/:id/retry', (req) => {
    require(req, STAFF)
    throw new HttpError(404, 'Задача не найдена')
  })
  on('GET', '/api/m1/stats', (req) => {
    require(req, STAFF)
    return req.query.period === 'month' ? fixtures.statsMonth : fixtures.statsDay
  })
  on('GET', '/api/m1/journal', (req) => {
    require(req, STAFF)
    const { q, result } = req.query
    const limit = int(req.query.limit, 50)
    const offset = int(req.query.offset, 0)
    return journal
      .filter(r => !result || r.result === result)
      .filter(r => !q || [r.actor, r.action, r.file_name, r.shifr, r.details].some(v => v.includes(q)))
      .slice(offset, offset + limit)
  })

  // 5.3 дела, pages, review
  on('GET', '/api/dela', (req) => {
    const user = currentUser(req)
    const { q } = req.query
    const fond = int(req.query.fond, 0)
    return visibleDela(user)
      .filter(d => !q || d.shifr.includes(q) || d.title.toLowerCase().includes(q.toLowerCase()))
      .filter(d => !fond || d.fond === fond)
      .map(summary)
  })
  on('GET', '/api/dela/:id', (req, [id]) => {
    const d = getDelo(currentUser(req), int(id))
    return { ...summary(d), pages: d.pages }
  })
  on('POST', '/api/dela/:id/ocr', (req, [id]) => {
    const user = require(req, EDITORS)
    const d = getDelo(user, int(id))
    const lang = ((req.body ?? {}) as { lang?: string }).lang || 'auto'
    if (!['auto', 'ru', 'kk-cyrl', 'kk-latn', 'kk-arab'].includes(lang)) throw new HttpError(400, 'Неизвестный язык')
    d.lang_override = lang === 'auto' ? null : lang as Lang
    log(user.username, 'перераспознавание дела', 'info', `язык: ${lang}, стр.: ${d.pages.length}`, d.shifr)
    return { queued: d.pages.length }
  })
  on('GET', '/api/review', (req) => {
    require(req, EDITORS)
    return [...pages.values()]
      .filter(p => p.status === 'done' && p.low_conf === 1 && p.reviewed === 0)
      .sort((a, b) => (a.mean_conf ?? 0) - (b.mean_conf ?? 0))
      .map(p => ({
        id: p.id, leaf: p.leaf, lang: p.lang, mean_conf: p.mean_conf, shifr: p.delo.shifr, title: p.delo.title,
        delo_id: p.delo_id, low_share: p.words.length ? p.words.filter(w => w.conf < LOW_WORD_CONF).length / p.words.length : 0,
      }))
  })
  on('GET', '/api/pages/:id', (req, [id]) => {
    const { page } = getPage(currentUser(req), int(id))
    // Per-engine threshold, as the backend sends it since 2026-11-12.
    const low_word_conf = page.engine === 'vlm' ? 96.5 : LOW_WORD_CONF
    return { ...page, low_word_conf, highlight_word_ids: highlightIds(page, req.query.hl ?? '', int(req.query.fz)) }
  })
  on('GET', '/api/pages/:id/image', (req, [id]) => {
    const { page } = getPage(currentUser(req), int(id))
    return pageImage(page, int(req.query.w, 0))
  })
  on('PATCH', '/api/pages/:id/words', (req, [id]) => {
    const user = require(req, EDITORS)
    const { page, delo } = getPage(user, int(id))
    const edits = Array.isArray(req.body) ? req.body as Array<{ id?: unknown, text?: unknown }> : []
    let changed = 0
    for (const e of edits) {
      const w = page.words.find(x => x.id === int(e.id))
      if (w && typeof e.text === 'string' && e.text !== w.text) {
        w.text = e.text
        w.corrected = w.text === w.ocr_text ? 0 : 1
        changed++
      }
    }
    const corrected = page.words.filter(w => w.corrected === 1).length
    const cer = page.words.length ? corrected / page.words.length : 0
    page.cer = cer
    log(user.username, 'исправление OCR', 'ok', `исправлено слов: ${changed}`, `${delo.shifr} л.${page.leaf}`)
    return { changed, cer }
  })
  on('POST', '/api/pages/:id/reviewed', (req, [id]) => {
    const user = require(req, EDITORS)
    const { page, delo } = getPage(user, int(id))
    page.reviewed = 1
    syncDeloPage(page.id)
    log(user.username, 'страница проверена', 'ok', '', `${delo.shifr} л.${page.leaf}`)
    const next = [...pages.values()]
      .filter(p => p.status === 'done' && p.low_conf === 1 && p.reviewed === 0)
      .sort((a, b) => (a.mean_conf ?? 0) - (b.mean_conf ?? 0))[0]
    return { ok: true, next_review_id: next ? next.id : null }
  })
  on('POST', '/api/pages/:id/retry', (req, [id]) => {
    getPage(require(req, STAFF), int(id))
    return { ok: true }
  })
  on('GET', '/api/pages/:id/export', (req, [id]) => {
    const user = currentUser(req)
    const { page, delo } = getPage(user, int(id))
    return exportPages(user, [page], delo.shifr, req.query.fmt ?? 'txt', `${delo.shifr.replace(/ /g, '_')}_л${page.leaf}`)
  })
  on('GET', '/api/dela/:id/export', (req, [id]) => {
    const user = currentUser(req)
    const d = getDelo(user, int(id))
    const list = d.pages.map(r => pages.get(r.id)).filter((p): p is Omit<PageDetail, 'highlight_word_ids'> => !!p && p.status === 'done')
    return exportPages(user, list, d.shifr, req.query.fmt ?? 'txt', d.shifr.replace(/ /g, '_'))
  })

  // 5.4 search
  on('GET', '/api/search', req => search(currentUser(req), req.query))
  on('GET', '/api/search/delo/:id', (req, [id]) => {
    const user = currentUser(req)
    const d = getDelo(user, int(id))
    const parsed = parseQuery(req.query.q ?? '')
    const fuzzy = int(req.query.fuzzy)
    if (!parsed.include.length) return []
    return d.pages
      .map(r => pages.get(r.id))
      .filter((p): p is Omit<PageDetail, 'highlight_word_ids'> => !!p && pageMatches(p, parsed, fuzzy) > 0)
      .map(p => ({ page_id: p.id, leaf: p.leaf, snippet_html: snippet(p, parsed.include, fuzzy) }))
  })
  on('GET', '/api/search/facets', (req) => {
    const list = visibleDela(currentUser(req))
    const fonds = [...new Map(list.map(d => [d.fond, { fond: d.fond, creator: d.fond_creator }])).values()]
    const years = list.flatMap(d => [d.year_from, d.year_to]).filter((y): y is number => typeof y === 'number')
    const langs = new Set(list.flatMap(d => d.pages.map(p => p.lang)).filter((l): l is Lang => !!l))
    return {
      fonds,
      doc_types: [...new Set(list.map(d => d.doc_type))].sort(),
      creators: [...new Set(list.map(d => d.fond_creator))].sort(),
      years: { min: years.length ? Math.min(...years) : null, max: years.length ? Math.max(...years) : null },
      langs: [...langs].sort(),
    }
  })
  on('GET', '/api/history', (req) => {
    const user = currentUser(req)
    return history.filter(h => h.user_id === user.id).slice(0, 20)
      .map(h => ({ ...h, filters_json: JSON.stringify(h.filters) }))
  })
  on('GET', '/api/saved-queries', (req) => {
    const user = currentUser(req)
    return saved.filter(s => s.user_id === user.id).sort((a, b) => b.id - a.id)
      .map(s => ({ ...s, filters_json: JSON.stringify(s.filters) }))
  })
  on('POST', '/api/saved-queries', (req) => {
    const user = currentUser(req)
    const body = (req.body ?? {}) as { name?: string, q?: string, filters?: Record<string, unknown> }
    const id = nextId()
    saved.push({ id, user_id: user.id, name: (body.name ?? '').trim() || body.q || 'Запрос', q: body.q ?? '', filters: body.filters ?? {} })
    return { id }
  })
  on('DELETE', '/api/saved-queries/:id', (req, [id]) => {
    const user = currentUser(req)
    const i = saved.findIndex(s => s.id === int(id) && s.user_id === user.id)
    if (i !== -1) saved.splice(i, 1)
    return { ok: true }
  })

  // 5.5 collections
  function getCollection(user: AdminUser, id: number) {
    const c = collections.find(x => x.id === id && x.user_id === user.id)
    if (!c) throw new HttpError(404, 'Подборка не найдена')
    return c
  }

  function collectionItems(user: AdminUser, c: (typeof collections)[number]): CollectionItem[] {
    const out: CollectionItem[] = []
    for (const [pageId, addedAt] of c.items) {
      const p = pages.get(pageId)
      const d = p && dela.get(p.delo_id)
      if (!p || !d || !canSee(user, d.access)) continue
      out.push({
        page_id: p.id, leaf: p.leaf, lang: p.lang, delo_id: d.id, shifr: d.shifr, title: d.title,
        year_from: d.year_from, year_to: d.year_to, years: d.years, eais_case_id: d.eais_case_id, access: d.access, added_at: addedAt,
      })
    }
    return out.sort((a, b) => a.shifr.localeCompare(b.shifr, 'ru', { numeric: true }) || a.leaf - b.leaf)
  }

  on('GET', '/api/collections', (req) => {
    const user = currentUser(req)
    return collections.filter(c => c.user_id === user.id).sort((a, b) => b.id - a.id).map(c => ({
      id: c.id, user_id: c.user_id, name: c.name, created_at: c.created_at, n: c.items.size,
      updated_at: c.items.size ? [...c.items.values()].sort().at(-1) : null,
    }))
  })
  on('POST', '/api/collections', (req) => {
    const user = currentUser(req)
    const name = String(((req.body ?? {}) as { name?: unknown }).name ?? '').trim()
    if (!name) throw new HttpError(400, 'Введите название подборки')
    const id = nextId()
    collections.push({ id, user_id: user.id, name, created_at: now(), items: new Map() })
    return { id, name }
  })
  on('GET', '/api/collections/:id', (req, [id]) => {
    const user = currentUser(req)
    const c = getCollection(user, int(id))
    return { id: c.id, user_id: c.user_id, name: c.name, created_at: c.created_at, items: collectionItems(user, c) }
  })
  on('DELETE', '/api/collections/:id', (req, [id]) => {
    const user = currentUser(req)
    const c = getCollection(user, int(id))
    collections.splice(collections.indexOf(c), 1)
    return { ok: true }
  })
  on('POST', '/api/collections/:id/items', (req, [id]) => {
    const user = currentUser(req)
    const c = getCollection(user, int(id))
    const pageId = int(((req.body ?? {}) as { page_id?: unknown }).page_id)
    getPage(user, pageId)
    if (!c.items.has(pageId)) c.items.set(pageId, now())
    return { ok: true }
  })
  on('DELETE', '/api/collections/:id/items/:pid', (req, [id, pid]) => {
    const user = currentUser(req)
    getCollection(user, int(id)).items.delete(int(pid))
    return { ok: true }
  })
  on('GET', '/api/collections/:id/export', (req, [id]) => {
    const user = currentUser(req)
    const c = getCollection(user, int(id))
    const fmt = req.query.fmt ?? 'xlsx'
    if (fmt !== 'csv') throw new HttpError(400, 'Неизвестный формат')
    const head = ['Шифр', 'Лист', 'Заголовок', 'Годы', 'Язык', 'Ссылка', 'Карточка ЕАИС']
    const rows = collectionItems(user, c).map(it => [it.shifr, it.leaf, it.title, it.years, it.lang ?? '', `/#/page/${it.page_id}`, `/mock-eais/api/cases/${it.eais_case_id}`])
    const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    return attachment(`\uFEFF${csv}`, 'text/csv; charset=utf-8', `${c.name}.csv`)
  })

  // 5.6 admin and the mock ЕАИС
  on('GET', '/api/users', (req) => {
    require(req, ['admin'])
    return users.map(({ id, username, full_name, role }) => ({ id, username, full_name, role }))
  })
  on('POST', '/api/users', (req) => {
    const admin = require(req, ['admin'])
    const body = (req.body ?? {}) as { username?: string, password?: string, role?: Role, full_name?: string }
    const username = (body.username ?? '').trim()
    if (!username || !body.password || !body.role || !(body.role in ROLES_RU)) throw new HttpError(400, 'Укажите логин, пароль и роль')
    if (users.some(u => u.username === username)) throw new HttpError(400, 'Такой логин уже есть')
    const id = nextId()
    users.push({ id, username, password: body.password, role: body.role, full_name: body.full_name || username })
    log(admin.username, 'создан пользователь', 'ok', `${username} (${ROLES_RU[body.role]})`)
    return { id }
  })
  on('PATCH', '/api/users/:id', (req, [id]) => {
    const admin = require(req, ['admin'])
    const u = users.find(x => x.id === int(id))
    if (!u) throw new HttpError(404, 'Пользователь не найден')
    const body = (req.body ?? {}) as { role?: Role, password?: string }
    if (body.role) {
      if (!(body.role in ROLES_RU)) throw new HttpError(400, 'Неизвестная роль')
      u.role = body.role
    }
    if (body.password) {
      u.password = body.password
      for (const [token, uid] of sessions) if (uid === u.id && uid !== admin.id) sessions.delete(token)
    }
    return { ok: true }
  })
  on('GET', '/mock-eais/api/status', () => ({ online: eaisOnline, cases: eaisCases.length, files: eaisCases.reduce((a, c) => a + c.files.length, 0) }))
  on('POST', '/mock-eais/api/status', (req) => {
    const user = currentUser(req)
    if (user.role !== 'admin') throw new HttpError(403, NO_ACCESS)
    const online = !!((req.body ?? {}) as { online?: unknown }).online
    if (online !== eaisOnline) {
      eaisOnline = online
      eaisDownSince = online ? null : Date.now()
      notifications.unshift({ id: nextId(), ts: now(), level: online ? 'info' : 'warn', message: online ? 'ЕАИС снова на связи' : 'ЕАИС недоступна', read: 0 })
    }
    return { online }
  })
  on('GET', '/mock-eais/api/cases', (req) => {
    const { fond, opis, delo } = req.query
    if (fond && opis && delo) {
      const c = eaisCases.find(x => x.fond === int(fond) && x.opis === int(opis) && x.delo === int(delo))
      if (!c) throw new HttpError(404, 'Дело не найдено в ЕАИС')
      const { files: _files, ...row } = c
      return row
    }
    return eaisCases.map(({ files: _files, ...row }) => row)
  })
  on('GET', '/mock-eais/api/cases/:id', (req, [id]) => {
    const c = eaisCases.find(x => x.id === int(id))
    if (!c) throw new HttpError(404, 'Дело не найдено в ЕАИС')
    return c
  })

  function handle(req: MockRequest): MockResponse {
    const path = req.path.replace(/\/+$/, '') || '/'
    let pathMatched = false
    for (const [method, re, handler] of routes) {
      const m = re.exec(path)
      if (!m) continue
      pathMatched = true
      if (method !== req.method.toUpperCase()) continue
      try {
        const result = handler(req, m.slice(1))
        if (result && typeof result === 'object' && 'status' in result && typeof (result as MockResponse).status === 'number'
          && ('raw' in result || 'setSession' in result || 'body' in result)) {
          return result as MockResponse
        }
        return { status: 200, body: result }
      }
      catch (e) {
        if (e instanceof HttpError) return { status: e.status, body: { detail: e.detail } }
        throw e
      }
    }
    return pathMatched
      ? { status: 405, body: { detail: 'Method Not Allowed' } }
      : { status: 404, body: { detail: 'Not Found' } }
  }

  return { handle }
}
