<script setup lang="ts">
import type { JournalRow, QueueCounters } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { errorText, OPS_POLL_MS } from '~/composables/useOps'

// Панель оператора (handoff §6 #2; surface brief app-pages-ops-vue). STAFF only (page meta + middleware).
definePageMeta({ roles: ACCESS.ops, title: 'pages.ops' })

const { t } = useT()
const api = useApi()

const queue = ref<QueueCounters | null>(null)
const queueError = ref<string | null>(null)
const events = ref<JournalRow[] | null>(null)
const eventsError = ref<string | null>(null)
const loading = ref(true)

async function loadQueue() {
  try {
    queue.value = await api.m1.queue('background')
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

async function refresh() {
  await Promise.all([loadQueue(), loadEvents()])
  loading.value = false
}

// Handoff §4: the queue is polled only while this screen is mounted; usePolling stops on unmount.
const polling = usePolling(refresh, OPS_POLL_MS)

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
      :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: () => polling.trigger() }]"
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
        :loading="loading"
        :error="eventsError"
        @retry="polling.trigger()"
      />
    </div>
  </div>
</template>
