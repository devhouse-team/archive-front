<script setup lang="ts">
import { adminAge } from '~/composables/useAdmin'
import { useHealthStore } from '~/stores/health'
import { WORKER_IDS } from '~/utils/eais'
import { formatTimestamp } from '~/utils/format'

// Service health (handoff §5.1 /api/health). Read from the shell's health store, which already polls every 5 s;
// this panel never starts a poll of its own.
const { t } = useT()
const health = useHealthStore()
const data = computed(() => health.data)

const workers = computed(() => {
  const h = data.value
  if (!h) return []
  return WORKER_IDS.filter(id => h.workers?.[id]).map((id) => {
    const w = h.workers[id]
    return {
      id,
      ok: w.ok,
      age: w.age_s === null ? null : adminAge(w.age_s),
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
      <span class="text-[13px] text-muted">{{ t('admin.health.updated') }}</span>
    </div>

    <p
      v-if="!data"
      class="text-sm text-muted"
      role="status"
    >
      {{ t('admin.health.noData') }}
    </p>

    <dl
      v-else
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
              :color="w.ok ? 'success' : 'error'"
              variant="soft"
              size="md"
              :icon="w.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
              :label="w.ok ? t('eais.workers.ok') : t('eais.workers.never')"
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
