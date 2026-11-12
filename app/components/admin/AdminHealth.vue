<script setup lang="ts">
import { adminAge } from '~/composables/useAdmin'
import { useHealthStore } from '~/stores/health'
import { WORKER_IDS } from '~/utils/eais'
import { formatDuration, formatTimestamp } from '~/utils/format'

// Service health (handoff §5.1 /api/health). Read from the shell's health store, which already polls every 5 s;
// this panel never starts a poll of its own. When the last poll failed (health.error) the data on screen is the
// last good answer: it is labelled as such and the worker states turn neutral instead of claiming «работает».
const { t } = useT()
const health = useHealthStore()
const data = computed(() => health.data)
const stale = computed(() => health.error !== null)

const workers = computed(() => {
  const h = data.value
  if (!h) return []
  return WORKER_IDS.filter(id => h.workers?.[id]).map((id) => {
    const w = h.workers[id]
    const age = w.age_s === null ? null : adminAge(w.age_s)
    if (stale.value) {
      return { id, color: 'neutral' as const, icon: 'i-lucide-circle-help', label: t('admin.health.workerUnknown'), age: null }
    }
    if (w.ok) {
      return { id, color: 'success' as const, icon: 'i-lucide-circle-check', label: t('eais.workers.ok'), age }
    }
    // Shared wording «нет сигнала 2:15» carries the age itself, so no separate age line.
    return {
      id,
      color: 'error' as const,
      icon: 'i-lucide-circle-alert',
      label: w.age_s === null ? t('eais.workers.never') : t('eais.workers.stale', { age: formatDuration(w.age_s) }),
      age: null,
    }
  })
})

const ENGINE_KEYS = ['tesseract', 'vlm', 'auto'] as const
const engine = computed(() => {
  const value = data.value?.ocr_engine
  if (!value) return null
  return (ENGINE_KEYS as readonly string[]).includes(value)
    ? t(`admin.health.engines.${value as typeof ENGINE_KEYS[number]}`)
    : value
})

const serverTime = computed(() => {
  const ts = data.value?.server_time
  if (!ts) return null
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(ts * 1000))
})

const backup = computed(() => data.value?.last_backup ? formatTimestamp(data.value.last_backup) : null)
const disk = computed(() => data.value ? String(data.value.disk_free_gb).replace('.', ',') : null)
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-lg bg-default p-5"
    aria-labelledby="admin-health"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2
        id="admin-health"
        class="text-lg font-semibold text-highlighted"
      >
        {{ t('admin.health.title') }}
      </h2>
      <span
        v-if="!stale"
        class="text-[13px] text-muted"
      >{{ t('admin.health.updated') }}</span>
    </div>

    <UAlert
      v-if="stale"
      data-testid="health-stale"
      role="status"
      color="warning"
      variant="soft"
      icon="i-lucide-wifi-off"
      :title="serverTime ? t('admin.health.stale', { time: serverTime }) : t('admin.health.staleNoTime')"
      :description="data ? t('admin.health.staleHint') : undefined"
    />

    <p
      v-if="!data && !stale"
      class="text-sm text-muted"
      role="status"
    >
      {{ t('admin.health.noData') }}
    </p>

    <dl
      v-if="data"
      class="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm"
    >
      <dt class="pt-1 text-muted">
        {{ t('admin.health.workers') }}
      </dt>
      <dd>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="w in workers"
            :key="w.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <UBadge
              :color="w.color"
              variant="soft"
              size="md"
              :icon="w.icon"
              :label="w.label"
            />
            <span class="text-default">{{ t(`eais.workers.${w.id}`) }}</span>
            <span
              v-if="w.age"
              class="text-muted tabular-nums"
            >{{ t('admin.health.age', { age: w.age }) }}</span>
          </li>
        </ul>
      </dd>

      <dt class="text-muted">
        {{ t('admin.health.disk') }}
      </dt>
      <dd class="flex flex-wrap items-center gap-2">
        <span class="tabular-nums">{{ t('admin.health.diskValue', { gb: disk ?? '' }) }}</span>
        <UBadge
          v-if="data.disk_low"
          color="warning"
          variant="soft"
          size="md"
          icon="i-lucide-hard-drive"
          :label="t('admin.health.diskLow')"
        />
      </dd>

      <dt class="text-muted">
        {{ t('admin.health.engine') }}
      </dt>
      <dd>{{ engine }}</dd>

      <dt class="text-muted">
        {{ t('admin.health.tesseract') }}
      </dt>
      <dd class="tabular-nums">
        {{ data.tesseract }}
      </dd>

      <dt class="text-muted">
        {{ t('admin.health.backup') }}
      </dt>
      <dd
        class="tabular-nums"
        :class="backup ? '' : 'text-muted'"
      >
        {{ backup ?? t('admin.health.backupNone') }}
      </dd>

      <dt class="text-muted">
        {{ t('admin.health.serverTime') }}
      </dt>
      <dd class="tabular-nums">
        {{ serverTime }}
      </dd>
    </dl>
  </section>
</template>
