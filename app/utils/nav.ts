import type { Role } from '~/types/api'
import type { MessageKey } from '~/composables/useT'
import { ACCESS } from '~/utils/access'
import type { Screen } from '~/utils/access'

// The single source for the navigation model. The Stage 4 rail renders from navForRole().

export type NavGroupId = 'fond' | 'processing' | 'system'
/** Which menu counter an item shows (from the queue store). */
export type NavCounter = 'errors' | 'review'

export interface NavItem {
  id: Screen
  to: string
  label: MessageKey
  icon: string
  group: NavGroupId
  roles: readonly Role[]
  counter?: NavCounter
  /** Other route prefixes that mark this item active (e.g. a page belongs to Дела). */
  activeFor?: readonly string[]
}

export interface NavGroup {
  id: NavGroupId
  /** Bilingual label: Kazakh · Russian (spec 2 sketch: «Қор · Фонд»). */
  labelKk: MessageKey
  labelRu: MessageKey
  items: NavItem[]
}

export const NAV_GROUPS: ReadonlyArray<Omit<NavGroup, 'items'>> = [
  { id: 'fond', labelKk: 'nav.groups.fond.kk', labelRu: 'nav.groups.fond.ru' },
  { id: 'processing', labelKk: 'nav.groups.processing.kk', labelRu: 'nav.groups.processing.ru' },
  { id: 'system', labelKk: 'nav.groups.system.kk', labelRu: 'nav.groups.system.ru' },
]

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'search', to: '/search', label: 'nav.search', icon: 'i-lucide-search', group: 'fond', roles: ACCESS.search },
  { id: 'dela', to: '/dela', label: 'nav.dela', icon: 'i-lucide-folder-open', group: 'fond', roles: ACCESS.dela, activeFor: ['/page'] },
  { id: 'collections', to: '/collections', label: 'nav.collections', icon: 'i-lucide-bookmark', group: 'fond', roles: ACCESS.collections },
  { id: 'ops', to: '/ops', label: 'nav.ops', icon: 'i-lucide-gauge', group: 'processing', roles: ACCESS.ops },
  { id: 'upload', to: '/upload', label: 'nav.upload', icon: 'i-lucide-upload', group: 'processing', roles: ACCESS.upload },
  { id: 'errors', to: '/errors', label: 'nav.errors', icon: 'i-lucide-circle-alert', group: 'processing', roles: ACCESS.errors, counter: 'errors' },
  { id: 'review', to: '/review', label: 'nav.review', icon: 'i-lucide-list-checks', group: 'processing', roles: ACCESS.review, counter: 'review' },
  { id: 'journal', to: '/journal', label: 'nav.journal', icon: 'i-lucide-scroll-text', group: 'processing', roles: ACCESS.journal },
  { id: 'admin', to: '/admin', label: 'nav.admin', icon: 'i-lucide-settings', group: 'system', roles: ACCESS.admin },
]

/**
 * The nav a role may see. Items the role cannot use are dropped, and a group with no items left
 * is dropped too, so its label is never rendered (spec 2 §Sketch corrections).
 */
export function navForRole(role: Role | null | undefined): NavGroup[] {
  if (!role) return []
  return NAV_GROUPS
    .map(group => ({
      ...group,
      items: NAV_ITEMS.filter(item => item.group === group.id && item.roles.includes(role)),
    }))
    .filter(group => group.items.length > 0)
}

/** Whether a nav item is the current location. */
export function isNavActive(item: NavItem, path: string): boolean {
  const prefixes = [item.to, ...(item.activeFor ?? [])]
  return prefixes.some(p => path === p || path.startsWith(`${p}/`))
}
