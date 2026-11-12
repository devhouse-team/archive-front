import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QueueCounters } from '~/types/api'
import type { NavCounter } from '~/utils/nav'
import { useAuthStore } from '~/stores/auth'

export const QUEUE_POLL_MS = 5000

/**
 * Menu counters (handoff §6): «Ошибки» from /api/m1/queue files.invalid (STAFF),
 * «Очередь проверки» from the length of /api/review (EDITORS).
 */
export const useQueueStore = defineStore('queue', () => {
  const queue = ref<QueueCounters | null>(null)
  const counts = ref<Record<NavCounter, number>>({ errors: 0, review: 0 })

  async function refresh() {
    const auth = useAuthStore()
    const api = useApi()
    const jobs: Promise<void>[] = []
    if (auth.can('errors')) {
      jobs.push(api.m1.queue().then((q) => {
        queue.value = q
        counts.value.errors = q.files.invalid
      }))
    }
    if (auth.can('review')) {
      jobs.push(api.review.list('background').then((list) => {
        counts.value.review = list.length
      }))
    }
    await Promise.all(jobs)
  }

  function reset() {
    queue.value = null
    counts.value = { errors: 0, review: 0 }
  }

  /** Roles without «Ошибки» and «Очередь проверки» (readers) never poll at all. */
  function startPolling() {
    const auth = useAuthStore()
    if (!auth.can('errors') && !auth.can('review')) return
    usePolling(refresh, QUEUE_POLL_MS)
  }

  return { queue, counts, refresh, reset, startPolling }
})
