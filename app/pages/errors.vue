<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { M1File } from '~/types/api'
import { canResend, errorText, fileShifr, OPS_POLL_MS } from '~/composables/useOps'
import { ACCESS } from '~/utils/access'
import { formatTimestamp } from '~/utils/format'

// Ошибки (handoff §6 #4, §9; surface brief app-pages-errors-vue). STAFF only.
// Rows come from /api/m1/files?status=invalid. error_path arrives in each row and is never rendered.
definePageMeta({ roles: ACCESS.errors, title: 'pages.errors' })

const { t } = useT()
const api = useApi()
const { notify } = useNotify()

const rows = ref<M1File[] | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const resending = ref<number | null>(null)
const fixing = ref<M1File | null>(null)
const modalOpen = ref(false)

async function load() {
  try {
    rows.value = await api.m1.files({ status: 'invalid' }, 'background')
    loadError.value = null
  }
  catch (e) {
    loadError.value = errorText(e) ?? t('errors_screen.loadError')
  }
  finally {
    loading.value = false
  }
}

const polling = usePolling(load, OPS_POLL_MS)

function openFix(f: M1File) {
  fixing.value = f
  modalOpen.value = true
}

/** After a fix or a resend the backend re-validates at once; an «invalid» answer is a new error. */
function report(row: M1File) {
  if (row.status === 'invalid') notify(t('errors_screen.againToast', { reason: row.error_reason ?? '' }), 'error')
  else notify(t('errors_screen.sentToast'), 'success')
  void polling.trigger()
}

async function resend(f: M1File) {
  resending.value = f.id
  try {
    report(await api.m1.retryFile(f.id))
  }
  catch {
    // The shared client already showed the server's detail as a toast.
  }
  finally {
    resending.value = null
  }
}

const columns = computed<TableColumn<M1File>[]>(() => [
  { id: 'preview', header: t('errors_screen.cols.preview'), meta: { class: { th: 'w-24' } } },
  { accessorKey: 'name', header: t('errors_screen.cols.name'), meta: { class: { td: 'whitespace-normal min-w-64' } } },
  { id: 'shifr', header: t('errors_screen.cols.shifr') },
  { accessorKey: 'updated_at', header: t('errors_screen.cols.time') },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, t('errors_screen.cols.actions')) },
])

const tableUi = {
  root: 'rounded-lg bg-default',
  th: 'bg-elevated py-2.5 text-[13px]',
  td: 'py-3 align-top text-default',
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-4">
    <h1 class="sr-only">
      {{ t('errors_screen.title') }}
    </h1>
    <p
      v-if="rows && rows.length"
      class="text-sm text-muted tabular-nums"
    >
      {{ t('errors_screen.count', { count: rows.length }) }}
    </p>

    <UAlert
      v-if="loadError && !rows"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: () => polling.trigger() }]"
    />

    <section
      v-else-if="rows && rows.length === 0"
      class="flex flex-col items-center gap-2 rounded-lg bg-default px-6 py-16 text-center"
    >
      <UIcon
        name="i-lucide-circle-check"
        class="size-8 text-success"
        aria-hidden="true"
      />
      <p class="text-base font-semibold text-highlighted">
        {{ t('errors_screen.empty') }}
      </p>
      <p class="text-sm text-muted">
        {{ t('errors_screen.emptyBody') }}
      </p>
    </section>

    <UTable
      v-else
      :data="rows ?? []"
      :columns="columns"
      :loading="loading && !rows"
      :ui="tableUi"
      :caption="t('errors_screen.title')"
    >
      <template #preview-cell="{ row }">
        <OpsFilePreview
          :file-id="row.original.id"
          :name="row.original.name"
        />
      </template>
      <template #name-cell="{ row }">
        <p class="font-medium text-highlighted">
          {{ row.original.name }}
          <span class="ms-1.5 text-xs font-normal text-muted">{{ row.original.workplace }}</span>
        </p>
        <p
          v-if="row.original.error_reason"
          class="mt-1 flex items-start gap-1.5 text-sm text-error"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{{ row.original.error_reason }}</span>
        </p>
      </template>
      <template #shifr-cell="{ row }">
        <ShifrPlate
          v-if="fileShifr(row.original)"
          variant="compact"
          :shifr="fileShifr(row.original)!"
        />
        <span
          v-else
          class="text-muted"
        >{{ t('errors_screen.noShifr') }}</span>
      </template>
      <template #updated_at-cell="{ row }">
        <span class="text-muted tabular-nums">{{ formatTimestamp(row.original.updated_at) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            icon="i-lucide-pencil"
            :label="t('errors_screen.fix')"
            :aria-label="t('errors_screen.fixFor', { name: row.original.name })"
            @click="openFix(row.original)"
          />
          <UButton
            v-if="canResend(row.original.error_reason)"
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-cw"
            :label="t('errors_screen.resend')"
            :aria-label="t('errors_screen.resendFor', { name: row.original.name })"
            :loading="resending === row.original.id"
            @click="resend(row.original)"
          />
        </div>
      </template>
      <template #loading>
        {{ t('state.loading') }}
      </template>
    </UTable>

    <OpsFixShifrModal
      v-model:open="modalOpen"
      :file="fixing"
      @saved="report"
    />
  </div>
</template>
