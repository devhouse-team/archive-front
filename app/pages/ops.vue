<script setup lang="ts">
import type { JournalRow } from '~/types/api'
import { useQueueStore } from '~/stores/queue'
import { ACCESS } from '~/utils/access'
import { errorText, OPS_POLL_MS } from '~/composables/useOps'

// Панель оператора (handoff §6 #2; surface brief app-pages-ops-vue). STAFF only (page meta + middleware).
definePageMeta({ roles: ACCESS.ops, title: 'pages.ops' })

const { t } = useT()
const api = useApi()

// Counters come from the queue store, which the shell already polls every 5 s (no second request here).
const queueStore = useQueueStore()
const queue = computed(() => queueStore.queue)
const queueError = ref<string | null>(null)
const events = ref<JournalRow[] | null>(null)
const eventsError = ref<string | null>(null)
const loading = ref(true)

/** Only when the store has nothing yet (first visit, or its last poll failed): one direct refresh with an error state. */
async function loadQueue() {
  try {
    await queueStore.refresh()
    queueError.value = null
  }
  catch (e) {
    queueError.value = errorText(e) ?? t('ops.tiles.loadError')
  }
}

async function loadEvents() {
  try {
    events.value = await api.request<JournalRow[]>('/api/m1/journal', { query: { limit: 10 }, errorMode: 'background' })
    eventsError.value = null
  }
  catch (e) {
    eventsError.value = errorText(e) ?? t('ops.events.loadError')
  }
}

onMounted(async () => {
  if (!queueStore.queue) await loadQueue()
  loading.value = false
})

// Handoff §4: recent events are polled only while this screen is mounted; usePolling stops on unmount.
const polling = usePolling(loadEvents, OPS_POLL_MS)

const waiting = computed(() => (queue.value?.files.queued ?? 0) + (queue.value?.files.retry ?? 0))
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-5">
    <h1 class="sr-only">
      {{ t('pages.ops') }}
    </h1>

    <OpsEaisBanner :waiting="waiting" />

    <UAlert
      v-if="queueError && !queue"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="queueError"
      :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: loadQueue }]"
    />
    <OpsStatTiles
      v-else
      :queue="queue"
      :loading="loading"
    />

    <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <OpsStatsPanel />
      <OpsRecentEvents
        :rows="events"
        :loading="!events && !eventsError"
        :error="eventsError"
        @retry="polling.trigger()"
      />
    </div>
  </div>
</template>
