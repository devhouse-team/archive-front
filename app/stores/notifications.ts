import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Notification } from '~/types/api'
import { useAuthStore } from '~/stores/auth'

/** Brief 4: a modest interval for the bell (the ops screens may refresh it sooner on their own). */
export const NOTIFICATIONS_POLL_MS = 30000

/** The header bell (STAFF only). */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])
  const unread = ref(0)
  /** Highest id seen so far; null before the first load. */
  const lastId = ref<number | null>(null)
  /** Error-level items that arrived since the previous refresh, oldest first (the bell toasts them). */
  const fresh = ref<Notification[]>([])
  /** Whether a list has arrived at least once in this session. */
  const loaded = ref(false)
  /** The last refresh failed. */
  const failed = ref(false)
  const loading = computed(() => !loaded.value && !failed.value)

  async function refresh() {
    if (!useAuthStore().can('notifications')) return
    try {
      const res = await useApi().notifications.list()
      const prev = lastId.value
      // Never a burst on first load: only items newer than the first list count as fresh.
      fresh.value = prev === null
        ? []
        : res.items.filter(n => n.id > prev && n.level === 'error').sort((a, b) => a.id - b.id)
      items.value = res.items
      unread.value = res.unread
      lastId.value = res.items.length ? Math.max(...res.items.map(n => n.id)) : (prev ?? 0)
      loaded.value = true
      failed.value = false
    }
    catch (e) {
      failed.value = true
      throw e
    }
  }

  /** POST /api/notifications/read, then reload the list (brief 4). */
  async function markAllRead() {
    await useApi().notifications.markAllRead()
    items.value = items.value.map(n => ({ ...n, read: 1 as const }))
    unread.value = 0
    await refresh()
  }

  /** Forget the previous session's notifications (logout, 401). */
  function reset() {
    items.value = []
    unread.value = 0
    lastId.value = null
    fresh.value = []
    loaded.value = false
    failed.value = false
  }

  /** Call from the shell's setup; polling stops when the shell unmounts. Readers never poll. */
  function startPolling() {
    if (!useAuthStore().can('notifications')) return
    usePolling(refresh, NOTIFICATIONS_POLL_MS)
  }

  return { items, unread, lastId, fresh, loaded, failed, loading, refresh, markAllRead, reset, startPolling }
})
