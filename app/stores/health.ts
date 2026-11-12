import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Health } from '~/types/api'
import type { ApiError } from '~/utils/api-error'
import { isApiError, toApiError } from '~/utils/api-error'
import { secondsUntil } from '~/utils/format'
import { useAuthStore } from '~/stores/auth'

export const HEALTH_POLL_MS = 5000

/** /api/health: the ЕАИС indicator and the upload retry countdown shown everywhere (handoff §4). */
export const useHealthStore = defineStore('health', () => {
  const data = ref<Health | null>(null)
  const error = ref<ApiError | null>(null)
  /** Local clock (ms) when the next automatic retry runs, from next_retry_in at fetch time. */
  const retryDeadline = ref<number | null>(null)
  /** Ticks every second while polling so the countdown moves between fetches. */
  const now = ref(Date.now())

  /** The last poll failed: `data` is the last good answer and must not be shown as the current state. */
  const stale = computed(() => error.value !== null)
  /** null while unknown: before the first answer or while the last poll failed. */
  const eaisOnline = computed<boolean | null>(() => stale.value ? null : data.value?.eais_online ?? null)
  const retryIn = computed<number | null>(() =>
    retryDeadline.value === null ? null : secondsUntil(retryDeadline.value, now.value))

  async function refresh() {
    // After logout or a 401 the shell may tick once more before it unmounts; never ask without a session.
    if (!useAuthStore().me) return
    try {
      const health = await useApi().health.get()
      data.value = health
      error.value = null
      now.value = Date.now()
      retryDeadline.value = health.next_retry_in === null ? null : now.value + health.next_retry_in * 1000
    }
    catch (e) {
      error.value = isApiError(e) ? e : toApiError(null, null)
      throw e
    }
  }

  /** Forget the previous session's state (logout, 401). */
  function reset() {
    data.value = null
    error.value = null
    retryDeadline.value = null
  }

  /** Call from a component's setup (the shell). Polling stops when that component unmounts. */
  function startPolling() {
    usePolling(refresh, HEALTH_POLL_MS)
    usePolling(() => {
      now.value = Date.now()
    }, 1000, { immediate: false })
  }

  return { data, error, stale, now, retryDeadline, eaisOnline, retryIn, refresh, reset, startPolling }
})
