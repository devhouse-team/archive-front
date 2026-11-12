import { useAuthStore } from '~/stores/auth'
import { safeNext } from '~/utils/access'
import { isApiError } from '~/utils/api-error'

/**
 * Session and role gate (handoff §2, §3).
 * - Every page declares `definePageMeta({ roles })` or `public: true` (login only).
 * - No session, or a role the UI does not know → /login?next=<target>.
 * - `/` → the role's start route.
 * - Unknown paths match app/pages/[...slug].vue (all roles), which shows the not-found state.
 * - A role outside the page's `roles` → «Нет доступа» in place of the page. The page component never mounts,
 *   so it never requests data it cannot see.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { raise, clear } = usePageError()
  clear()

  const auth = useAuthStore()
  try {
    await auth.ensure()
  }
  catch (e) {
    // Backend unreachable or failing: say so instead of pretending the user is logged out.
    if (to.meta.public) return
    raise('error', isApiError(e) ? e.message : null)
    return
  }

  if (to.path === '/login') {
    if (auth.me) return navigateTo(safeNext(to.query.next) ?? auth.startPath, { replace: true })
    return
  }

  if (to.meta.public) return

  if (!auth.me) {
    return navigateTo({ path: '/login', query: to.fullPath === '/' ? {} : { next: to.fullPath } }, { replace: true })
  }

  if (to.path === '/') return navigateTo(auth.startPath, { replace: true })

  // A page without `roles` is closed by default: access is opt-in.
  const roles = to.meta.roles
  if (!roles || !roles.includes(auth.me.role)) raise('forbidden')
})
