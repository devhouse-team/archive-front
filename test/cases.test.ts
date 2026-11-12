import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import DelaRestrictedBadge from '~/components/dela/DelaRestrictedBadge.vue'
import DelaThumbGrid from '~/components/dela/DelaThumbGrid.vue'
import DelaReocrModal from '~/components/dela/DelaReocrModal.vue'
import { useAuthStore } from '~/stores/auth'
import { useHealthStore } from '~/stores/health'
import { toApiError } from '~/utils/api-error'
import type { DeloDetail, DeloPage, Role, User } from '~/types/api'
import { ROLES } from '~/types/api'
import { canAccess } from '~/utils/access'
import { navForRole } from '~/utils/nav'
import { gapsLabel, isOcrBusy, leafSlots } from '~/composables/useCases'
import { validateUserForm } from '~/composables/useAdmin'
import type { UserFormState } from '~/composables/useAdmin'

// Stage 8 (brief 8 §5): re-OCR confirmation and gating, the restricted mark, gaps, admin gating, user-form rules.

function useAppPinia() {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  useAuthStore().clear()
}
const user = (role: Role): User => ({ id: 1, username: role, full_name: `${role} Демо`, role, role_ru: role })
const EDITORS: Role[] = ['admin', 'archivist']

const page = (id: number, leaf: number, over: Partial<DeloPage> = {}): DeloPage => ({
  id, leaf, lang: 'ru', mean_conf: 90, low_conf: 0, reviewed: 0, status: 'done', script: 'Cyrillic', engine: 'tesseract', ...over,
})

const delo = (over: Partial<DeloDetail> = {}): DeloDetail => ({
  id: 6, fond: 1, opis: 1, delo: 12, shifr: 'Ф.1 Оп.1 Д.12', eais_case_id: 1,
  title: 'Протоколы заседаний горисполкома', year_from: 1954, year_to: 1954, years: '1954',
  fond_creator: 'Акмолинский городской исполнительный комитет', doc_type: 'протоколы',
  access: 'open', lang_override: null, pages_total: 4, pages_done: 4, pages_failed: 0, gaps: [4], low_conf: 1,
  pages: [page(9, 1), page(10, 2), page(11, 3, { low_conf: 1, mean_conf: 52 }), page(12, 5)],
  ...over,
})

describe('gaps', () => {
  it('puts a missing leaf between its neighbours', () => {
    const slots = leafSlots([page(1, 1), page(2, 2), page(3, 3), page(5, 5)], [4])
    expect(slots.map(s => `${s.kind}:${s.leaf}`)).toEqual(['page:1', 'page:2', 'page:3', 'gap:4', 'page:5'])
  })

  it('labels the list column «пропущены л. 4, 7» and nothing when complete', () => {
    expect(gapsLabel([7, 4])).toBe('пропущены л. 4, 7')
    expect(gapsLabel([])).toBeNull()
  })

  it('renders a placeholder for each gap in the thumbnail grid', async () => {
    useAppPinia()
    useAuthStore().setUser(user('reader'))
    const w = await mountSuspended(DelaThumbGrid, { props: { pages: delo().pages, gaps: [4, 6] } })
    const items = w.findAll('li')
    expect(items).toHaveLength(6)
    expect(items[3]!.attributes('data-gap')).toBe('4')
    expect(items[3]!.get('[role="img"]').attributes('aria-label')).toBe('Лист 4 отсутствует в деле')
    expect(items[5]!.attributes('data-gap')).toBe('6')
    // Pages link to the viewer; gaps are not links.
    expect(w.findAll('a').map(a => a.attributes('href'))).toEqual(['/page/9', '/page/10', '/page/11', '/page/12'])
  })

  it('polls only while OCR has work', () => {
    expect(isOcrBusy([{ status: 'done' }, { status: 'running' }])).toBe(true)
    expect(isOcrBusy([{ status: 'done' }, { status: 'failed' }])).toBe(false)
  })
})

describe('restricted mark (🔒)', () => {
  beforeEach(useAppPinia)

  it('shows for editors only', async () => {
    for (const role of ROLES) {
      useAppPinia()
      useAuthStore().setUser(user(role))
      const w = await mountSuspended(DelaRestrictedBadge, { props: { access: 'restricted' } })
      expect(w.find('[data-testid="restricted-badge"]').exists(), role).toBe(EDITORS.includes(role))
      w.unmount()
    }
  })

  it('never shows on an open case', async () => {
    useAuthStore().setUser(user('admin'))
    const w = await mountSuspended(DelaRestrictedBadge, { props: { access: 'open' } })
    expect(w.find('[data-testid="restricted-badge"]').exists()).toBe(false)
  })
})

describe('re-OCR on the case card', () => {
  let posts: unknown[] = []
  beforeEach(() => {
    useAppPinia()
    posts = []

    registerEndpoint('/api/dela/6', () => delo())
    registerEndpoint('/api/dela/6/ocr', {
      method: 'POST',
      handler: async (event) => {
        // registerEndpoint runs on test-utils' own h3 (v1); its readBody comes from the same alias.
        // @ts-expect-error the alias is resolved by the test environment and has no type declaration
        const { readBody } = await import('#nuxt-test-utils/h3')
        posts.push(await readBody(event))
        return { queued: 4 }
      },
    })
  })

  async function mountCard(role: Role) {
    useAuthStore().setUser(user(role))
    const { default: Card } = await import('~/pages/dela/[id].vue')
    const w = await mountSuspended(Card, { route: '/dela/6', attachTo: document.body })
    await flushPromises()
    return w
  }

  it('is absent for operator and reader (no button, no modal)', async () => {
    for (const role of ['operator', 'reader'] as Role[]) {
      useAppPinia()
      const w = await mountCard(role)
      expect(w.text(), role).toContain('Протоколы заседаний горисполкома')
      expect(w.text(), role).not.toContain('Распознать заново')
      expect(w.findComponent(DelaReocrModal).exists(), role).toBe(false)
      w.unmount()
    }
  })

  it('needs confirmation: the button only opens the modal; the request goes after «confirm»', async () => {
    const w = await mountCard('archivist')
    const button = w.findAll('button').find(b => b.text().includes('Распознать заново'))
    expect(button).toBeTruthy()
    const modal = w.findComponent(DelaReocrModal)
    expect(modal.props('open')).toBe(false)

    await button!.trigger('click')
    await flushPromises()
    expect(w.findComponent(DelaReocrModal).props('open')).toBe(true)
    expect(posts).toEqual([])
    // The modal says plainly that corrections are overwritten; the destructive button is in the error colour.
    const body = document.body.textContent ?? ''
    expect(body).toContain('Ручные исправления будут перезаписаны')
    const confirm = [...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Перезаписать и распознать'))
    expect(confirm?.className ?? '').toMatch(/bg-error/)

    w.findComponent(DelaReocrModal).vm.$emit('confirm', 'kk-arab')
    await flushPromises()
    await vi.waitFor(() => expect(posts).toEqual([{ lang: 'kk-arab' }]))
    w.unmount()
  })
})

describe('admin-only gating', () => {
  it('only admin can open /admin; only editors /review', () => {
    for (const role of ROLES) {
      expect(canAccess(role, 'admin'), role).toBe(role === 'admin')
      expect(canAccess(role, 'review'), role).toBe(EDITORS.includes(role))
      expect(canAccess(role, 'delaManage'), role).toBe(EDITORS.includes(role))
      expect(canAccess(role, 'dela'), role).toBe(true)
    }
  })

  it('the rail renders Администрирование for admin only', () => {
    for (const role of ROLES) {
      const links = navForRole(role).flatMap(g => g.items.map(i => i.to))
      expect(links.includes('/admin'), role).toBe(role === 'admin')
    }
  })
})

describe('user form validation', () => {
  const ok: UserFormState = { username: 'new.user', password: 'secret', role: 'reader', full_name: 'Новый Пользователь' }
  const fields = (s: Partial<UserFormState>, taken: string[] = []) =>
    validateUserForm({ ...ok, ...s }, taken).map(e => e.name)

  it('accepts a complete form; full name is optional', () => {
    expect(fields({})).toEqual([])
    expect(fields({ full_name: '' })).toEqual([])
  })

  it('requires username, password and role', () => {
    expect(validateUserForm({ username: '', password: '', role: undefined, full_name: '' }, []).map(e => e.message)).toEqual([
      'Введите логин', 'Введите пароль', 'Выберите роль',
    ])
  })

  it('rejects a bad or taken username, a short password, a long full name', () => {
    expect(fields({ username: 'ab' })).toEqual(['username'])
    expect(fields({ username: 'иван' })).toEqual(['username'])
    expect(fields({ username: 'Reader' }, ['reader'])).toEqual(['username'])
    expect(fields({ password: '123' })).toEqual(['password'])
    expect(fields({ full_name: 'я'.repeat(101) })).toEqual(['full_name'])
  })
})

describe('service health panel', () => {
  beforeEach(useAppPinia)

  const live = {
    eais_online: true, eais_down_since: null,
    workers: { watcher: { age_s: 2.7, ok: true }, upload: { age_s: 135, ok: false }, ocr: { age_s: 1.7, ok: true } },
    disk_free_gb: 4.1, disk_low: false, next_retry_at: null, next_retry_in: null,
    ocr_engine: 'tesseract', tesseract: 'tesseract 5.5.4', last_backup: null, server_time: 1794425389,
  }

  it('live: «работает» with the age, a stale worker as «нет сигнала m:ss», and the refresh note', async () => {
    useAuthStore().setUser(user('admin'))
    useHealthStore().data = live
    const { default: AdminHealth } = await import('~/components/admin/AdminHealth.vue')
    const w = await mountSuspended(AdminHealth)
    expect(w.text()).toContain('работает')
    expect(w.text()).toContain('нет сигнала 2:15')
    expect(w.text()).toContain('Обновляется каждые 5 секунд')
    expect(w.find('[data-testid="health-stale"]').exists()).toBe(false)
  })

  it('failed poll: a status alert with the data time, neutral workers, no «Обновляется»', async () => {
    useAuthStore().setUser(user('admin'))
    const store = useHealthStore()
    store.data = live
    store.error = toApiError(503, { detail: 'Service Unavailable' })
    const { default: AdminHealth } = await import('~/components/admin/AdminHealth.vue')
    const w = await mountSuspended(AdminHealth)
    const alert = w.get('[data-testid="health-stale"]')
    expect(alert.attributes('role')).toBe('status')
    expect(alert.text()).toContain('Нет ответа сервера. Данные на')
    expect(w.text()).not.toContain('работает')
    expect(w.text()).not.toContain('Обновляется каждые 5 секунд')
    expect(w.text().match(/нет данных/g)?.length).toBeGreaterThanOrEqual(3)
  })
})
