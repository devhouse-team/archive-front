import { ROLES } from '~/types/api'
import type { Role } from '~/types/api'

// Handoff §2. Role groups used by the API.
export const STAFF: readonly Role[] = ['admin', 'archivist', 'operator']
export const EDITORS: readonly Role[] = ['admin', 'archivist']
export const ALL_ROLES: readonly Role[] = ROLES

/**
 * Screens and capabilities from the §2 matrix. Page meta `roles` and the nav model use the same lists,
 * so routing, menu and in-screen actions cannot drift apart.
 */
export const ACCESS = {
  search: ALL_ROLES,
  page: ALL_ROLES,
  /** Edit mode on Страница (word corrections, «Проверено»). */
  pageEdit: EDITORS,
  /** Open дела and the case card. */
  dela: ALL_ROLES,
  /** Re-OCR a case (destructive, overwrites corrections). */
  delaManage: EDITORS,
  /** See restricted cases and the 🔒 badge. */
  restricted: EDITORS,
  collections: ALL_ROLES,
  ops: STAFF,
  upload: STAFF,
  errors: STAFF,
  journal: STAFF,
  /** The bell and /api/notifications. */
  notifications: STAFF,
  review: EDITORS,
  admin: ['admin'],
  /** Dev-only token specimen. */
  specimen: ['admin'],
} as const satisfies Record<string, readonly Role[]>

export type Screen = keyof typeof ACCESS

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function canAccess(role: Role | null | undefined, screen: Screen): boolean {
  if (!role) return false
  return (ACCESS[screen] as readonly Role[]).includes(role)
}

/** Start route per role (handoff §2): operator and admin land on the ops panel, the others on search. */
export function startRoute(role: Role | null | undefined): string {
  if (role === 'admin' || role === 'operator') return '/ops'
  if (role === 'archivist' || role === 'reader') return '/search'
  return '/login'
}

/**
 * A `next` target is only followed when it is a local path. Anything else (protocol-relative,
 * absolute URL, the login page itself) falls back to the role's start route.
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  if (next === '/login' || next.startsWith('/login?')) return null
  return next
}
