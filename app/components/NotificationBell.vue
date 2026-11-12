<script setup lang="ts">
import type { NotificationLevel } from '~/types/api'
import { useNotificationsStore } from '~/stores/notifications'
import { headerButtonClass } from '~/utils/civic-ui'
import { formatCount, formatTimestamp, localDate } from '~/utils/format'

// Header bell (handoff §6 #12). The shell renders it for STAFF only, so readers get no bell and no request.
const { t } = useT()
const store = useNotificationsStore()
const { notify } = useNotify()

const LEVELS: Record<NotificationLevel, { icon: string, cls: string }> = {
  error: { icon: 'i-lucide-circle-alert', cls: 'text-error' },
  warn: { icon: 'i-lucide-triangle-alert', cls: 'text-warning' },
  info: { icon: 'i-lucide-info', cls: 'text-info' },
}

const open = ref(false)
const marking = ref(false)
const today = computed(() => {
  void open.value // re-evaluate the date each time the list opens
  return localDate()
})

const badge = computed(() => store.unread > 0 ? formatCount(store.unread) : null)
const label = computed(() => store.unread > 0 ? t('notifications.open', { count: store.unread }) : t('notifications.openNone'))

// New error-level notifications raise one toast each while the app is open (never on first load: the store
// only marks items newer than the first list as fresh).
watch(() => store.fresh, (items) => {
  for (const n of items) notify(n.message, 'error')
})

async function markAllRead() {
  if (marking.value) return
  marking.value = true
  try {
    await store.markAllRead()
  }
  catch {
    // useApi already toasted the server's message.
  }
  finally {
    marking.value = false
  }
}

function retry() {
  store.refresh().catch(() => {})
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', sideOffset: 8 }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      square
      icon="i-lucide-bell"
      :aria-label="label"
      :class="['relative', headerButtonClass]"
    >
      <template #trailing>
        <span
          v-if="badge"
          class="absolute -end-1 -top-1 min-w-5 rounded-full bg-inverted px-1.5 text-center text-xs/5 font-semibold text-inverted tabular-nums shadow-[0_0_0_2px_var(--color-rail)]"
          aria-hidden="true"
        >{{ badge }}</span>
      </template>
    </UButton>

    <template #content>
      <section
        class="flex max-h-[min(32rem,calc(100vh-6rem))] w-96 max-w-[calc(100vw-2rem)] flex-col"
        aria-labelledby="bell-title"
      >
        <header class="flex items-center justify-between gap-3 border-b border-default py-2 ps-4 pe-2">
          <h2
            id="bell-title"
            class="text-sm font-semibold text-highlighted"
          >
            {{ t('notifications.title') }}
          </h2>
          <UButton
            v-if="store.unread > 0"
            color="neutral"
            variant="ghost"
            :loading="marking"
            :label="t('notifications.markAllRead')"
            @click="markAllRead"
          />
        </header>

        <p
          v-if="store.loading"
          class="flex items-center gap-2 px-4 py-6 text-sm text-muted"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {{ t('notifications.loading') }}
        </p>

        <div
          v-else-if="store.failed && !store.loaded"
          class="flex flex-col items-start gap-3 px-4 py-6 text-sm"
        >
          <p class="text-toned">
            {{ t('notifications.error') }}
          </p>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :label="t('notifications.retry')"
            @click="retry"
          />
        </div>

        <p
          v-else-if="store.items.length === 0"
          class="px-4 py-6 text-sm text-muted"
        >
          {{ t('notifications.empty') }}
        </p>

        <ul
          v-else
          class="divide-y divide-default overflow-y-auto"
        >
          <li
            v-for="n in store.items"
            :key="n.id"
            :class="['flex gap-3 px-4 py-3', !n.read && 'bg-elevated/60']"
          >
            <UIcon
              :name="LEVELS[n.level]?.icon ?? LEVELS.info.icon"
              :class="['mt-0.5 size-4 shrink-0', LEVELS[n.level]?.cls ?? LEVELS.info.cls]"
              aria-hidden="true"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <p
                :class="['text-sm break-words', n.read ? 'text-toned' : 'font-medium text-highlighted']"
                dir="auto"
              >
                {{ n.message }}
              </p>
              <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span :class="LEVELS[n.level]?.cls">{{ t(`notifications.levels.${n.level}`) }}</span>
                <span aria-hidden="true">·</span>
                <time
                  :datetime="n.ts.replace(' ', 'T')"
                  class="tabular-nums"
                >{{ formatTimestamp(n.ts, today) }}</time>
                <template v-if="!n.read">
                  <span aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1 font-semibold text-highlighted">
                    <span
                      class="size-1.5 rounded-full bg-inverted"
                      aria-hidden="true"
                    />
                    {{ t('notifications.unread') }}
                  </span>
                </template>
              </p>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </UPopover>
</template>
