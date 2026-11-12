import { describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import ScriptBadge from '~/components/ScriptBadge.vue'
import { deloLangs, pageLangs, REOCR_LANGS } from '~/composables/useCases'
import { langDir } from '~/composables/useLangDir'
import { reasonHint } from '~/composables/useOps'
import { parseSearchQuery } from '~/composables/useSearchQuery'
import { langLabel, translate } from '~/composables/useT'
import { leafNavLabels } from '~/composables/useViewer'
import { useAuthStore } from '~/stores/auth'
import type { DeloSummary, M1File } from '~/types/api'
import { LANGS } from '~/utils/status'

// Integration pass (2026-11-12): ru-old, /errors actions, /upload queue rows, leaf labels, /dela langs.

function operator() {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  const auth = useAuthStore()
  auth.clear()
  auth.setUser({ id: 1, username: 'operator', full_name: 'Оператор', role: 'operator', role_ru: 'Оператор' })
}

function file(over: Partial<M1File> & { id: number }): M1File {
  return {
    workplace: 'ws1', src_relpath: 'ws1/a.tif', name: `scan-${over.id}.tif`, sha256: null, size: 1, fmt: 'TIFF', dpi: 300,
    n_pages: 1, fond: null, opis: null, delo: null, leaf_start: null, shifr_source: null, status: 'invalid',
    error_reason: null, force: 0, eais_receipt: null, delo_id: null, created_at: '2026-11-12 01:00:00',
    updated_at: '2026-11-12 01:00:00', attempts: null, next_run_at: null, last_error: null, job_status: null, shifr: '',
    ...over,
  }
}

describe('ru-old', () => {
  it('has a short and a full label', () => {
    expect(translate('langs.ru-old')).toBe('RU-дореф')
    expect(translate('langsFull.ru-old')).toBe('Русский, дореформенная орфография (до 1918)')
  })

  it('is listed everywhere a language is chosen, and reads left to right', () => {
    expect(LANGS).toContain('ru-old')
    expect(REOCR_LANGS).toContain('ru-old')
    expect(pageLangs([{ lang: 'kk-cyrl' }, { lang: 'ru-old' }, { lang: 'ru' }])).toEqual(['ru', 'ru-old', 'kk-cyrl'])
    expect(langDir('ru-old')).toBe('ltr')
  })

  it('survives ?lang=ru-old in the search URL', () => {
    expect(parseSearchQuery({ q: 'школа', lang: 'ru-old' }).filters.lang).toBe('ru-old')
  })

  it('an unknown lang shows as its code, never as a raw key', () => {
    expect(langLabel('ru-xyz')).toBe('ru-xyz')
    expect(langLabel('ru-xyz', true)).toBe('ru-xyz')
    expect(langLabel('ru-old')).toBe('RU-дореф')
  })

  it('ScriptBadge prints the code for an unknown lang', async () => {
    const w = await mountSuspended(ScriptBadge, { props: { lang: 'ru-xyz' as never } })
    expect(w.text()).toContain('ru-xyz')
    expect(w.text()).not.toContain('langs.')
    w.unmount()
  })
})

describe('/dela langs', () => {
  const base = { lang_override: null } as DeloSummary
  it('reads langs from the list item and falls back without it', () => {
    expect(deloLangs({ ...base, langs: ['ru', 'ru-old'] })).toEqual(['ru', 'ru-old'])
    expect(deloLangs(base)).toEqual([])
    expect(deloLangs({ ...base, lang_override: 'kk-arab' })).toEqual(['kk-arab'])
  })
})

describe('leaf navigation labels', () => {
  it('names the neighbouring leaves, gaps included', () => {
    expect(leafNavLabels({ prev_leaf: 2, next_leaf: 5 })).toEqual({ prev: 'л.2', next: 'л.5' })
  })
  it('has no label at the ends or when the backend sends no leaf', () => {
    expect(leafNavLabels({ prev_leaf: null, next_leaf: 3 })).toEqual({ prev: null, next: 'л.3' })
    expect(leafNavLabels({})).toEqual({ prev: null, next: null })
  })
})

describe('next-step hints', () => {
  it('maps a reason to one hint', () => {
    expect(reasonHint('Разрешение 96 dpi меньше 300')).toContain('пересканируйте')
    expect(reasonHint('Шифр не определён')).toContain('Укажите шифр')
    expect(reasonHint('Дубликат файла')).toContain('уже загружен')
    expect(reasonHint('что-то новое')).toBeNull()
    expect(reasonHint(null)).toBeNull()
  })
})

describe('/upload queue rows', () => {
  it('shows the reason and the hint for invalid, last_error for retry, a case link for uploaded', async () => {
    operator()
    const { default: Table } = await import('~/components/ops/OpsFilesTable.vue')
    const rows = [
      file({ id: 1, error_reason: 'Разрешение 96 dpi меньше 300', fond: 1, opis: 1, delo: 15, leaf_start: 1, shifr: '' }),
      file({ id: 2, status: 'retry', last_error: 'ЕАИС недоступна', next_run_at: Date.now() / 1000 + 30 }),
      file({ id: 3, status: 'uploaded', delo_id: 7, fond: 1, opis: 1, delo: 12, leaf_start: 5 }),
    ]
    const w = await mountSuspended(Table, { props: { rows, loading: false, filtered: false, sending: null, fresh: new Set([3]) } })
    expect(w.text()).toContain('Разрешение 96 dpi меньше 300')
    expect(w.text()).toContain('отправьте принудительно')
    expect(w.findAll('tr')[1]!.text()).not.toContain('не определён')
    expect(w.text()).toContain('Причина повтора: ЕАИС недоступна')
    expect(w.find('a[href="/dela/7"]').text()).toBe('scan-3.tif')
    expect(w.findAll('tr').filter(tr => tr.classes().includes('bg-primary/5'))).toHaveLength(1)
    w.unmount()
  })
})

describe('/errors force', () => {
  it('asks in a modal, then retries with force', async () => {
    operator()
    const posts: unknown[] = []
    registerEndpoint('/api/m1/files', () => [file({ id: 5, error_reason: 'Разрешение 96 dpi меньше 300' })])
    registerEndpoint('/api/m1/files/5/retry', { method: 'POST', handler: async (e) => {
      const { readBody } = await import('#nuxt-test-utils/h3')
      posts.push(await readBody(e))
      return file({ id: 5, status: 'queued' })
    } })
    const { default: ErrorsPage } = await import('~/pages/errors.vue')
    const w = await mountSuspended(ErrorsPage)
    await flushPromises()
    await vi.waitFor(() => expect(w.text()).toContain('scan-5.tif'))
    await w.findAll('button').find(b => b.text() === 'Отправить принудительно')!.trigger('click')
    await flushPromises()
    expect(posts).toHaveLength(0)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Файл будет загружен без проверки качества')
    const confirm = Array.from(document.body.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Отправить принудительно' && b.closest('[role="dialog"]'))
    confirm!.click()
    await vi.waitFor(() => expect(posts).toEqual([{ force: true }]))
    w.unmount()
  }, 30_000)
})
