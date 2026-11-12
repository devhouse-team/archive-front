<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useHealthStore } from '~/stores/health'
import { headerButtonClass } from '~/utils/civic-ui'
import { eaisView } from '~/utils/eais'
import { formatTimestamp } from '~/utils/format'

// Header ЕАИС indicator (handoff §4, §6; spec 2 §Status mapping). Text is always white on the civic field;
// "down" is a solid error badge with words, never a dot colour alone. STAFF can open the system details
// (workers, disk); readers see only the ЕАИС state.
const { t } = useT()
const auth = useAuthStore()
const health = useHealthStore()

const view = computed(() => eaisView(health.data, health.retryIn))
const downSince = computed(() => {
  const since = health.data?.eais_down_since
  return since ? t('eais.downSince', { time: formatTimestamp(since) }) : null
})
// Announce changes of the ЕАИС state only (online ⇄ down), not the first answer and not the countdown.
const announcement = ref('')
watch(() => view.value.state, (state, prev) => {
  if (prev && prev !== 'unknown' && state !== 'unknown' && state !== prev) announcement.value = view.value.label
})

const diskFree = computed(() => health.data ? t('eais.disk.free', { gb: health.data.disk_free_gb.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) }) : '')
</script>

<template>
  <div class="flex min-w-0 items-center">
    <!-- Polite announcement of state changes only; the per-second countdown never reaches it. -->
    <span
      role="status"
      class="sr-only"
    >{{ announcement }}</span>

    <UPopover
      v-if="auth.isStaff"
      :content="{ align: 'end', sideOffset: 8 }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        :class="['min-h-9 min-w-0', headerButtonClass]"
      >
        <EaisIndicatorFace
          :view="view"
          show-problems
        />
      </UButton>

      <template #content>
        <div class="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 p-4 text-sm">
          <h2 class="text-sm font-semibold text-highlighted">
            {{ t('eais.details') }}
          </h2>

          <dl class="flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <dt class="text-[13px] text-muted">
                {{ t('eais.system') }}
              </dt>
              <dd class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <UBadge
                  v-if="view.state !== 'unknown'"
                  :color="view.state === 'online' ? 'success' : 'error'"
                  variant="soft"
                  size="md"
                  :label="view.state === 'online' ? t('eais.statusOnline') : t('eais.statusDown')"
                />
                <span
                  v-else
                  class="text-muted"
                >{{ view.label }}</span>
                <span
                  v-if="downSince"
                  class="text-muted tabular-nums"
                >{{ downSince }}</span>
              </dd>
              <dd
                v-if="view.state === 'down'"
                class="text-toned"
              >
                <span
                  v-if="view.retry"
                  class="tabular-nums"
                >{{ view.retry }}. </span>{{ t('eais.downHint') }}
              </dd>
            </div>

            <div
              v-if="view.workers.length"
              class="flex flex-col gap-1"
            >
              <dt class="text-[13px] text-muted">
                {{ t('eais.workers.title') }}
              </dt>
              <dd>
                <ul class="flex flex-col gap-1">
                  <li
                    v-for="w in view.workers"
                    :key="w.id"
                    class="flex items-center justify-between gap-3"
                  >
                    <span class="flex items-center gap-2">
                      <UIcon
                        :name="w.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
                        :class="['size-4 shrink-0', w.ok ? 'text-success' : 'text-error']"
                        aria-hidden="true"
                      />
                      {{ t(`eais.workers.${w.id}`) }}
                    </span>
                    <span :class="['tabular-nums', w.ok ? 'text-muted' : 'font-medium text-error']">{{ w.status }}</span>
                  </li>
                </ul>
              </dd>
            </div>

            <div
              v-if="health.data"
              class="flex flex-col gap-1"
            >
              <dt class="text-[13px] text-muted">
                {{ t('eais.disk.title') }}
              </dt>
              <dd class="flex flex-wrap items-center gap-2">
                <span class="tabular-nums">{{ diskFree }}</span>
                <UBadge
                  v-if="view.diskLow"
                  color="warning"
                  variant="soft"
                  size="md"
                  icon="i-lucide-hard-drive"
                  :label="t('eais.disk.low')"
                />
              </dd>
            </div>
          </dl>
        </div>
      </template>
    </UPopover>

    <div
      v-else
      class="flex min-h-9 min-w-0 items-center px-2.5"
    >
      <EaisIndicatorFace
        :view="view"
        :show-problems="false"
      />
    </div>
  </div>
</template>
