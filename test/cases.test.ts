import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import DelaRestrictedBadge from '~/components/dela/DelaRestrictedBadge.vue'
import DelaThumbGrid from '~/components/dela/DelaThumbGrid.vue'
import DelaReocrModal from '~/components/dela/DelaReocrModal.vue'
import { useAuthStore } from '~/stores/auth'
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
        const { readBody } = await import('h3')
        posts.push(await readBody(event))
        return { queued: 4 }
      },
    })
  })

  async function mountCard(role: Role) {
    useAuthStore().setUser(user(role))
    const { default: Card } = await import('~/pages/dela/[id].vue')
    const w = await mountSuspended(Card, { route: '/dela/6' })
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

    w.findComponent(DelaReocrModal).vm.$emit('confirm', 'kk-arab')
    await flushPromises()
    expect(posts).toEqual([{ lang: 'kk-arab' }])
    w.unmount()
  })

  it('the modal states that manual corrections will be overwritten, with an error-coloured confirm', async () => {
    useAuthStore().setUser(user('archivist'))
    const w = await mountSuspended(DelaReocrModal, {
      props: { 'open': true, 'shifr': 'Ф.1 Оп.1 Д.12', 'pagesTotal': 4, 'onUpdate:open': () => {} },
      attachTo: document.body,
    })
    await flushPromises()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Ручные исправления будут перезаписаны')
    const confirm = [...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Перезаписать и распознать'))
    expect(confirm?.className).toMatch(/bg-error/)
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
