import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '~/types/api'
import { canAccess, EDITORS, isRole, STAFF, startRoute } from '~/utils/access'
import type { Screen } from '~/utils/access'
import { isApiError } from '~/utils/api-error'
import { useHealthStore } from '~/stores/health'
import { useNotificationsStore } from '~/stores/notifications'
import { useQueueStore } from '~/stores/queue'

export const useAuthStore = defineStore('auth', () => {
  /** The session user. Never persisted: the session lives in the httpOnly cookie only. */
  const me = ref<User | null>(null)
  /** Whether /api/me has answered at least once in this tab. */
  const checked = ref(false)
  let pending: Promise<User | null> | null = null

  const role = computed(() => me.value?.role ?? null)
  const isStaff = computed(() => !!role.value && STAFF.includes(role.value))
  const isEditor = computed(() => !!role.value && EDITORS.includes(role.value))
  const startPath = computed(() => startRoute(role.value))

  /** Handoff §2 matrix: whether the current user may open a screen or use a capability. */
  function can(screen: Screen): boolean {
    return canAccess(role.value, screen)
  }

  function setUser(user: User | null) {
    // A role the UI does not know is treated as no session at all.
    me.value = user && isRole(user.role) ? user : null
    checked.value = true
  }

  /**
   * Session check through /api/me. 401 → no user. Other failures (backend down) are rethrown so the
   * caller can show an error state instead of a misleading login page.
   */
  async function ensure(force = false): Promise<User | null> {
    if (checked.value && !force) return me.value
    if (pending) return pending
    const api = useApi()
    pending = api.auth.me()
      .then((user) => {
        setUser(user)
        return me.value
      })
      .catch((e: unknown) => {
        if (isApiError(e) && e.kind === 'unauthorized') {
          setUser(null)
          return null
        }
        throw e
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  /** Throws ApiError on failure; the login form shows its message («Неверный логин или пароль»). */
  async function login(username: string, password: string): Promise<User | null> {
    const user = await useApi().auth.login({ username, password })
    setUser(user)
    return me.value
  }

  async function logout() {
    const api = useApi()
    try {
      await api.auth.logout()
    }
    finally {
      clear()
      await navigateTo('/login')
    }
  }

  /**
   * Drop the user without a request (after a 401, and on logout). The session-bound stores are reset too,
   * so the previous user's counters and notifications never show to the next login in the same tab.
   */
  function clear() {
    me.value = null
    checked.value = true
    useQueueStore().reset()
    useNotificationsStore().reset()
    useHealthStore().reset()
  }

  return { me, checked, role, isStaff, isEditor, startPath, can, setUser, ensure, login, logout, clear }
})
