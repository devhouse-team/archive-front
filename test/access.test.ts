import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useHealthStore } from '~/stores/health'
import { useNotificationsStore } from '~/stores/notifications'
import { useQueueStore } from '~/stores/queue'
import type { Role, User } from '~/types/api'
import { safeNext, startRoute } from '~/utils/access'
import type { Screen } from '~/utils/access'
import { navForRole } from '~/utils/nav'

const user = (role: Role): User => ({ id: 1, username: role, full_name: role, role, role_ru: role })

// Handoff §2, row by row. ✓ = may use. «open only» (Дела for operator/reader) = may open, not manage.
const MATRIX: Record<Screen, Record<Role, boolean>> = {
  search: { admin: true, archivist: true, operator: true, reader: true },
  page: { admin: true, archivist: true, operator: true, reader: true },
  pageEdit: { admin: true, archivist: true, operator: false, reader: false },
  dela: { admin: true, archivist: true, operator: true, reader: true },
  delaManage: { admin: true, archivist: true, operator: false, reader: false },
  restricted: { admin: true, archivist: true, operator: false, reader: false },
  collections: { admin: true, archivist: true, operator: true, reader: true },
  ops: { admin: true, archivist: true, operator: true, reader: false },
  upload: { admin: true, archivist: true, operator: true, reader: false },
  errors: { admin: true, archivist: true, operator: true, reader: false },
  journal: { admin: true, archivist: true, operator: true, reader: false },
  notifications: { admin: true, archivist: true, operator: true, reader: false },
  review: { admin: true, archivist: true, operator: false, reader: false },
  admin: { admin: true, archivist: false, operator: false, reader: false },
  specimen: { admin: true, archivist: false, operator: false, reader: false },
}

describe('auth store can() against the §2 matrix', () => {
  beforeEach(() => setActivePinia(createPinia()))

  for (const [screen, row] of Object.entries(MATRIX) as Array<[Screen, Record<Role, boolean>]>) {
    for (const [role, expected] of Object.entries(row) as Array<[Role, boolean]>) {
      it(`${role} ${expected ? 'can' : 'cannot'} use ${screen}`, () => {
        const auth = useAuthStore()
        auth.setUser(user(role))
        expect(auth.can(screen)).toBe(expected)
      })
    }
  }

  it('no session can use nothing', () => {
    const auth = useAuthStore()
    for (const screen of Object.keys(MATRIX) as Screen[]) expect(auth.can(screen)).toBe(false)
  })

  it('an unknown role is treated as no session', () => {
    const auth = useAuthStore()
    auth.setUser({ ...user('reader'), role: 'superuser' as Role })
    expect(auth.me).toBeNull()
    expect(auth.can('search')).toBe(false)
  })

  it('clear() (logout, 401) resets the session-bound stores', () => {
    const auth = useAuthStore()
    auth.setUser(user('operator'))
    const queue = useQueueStore()
    const notifications = useNotificationsStore()
    const health = useHealthStore()
    queue.counts = { errors: 4, review: 1 }
    notifications.unread = 3
    notifications.lastId = 9
    notifications.items = [{ id: 9, ts: '2026-11-12 00:00:00', level: 'error', message: 'x', read: 0 }]
    health.retryDeadline = Date.now() + 60000
    auth.clear()
    expect(auth.me).toBeNull()
    expect(queue.counts).toEqual({ errors: 0, review: 0 })
    expect(queue.queue).toBeNull()
    expect(notifications.unread).toBe(0)
    expect(notifications.items).toEqual([])
    expect(notifications.lastId).toBeNull()
    expect(health.data).toBeNull()
    expect(health.retryIn).toBeNull()
  })

  it('role flags: STAFF and EDITORS', () => {
    const auth = useAuthStore()
    const flags = (role: Role) => {
      auth.setUser(user(role))
      return [auth.isStaff, auth.isEditor]
    }
    expect(flags('admin')).toEqual([true, true])
    expect(flags('archivist')).toEqual([true, true])
    expect(flags('operator')).toEqual([true, false])
    expect(flags('reader')).toEqual([false, false])
  })
})

describe('start routes and next', () => {
  it('archivist and reader land on /search; operator and admin on /ops', () => {
    expect(startRoute('archivist')).toBe('/search')
    expect(startRoute('reader')).toBe('/search')
    expect(startRoute('operator')).toBe('/ops')
    expect(startRoute('admin')).toBe('/ops')
    expect(startRoute(null)).toBe('/login')
  })

  it('only follows local next paths', () => {
    expect(safeNext('/page/9?hl=мектеп')).toBe('/page/9?hl=мектеп')
    expect(safeNext('//evil.example')).toBeNull()
    expect(safeNext('https://evil.example')).toBeNull()
    expect(safeNext('/\\evil.example')).toBeNull()
    expect(safeNext('/login?next=/ops')).toBeNull()
    expect(safeNext(undefined)).toBeNull()
  })
})

describe('nav filtering per role', () => {
  const ids = (role: Role) => navForRole(role).map(g => [g.id, g.items.map(i => i.id)])

  it('admin sees every item in three groups', () => {
    expect(ids('admin')).toEqual([
      ['fond', ['search', 'dela', 'collections']],
      ['processing', ['ops', 'upload', 'errors', 'review', 'journal']],
      ['system', ['admin']],
    ])
  })

  it('archivist: no Администрирование, and the empty system group is dropped', () => {
    expect(ids('archivist')).toEqual([
      ['fond', ['search', 'dela', 'collections']],
      ['processing', ['ops', 'upload', 'errors', 'review', 'journal']],
    ])
  })

  it('operator: no review queue, no admin', () => {
    expect(ids('operator')).toEqual([
      ['fond', ['search', 'dela', 'collections']],
      ['processing', ['ops', 'upload', 'errors', 'journal']],
    ])
  })

  it('reader: only the fond group; processing and system labels are not rendered', () => {
    expect(ids('reader')).toEqual([['fond', ['search', 'dela', 'collections']]])
  })

  it('no role, no nav', () => {
    expect(navForRole(null)).toEqual([])
  })

  it('every nav item agrees with can()', () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    for (const role of ['admin', 'archivist', 'operator', 'reader'] as Role[]) {
      auth.setUser(user(role))
      for (const group of navForRole(role)) {
        for (const item of group.items) expect(auth.can(item.id)).toBe(true)
      }
    }
  })
})
