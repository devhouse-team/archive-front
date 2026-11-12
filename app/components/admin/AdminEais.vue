<script setup lang="ts">
import type { EaisStatus } from '~/types/api'
import { useHealthStore } from '~/stores/health'

// The demo outage switch (handoff §5.6 /mock-eais/api/status). Going offline asks first; going back online does
// not, because it only restores the normal state. The header indicator follows through one health refresh.
const { t } = useT()
const api = useApi()
const health = useHealthStore()
const { notify } = useNotify()

const status = ref<EaisStatus | null>(null)
const loading = ref(true)
const failed = ref(false)
const saving = ref(false)
const confirmOpen = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    status.value = await api.eais.status()
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}
void load()

async function apply(online: boolean) {
  if (saving.value) return
  saving.value = true
  try {
    const res = await api.eais.setOnline(online)
    if (status.value) status.value = { ...status.value, online: res.online }
    confirmOpen.value = false
    notify(t(res.online ? 'admin.eais.switchedOn' : 'admin.eais.switchedOff'), res.online ? 'success' : 'warning')
    void health.refresh().catch(() => {})
  }
  catch {
    // Toast from the shared client; the switch keeps showing the server's state.
  }
  finally {
    saving.value = false
  }
}

const online = computed<boolean>({
  get: () => status.value?.online ?? false,
  set: (value) => {
    if (value) void apply(true)
    else confirmOpen.value = true
  },
})
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-lg bg-default p-5"
    aria-labelledby="admin-eais"
  >
    <h2
      id="admin-eais"
      class="text-lg font-semibold text-highlighted"
    >
      {{ t('admin.eais.title') }}
    </h2>
    <p class="text-sm text-muted">
      {{ t('admin.eais.demo') }}
    </p>

    <USkeleton
      v-if="loading && !status"
      class="h-9 w-56"
      :aria-label="t('admin.eais.loading')"
    />
    <UAlert
      v-else-if="failed && !status"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('admin.eais.error')"
      :actions="[{ label: t('admin.eais.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />
    <div
      v-else-if="status"
      class="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <USwitch
        v-model="online"
        :label="t('admin.eais.switch')"
        :loading="saving"
        :disabled="saving"
        color="success"
      />
      <UBadge
        :color="status.online ? 'success' : 'error'"
        variant="soft"
        size="md"
        :icon="status.online ? 'i-lucide-plug-zap' : 'i-lucide-unplug'"
        :label="t(status.online ? 'admin.eais.online' : 'admin.eais.offline')"
      />
      <span class="basis-full text-[13px] text-muted tabular-nums">
        {{ t('admin.eais.counts', { cases: status.cases, files: status.files }) }}
      </span>
    </div>

    <UModal
      v-model:open="confirmOpen"
      :title="t('admin.eais.confirmTitle')"
      :description="t('admin.eais.confirmBody')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          :label="t('admin.eais.cancel')"
          autofocus
          @click="confirmOpen = false"
        />
        <UButton
          color="error"
          icon="i-lucide-unplug"
          :loading="saving"
          :label="t('admin.eais.confirm')"
          @click="apply(false)"
        />
      </template>
    </UModal>
  </section>
</template>
