import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ShifrPlate from '~/components/ShifrPlate.vue'
import AppRail from '~/components/AppRail.vue'
import { useAuthStore } from '~/stores/auth'
import { useHealthStore } from '~/stores/health'
import { useNotificationsStore } from '~/stores/notifications'
import { useQueueStore } from '~/stores/queue'
import type { Health, Role, User } from '~/types/api'
import { ROLES } from '~/types/api'
import { isEnabled } from '~/utils/config'
import { eaisView, retryLabel } from '~/utils/eais'
import { formatCount, formatTimestamp } from '~/utils/format'
import { NAV_ITEMS, navForRole } from '~/utils/nav'
import { formatShifr, parseShifr, shifrAriaLabel } from '~/utils/shifr'

/** Components read stores through the Nuxt app's Pinia; tests that mount them must use the same instance. */
function useAppPinia() {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  useAuthStore().clear()
}

const user = (role: Role): User => ({ id: 1, username: role, full_name: `${role} Демо`, role, role_ru: role })

const health = (over: Partial<Health> = {}): Health => ({
  eais_online: true,
  eais_down_since: null,
  workers: { watcher: { age_s: 2, ok: true }, upload: { age_s: 3, ok: true }, ocr: { age_s: 1, ok: true } },
  disk_free_gb: 4.1,
  disk_low: false,
  next_retry_at: null,
  next_retry_in: null,
  ocr_engine: 'auto',
  tesseract: 'tesseract 5.5.4',
  last_backup: null,
  server_time: 0,
  ...over,
})

describe('ShifrPlate', () => {
  it('builds the group label from the ru.ts template, with and without лист', () => {
    expect(shifrAriaLabel({ fond: 1, opis: 1, delo: 15, leaf: 3 })).toBe('Шифр: фонд 1, опись 1, дело 15, лист 3')
    expect(shifrAriaLabel({ fond: 7, opis: 2, delo: 4 })).toBe('Шифр: фонд 7, опись 2, дело 4')
  })

  it('renders four plates with the current лист marked and the дело as a link', async () => {
    const w = await mountSuspended(ShifrPlate, { props: { shifr: { fond: 1, opis: 1, delo: 15, leaf: 3 }, current: 'leaf', deloId: 6 } })
    const group = w.get('[role="group"]')
    expect(group.attributes('aria-label')).toBe('Шифр: фонд 1, опись 1, дело 15, лист 3')
    const values = group.findAll('[class*="text-lg"]').map(v => v.text())
    expect(values).toEqual(['Ф.1', 'Оп.1', 'Д.15', 'л.3'])
    // Micro-labels and chevrons are hidden from assistive tech; the Kazakh half carries lang="kk".
    const hidden = group.findAll('[aria-hidden="true"]')
    expect(hidden.filter(h => h.text() === '›')).toHaveLength(3)
    expect(group.find('[lang="kk"]').text()).toBe('Қор')
    const current = group.get('[aria-current="page"]')
    expect(current.text()).toContain('л.3')
    expect(current.find('.bg-locator').exists()).toBe(true)
    const links = group.findAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe('/dela/6')
  })

  it('renders without an empty лист segment', async () => {
    const w = await mountSuspended(ShifrPlate, { props: { shifr: { fond: 7, opis: 2, delo: 4, leaf: null } } })
    expect(w.findAll('[class*="text-lg"]').map(v => v.text())).toEqual(['Ф.7', 'Оп.2', 'Д.4'])
    expect(w.text()).not.toContain('л.')
    expect(w.findAll('[aria-current]')).toHaveLength(0)
  })

  it('keeps long values whole', async () => {
    const w = await mountSuspended(ShifrPlate, { props: { shifr: { fond: 1234, opis: 12, delo: 10345, leaf: 999 }, current: 'leaf' } })
    expect(w.findAll('[class*="text-lg"]').map(v => v.text())).toEqual(['Ф.1234', 'Оп.12', 'Д.10345', 'л.999'])
    expect(w.get('[role="group"]').attributes('aria-label')).toBe('Шифр: фонд 1234, опись 12, дело 10345, лист 999')
  })

  it('compact variant: «Ф.1 Оп.1 Д.12 · л.3» with tabular figures and a spoken label', async () => {
    const w = await mountSuspended(ShifrPlate, { props: { shifr: { fond: 1, opis: 1, delo: 12, leaf: 3 }, variant: 'compact' } })
    expect(w.classes()).toContain('tabular-nums')
    expect(w.get('[aria-hidden="true"]').text()).toBe('Ф.1 Оп.1 Д.12 · л.3')
    expect(w.get('.sr-only').text()).toBe('Шифр: фонд 1, опись 1, дело 12, лист 3')
    expect(formatShifr({ fond: 1, opis: 1, delo: 12 })).toBe('Ф.1 Оп.1 Д.12')
  })

  it('parses the string forms the API sends', () => {
    expect(parseShifr('Ф.1 Оп.1 Д.12')).toEqual({ fond: 1, opis: 1, delo: 12, leaf: null })
    expect(parseShifr('Ф.1 Оп.1 Д.12 л.5')).toEqual({ fond: 1, opis: 1, delo: 12, leaf: 5 })
    expect(parseShifr('Ф.1234 Оп.12 Д.10345 · л.999')).toEqual({ fond: 1234, opis: 12, delo: 10345, leaf: 999 })
    expect(parseShifr('')).toBeNull()
    expect(parseShifr('blank.png')).toBeNull()
  })
})

describe('rail', () => {
  beforeEach(useAppPinia)

  it.each(ROLES)('%s: renders exactly the navForRole() items and no empty group label', async (role) => {
    const w = await mountSuspended(AppRail, { props: { groups: navForRole(role) } })
    const expected = navForRole(role).flatMap(g => g.items.map(i => i.to))
    const hrefs = w.findAll('a').map(a => a.attributes('href'))
    expect(hrefs).toEqual(expected)
    for (const item of NAV_ITEMS) {
      if (!expected.includes(item.to)) expect(hrefs).not.toContain(item.to)
    }
    const labels = w.findAll('nav > div > p').map(l => l.text())
    expect(labels).toEqual(navForRole(role).map(g => `${g.labelKk === 'nav.groups.fond.kk' ? 'Қор · Фонд' : g.labelKk === 'nav.groups.processing.kk' ? 'Өңдеу · Обработка' : 'Жүйе · Система'}`))
    expect(w.findAll('nav > div > p [lang="kk"]')).toHaveLength(labels.length)
    expect(w.get('nav').attributes('aria-label')).toBe('Основное меню')
  })

  it('marks the active item with aria-current="page" (a page belongs to Дела)', async () => {
    useAuthStore().setUser(user('reader'))
    const w = await mountSuspended(AppRail, { props: { groups: navForRole('reader') }, route: '/page/9' })
    expect(w.findAll('[aria-current="page"]').map(a => a.attributes('href'))).toEqual(['/dela'])
  })

  it('reader: no «Обработка» or «Система» label at all', async () => {
    const w = await mountSuspended(AppRail, { props: { groups: navForRole('reader') } })
    expect(w.text()).not.toContain('Обработка')
    expect(w.text()).not.toContain('Система')
  })

  it('shows counters only above zero: «Ошибки» as an error badge, «Очередь проверки» neutral', async () => {
    useAuthStore().setUser(user('archivist'))
    const queue = useQueueStore()
    queue.counts = { errors: 4, review: 0 }
    const w = await mountSuspended(AppRail, { props: { groups: navForRole('archivist') } })
    const badge = (href: string) => w.get(`a[href="${href}"]`).find('span.tabular-nums')
    expect(badge('/errors').text()).toBe('4')
    expect(badge('/errors').classes()).toContain('bg-error')
    expect(badge('/review').exists()).toBe(false)
    queue.counts = { errors: 0, review: 1200 }
    await flushPromises()
    expect(badge('/errors').exists()).toBe(false)
    expect(badge('/review').text()).toBe('999+')
    expect(badge('/review').classes()).toContain('bg-inverted')
  })
})

describe('counters and bell requests per role', () => {
  let calls: string[] = []
  beforeEach(() => {
    setActivePinia(createPinia())
    calls = []
    registerEndpoint('/api/m1/queue', () => {
      calls.push('queue')
      return { files: { queued: 0, retry: 0, uploaded: 1, invalid: 3 }, uploaded_today: 0, pages_today: 0, pages_done: 0, ocr: { pending: 0, running: 0, failed: 0 }, ocr_failed: [], review: 1, next_retry_at: null, next_retry_in: null }
    })
    registerEndpoint('/api/review', () => {
      calls.push('review')
      return [{ id: 3 }]
    })
    registerEndpoint('/api/notifications', () => {
      calls.push('notifications')
      return { unread: 0, items: [] }
    })
  })

  it('reader: no queue, review or notifications request', async () => {
    useAuthStore().setUser(user('reader'))
    await useQueueStore().refresh()
    await useNotificationsStore().refresh()
    expect(calls).toEqual([])
  })

  it('operator: queue and notifications, never /api/review', async () => {
    useAuthStore().setUser(user('operator'))
    await useQueueStore().refresh()
    await useNotificationsStore().refresh()
    expect(calls.sort()).toEqual(['notifications', 'queue'])
    expect(useQueueStore().counts).toEqual({ errors: 3, review: 0 })
  })

  it('two refreshes while one is in flight make one queue request', async () => {
    useAuthStore().setUser(user('operator'))
    const store = useQueueStore()
    await Promise.all([store.refresh(), store.refresh()])
    expect(calls).toEqual(['queue'])
    await store.refresh()
    expect(calls).toEqual(['queue', 'queue'])
  })

  it('archivist: queue, review and notifications', async () => {
    useAuthStore().setUser(user('archivist'))
    await useQueueStore().refresh()
    await useNotificationsStore().refresh()
    expect(calls.sort()).toEqual(['notifications', 'queue', 'review'])
    expect(useQueueStore().counts).toEqual({ errors: 3, review: 1 })
  })
})

describe('bell', () => {
  beforeEach(useAppPinia)

  it('is absent for the reader and present for STAFF', async () => {
    const { default: Layout } = await import('~/layouts/default.vue')
    for (const role of ROLES) {
      useAppPinia()
      useAuthStore().setUser(user(role))
      const w = await mountSuspended(Layout, { slots: { default: () => 'x' } })
      const bell = w.find('button[aria-label^="Уведомления"]')
      expect(bell.exists(), role).toBe(role !== 'reader')
      w.unmount()
    }
  })

  it('first load never marks items as fresh; later error items do, oldest first', async () => {
    useAuthStore().setUser(user('operator'))
    let items = [{ id: 2, ts: '2026-11-12 00:29:14', level: 'error', message: 'старое', read: 0 }]
    registerEndpoint('/api/notifications', () => ({ unread: items.length, items }))
    const store = useNotificationsStore()
    await flushPromises()
    store.reset()
    await store.refresh()
    expect(store.fresh).toEqual([])
    items = [
      { id: 5, ts: '2026-11-12 01:00:00', level: 'error', message: 'новое 2', read: 0 },
      { id: 4, ts: '2026-11-12 00:59:00', level: 'info', message: 'инфо', read: 0 },
      { id: 3, ts: '2026-11-12 00:58:00', level: 'error', message: 'новое 1', read: 0 },
      ...items,
    ]
    await store.refresh()
    expect(store.fresh.map(n => n.message)).toEqual(['новое 1', 'новое 2'])
    await store.refresh()
    expect(store.fresh).toEqual([])
  })
})

describe('ЕАИС indicator', () => {
  it('formats the retry countdown as m:ss and says «сейчас» at zero', () => {
    expect(retryLabel(42)).toBe('Повтор через 0:42')
    expect(retryLabel(125)).toBe('Повтор через 2:05')
    expect(retryLabel(0)).toBe('Повтор сейчас')
    expect(retryLabel(null)).toBeNull()
  })

  it('online, down with a countdown, and unknown before the first answer', () => {
    expect(eaisView(health(), null)).toMatchObject({ state: 'online', label: 'ЕАИС на связи', retry: null, problems: 0 })
    expect(eaisView(health({ eais_online: false }), 61)).toMatchObject({ state: 'down', label: 'ЕАИС недоступна', retry: 'Повтор через 1:01', retryShort: '1:01' })
    expect(eaisView(null, null)).toMatchObject({ state: 'unknown', label: 'ЕАИС: нет данных' })
  })

  it('says «нет данных» while the last poll failed, never «на связи» from the old answer', () => {
    const v = eaisView(health(), 5, true)
    expect(v).toMatchObject({ state: 'unknown', label: 'ЕАИС: нет данных', retry: null, problems: 0 })
    expect(v.workers).toEqual([])
  })

  it('a failed poll after a good one marks the store stale until the next good answer', async () => {
    setActivePinia(createPinia())
    useAuthStore().setUser(user('admin'))
    const store = useHealthStore()
    let fail = false
    registerEndpoint('/api/health', () => {
      if (fail) throw createError({ statusCode: 500, statusMessage: 'boom' })
      return health()
    })
    await store.refresh()
    expect(store.eaisOnline).toBe(true)
    expect(eaisView(store.data, store.retryIn, store.stale).state).toBe('online')

    fail = true
    await expect(store.refresh()).rejects.toBeTruthy()
    expect(store.stale).toBe(true)
    expect(store.eaisOnline).toBeNull()
    expect(eaisView(store.data, store.retryIn, store.stale).label).toBe('ЕАИС: нет данных')

    fail = false
    await store.refresh()
    expect(store.stale).toBe(false)
    expect(eaisView(store.data, store.retryIn, store.stale).state).toBe('online')
  })

  it('counts stalled workers and a low disk as problems', () => {
    const v = eaisView(health({ disk_low: true, workers: { watcher: { age_s: 125, ok: false }, upload: { age_s: null, ok: false }, ocr: { age_s: 1, ok: true } } }), null)
    expect(v.problems).toBe(3)
    expect(v.workers.map(w => w.status)).toEqual(['нет сигнала 2:05', 'нет сигнала', 'работает'])
  })

  describe('countdown ticks between polls', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.useFakeTimers()
    })
    afterEach(() => vi.useRealTimers())

    it('moves every second from next_retry_in', async () => {
      useAuthStore().setUser(user('reader'))
      registerEndpoint('/api/health', () => health({ eais_online: false, next_retry_in: 10 }))
      const store = useHealthStore()
      await store.refresh()
      expect(store.retryIn).toBe(10)
      vi.advanceTimersByTime(3000)
      store.now = Date.now()
      expect(store.retryIn).toBe(7)
    })
  })
})

describe('small formatters', () => {
  it('caps counts at 99+', () => {
    expect(formatCount(4)).toBe('4')
    expect(formatCount(99)).toBe('99')
    expect(formatCount(100)).toBe('99+')
  })

  it('shows today as a time and other days in full', () => {
    expect(formatTimestamp('2026-11-12 00:29:14', '2026-11-12')).toBe('00:29')
    expect(formatTimestamp('2026-11-11 23:05:00', '2026-11-12')).toBe('11.11.2026 23:05')
    expect(formatTimestamp('вчера', '2026-11-12')).toBe('вчера')
    // Zoned ISO strings (the mock's eais_down_since) are shown in local time.
    const d = new Date('2026-11-11T23:52:00Z')
    const pad = (n: number) => String(n).padStart(2, '0')
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    expect(formatTimestamp('2026-11-11T23:52:00.000Z', local)).toBe(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
  })

  it('reads the demo-accounts switch from env-shaped values', () => {
    expect(isEnabled(true)).toBe(true)
    expect(isEnabled('1')).toBe(true)
    for (const off of [false, 0, '0', 'false', '', undefined]) expect(isEnabled(off)).toBe(false)
  })
})
