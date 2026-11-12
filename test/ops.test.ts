import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import authMiddleware from '~/middleware/auth.global'
import { canResend, fileShifr, isDigits, NO_RESEND_PREFIXES, periodLabel, shifrComplete, shifrErrors } from '~/composables/useOps'
import { useAuthStore } from '~/stores/auth'
import type { M1File, QueueCounters, Role, User } from '~/types/api'

// Stage 7: M1 operator screens (/ops, /upload, /errors, /journal).

const user = (role: Role): User => ({ id: 1, username: role, full_name: `${role} Демо`, role, role_ru: role })

function useAppPinia(role: Role = 'operator') {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  const auth = useAuthStore()
  auth.clear()
  auth.setUser(user(role))
}

// Distinctive server paths: none of them may ever reach the DOM (handoff §4).
const SERVER_PATHS = ['/srv/archive/spool/ws1/a.tif', '/srv/archive/store/1/1/12/a.tif', '/srv/archive/errors/ws1/a.tif']

function file(over: Partial<M1File> & { id: number }): M1File {
  return {
    workplace: 'ws1', src_relpath: 'ws1/a.tif', name: `scan-${over.id}.tif`, sha256: null, size: 1, fmt: 'TIFF', dpi: 300,
    n_pages: 1, fond: null, opis: null, delo: null, leaf_start: null, shifr_source: null, status: 'invalid',
    error_reason: null, force: 0, eais_receipt: null, delo_id: null, created_at: '2026-11-12 01:00:00',
    updated_at: '2026-11-12 01:00:00', attempts: null, next_run_at: null, last_error: null, job_status: null, shifr: '',
    // The backend sends these; the type deliberately omits them.
    ...({ spool_path: SERVER_PATHS[0], archive_path: SERVER_PATHS[1], error_path: SERVER_PATHS[2] } as object),
    ...over,
  }
}

const QUEUE: QueueCounters = {
  files: { queued: 1, retry: 2, uploaded: 10, invalid: 4 }, uploaded_today: 10, pages_today: 12, pages_done: 12,
  ocr: { pending: 0, running: 1, failed: 0 }, ocr_failed: [], review: 1, next_retry_at: null, next_retry_in: null,
}

describe('«Отправить повторно» rule (handoff §9)', () => {
  for (const prefix of NO_RESEND_PREFIXES) {
    it(`is hidden for reasons starting with «${prefix}»`, () => {
      expect(canResend(`${prefix} что-то`)).toBe(false)
      expect(canResend(`  ${prefix} с пробелом впереди`)).toBe(false)
    })
  }

  it('is offered for every other reason, and for none', () => {
    expect(canResend('Дубликат файла 002.tif (Ф.1 Оп.1 Д.12)')).toBe(true)
    expect(canResend('Шифр не определён')).toBe(true)
    expect(canResend('ЕАИС: дело не найдено')).toBe(true)
    expect(canResend(null)).toBe(true)
  })

  it('the errors screen renders the button for only the resendable row, and no server path', async () => {
    useAppPinia()
    registerEndpoint('/api/m1/files', () => [
      file({ id: 1, error_reason: 'Пустая страница 1' }),
      file({ id: 2, error_reason: 'Чёрная страница' }),
      file({ id: 3, error_reason: 'Разрешение 150 dpi ниже 300' }),
      file({ id: 4, error_reason: 'Дубликат файла 002.tif (Ф.1 Оп.1 Д.12)' }),
    ])
    const { default: ErrorsPage } = await import('~/pages/errors.vue')
    const w = await mountSuspended(ErrorsPage)
    await flushPromises()
    await vi.waitFor(() => expect(w.text()).toContain('scan-4.tif'))
    const resend = w.findAll('button').filter(b => b.text().includes('Отправить повторно'))
    expect(resend).toHaveLength(1)
    expect(resend[0]!.attributes('aria-label')).toBe('Отправить повторно: scan-4.tif')
    expect(w.findAll('button').filter(b => b.text().includes('Исправить шифр'))).toHaveLength(4)
    // Focus targets after a row leaves the list (review round 1 minor 6).
    expect(w.findAll('button[data-fix-id]')).toHaveLength(4)
    for (const p of SERVER_PATHS) expect(w.html()).not.toContain(p)
    w.unmount()
  }, 30_000)
})

describe('server paths are never rendered', () => {
  it('the upload queue table shows names and шифр only', async () => {
    useAppPinia()
    const { default: Table } = await import('~/components/ops/OpsFilesTable.vue')
    const rows = [
      file({ id: 7, status: 'uploaded', fond: 1, opis: 1, delo: 12, leaf_start: 5, shifr: 'Ф.1 Оп.1 Д.12 л.5', shifr_source: 'folder' }),
      file({ id: 8, status: 'retry', next_run_at: Date.now() / 1000 + 30 }),
    ]
    const w = await mountSuspended(Table, { props: { rows, loading: false, filtered: false, sending: null } })
    expect(w.text()).toContain('scan-7.tif')
    expect(w.text()).toContain('Отправить сейчас')
    for (const p of SERVER_PATHS) expect(w.html()).not.toContain(p)
    w.unmount()
  })

  it('no Stage 7 source file reads a server path field', async () => {
    const sources = import.meta.glob(['../app/pages/{ops,upload,errors,journal}.vue', '../app/components/ops/*.vue', '../app/composables/useOps.ts'], { query: '?raw', import: 'default', eager: true })
    expect(Object.keys(sources).length).toBeGreaterThan(5)
    for (const [path, src] of Object.entries(sources)) {
      // Comments may name the fields; code must never read them (property access or a string key).
      expect(src as string, path).not.toMatch(/\.(?:spool_path|archive_path|error_path)\b|\[\s*['"`](?:spool_path|archive_path|error_path)/)
    }
  })
})

describe('шифр digit validation', () => {
  it('accepts digits only', () => {
    expect(isDigits('12')).toBe(true)
    expect(isDigits('1a')).toBe(false)
    expect(isDigits('-1')).toBe(false)
    expect(isDigits('1.5')).toBe(false)
    expect(isDigits('')).toBe(false)
  })

  it('optional шифр (upload): empty is fine, partial or non-digit is not', () => {
    expect(shifrErrors({ fond: '', opis: '', delo: '' }, false)).toEqual({})
    expect(shifrErrors({ fond: '1', opis: '', delo: '' }, false)).toEqual({ opis: 'required', delo: 'required' })
    expect(shifrErrors({ fond: '1', opis: '1', delo: '1x' }, false)).toEqual({ delo: 'digits' })
  })

  it('required шифр (Исправить шифр): fond/opis/delo needed, лист optional but numeric', () => {
    expect(shifrErrors({ fond: '', opis: '', delo: '', leaf: '' }, true)).toEqual({ fond: 'required', opis: 'required', delo: 'required' })
    expect(shifrErrors({ fond: '1', opis: '1', delo: '12', leaf: '' }, true)).toEqual({})
    expect(shifrErrors({ fond: '1', opis: '1', delo: '12', leaf: 'л3' }, true)).toEqual({ leaf: 'digits' })
  })

  it('the ЕАИС check runs only for a complete шифр', () => {
    expect(shifrComplete({ fond: '1', opis: '1', delo: '12' })).toBe(true)
    expect(shifrComplete({ fond: '1', opis: '', delo: '12' })).toBe(false)
    expect(shifrComplete({ fond: '1', opis: '1', delo: '1 2' })).toBe(false)
  })

  it('file rows without a шифр give null (invalid files, handoff §9)', () => {
    expect(fileShifr({ fond: null, opis: null, delo: null, leaf_start: null })).toBeNull()
    expect(fileShifr({ fond: 1, opis: 1, delo: 12, leaf_start: 5 })).toEqual({ fond: 1, opis: 1, delo: 12, leaf: 5 })
  })

  it('formats stats periods', () => {
    expect(periodLabel('2026-11-12')).toBe('12.11')
    expect(periodLabel('2026-11')).toBe('11.2026')
  })
})

describe('ops panel polling', () => {
  let queueCalls = 0
  let journalCalls = 0
  beforeEach(() => {
    queueCalls = 0
    journalCalls = 0
    registerEndpoint('/api/m1/queue', () => {
      queueCalls++
      return QUEUE
    })
    registerEndpoint('/api/m1/journal', () => {
      journalCalls++
      return []
    })
    registerEndpoint('/api/m1/stats', () => [])
  })
  afterEach(() => vi.useRealTimers())

  it('polls recent events while mounted, stops on unmount, and leaves queue polling to the shell store', async () => {
    useAppPinia()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { default: OpsPage } = await import('~/pages/ops.vue')
    const w = await mountSuspended(OpsPage)
    await vi.waitFor(() => expect(journalCalls).toBeGreaterThanOrEqual(1))
    // One direct queue load while the store is empty, then none of its own.
    await vi.waitFor(() => expect(queueCalls).toBe(1))
    await vi.advanceTimersByTimeAsync(10_000)
    await flushPromises()
    const whileMounted = journalCalls
    expect(whileMounted).toBeGreaterThanOrEqual(2)
    expect(queueCalls).toBe(1)
    w.unmount()
    await vi.advanceTimersByTimeAsync(30_000)
    await flushPromises()
    expect(journalCalls).toBe(whileMounted)
  })

  it('renders the tiles with links to the filtered screens', async () => {
    useAppPinia()
    const { default: OpsPage } = await import('~/pages/ops.vue')
    const w = await mountSuspended(OpsPage)
    await vi.waitFor(() => expect(w.text()).toContain('Загружено сегодня'))
    const hrefs = w.findAll('nav a').map(a => a.attributes('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/upload?status=queued', '/upload?status=retry', '/errors']))
    w.unmount()
  })
})

describe('a reader cannot reach the operator screens', () => {
  for (const path of ['/ops', '/upload', '/errors', '/journal']) {
    it(`${path}: route roles exclude the reader and the middleware raises «Нет доступа»`, async () => {
      useAppPinia('reader')
      const route = useRouter().resolve(path)
      expect(route.meta.roles).toEqual(['admin', 'archivist', 'operator'])
      const { pageError, clear } = usePageError()
      clear()
      await authMiddleware(route, route)
      expect(pageError.value?.kind).toBe('forbidden')
      clear()
    })
  }

  it('operators pass the same gate', async () => {
    useAppPinia('operator')
    const route = useRouter().resolve('/errors')
    const { pageError, clear } = usePageError()
    clear()
    await authMiddleware(route, route)
    expect(pageError.value).toBeNull()
  })
})
