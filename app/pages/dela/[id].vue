<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DeloDetail, ExportFormat, OcrLang } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { DELO_POLL_MS, EXPORT_FORMATS, gapsLabel, isOcrBusy, pageLangs } from '~/composables/useCases'
import { useAuthStore } from '~/stores/auth'
import { plural } from '~/utils/format'

definePageMeta({ roles: ACCESS.dela, title: 'pages.delo' })

// Handoff §6 #5, surface brief app-pages-dela-id-vue. Everyone opens a case; only EDITORS re-run OCR.
const { t } = useT()
const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const { notify } = useNotify()

const id = computed(() => Number(route.params.id))
const delo = ref<DeloDetail | null>(null)
const loading = ref(true)
const failed = ref(false)

const canReocr = computed(() => auth.can('delaManage'))

async function load() {
  loading.value = true
  failed.value = false
  try {
    // 'page' mode: a 404 (missing or hidden case) becomes the shared not-found state, the same for both.
    delo.value = await api.dela.get(id.value)
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

// While OCR has work on this case (after a re-OCR, or a fresh upload) the card re-reads it until it settles.
// Background mode: a failed tick stays quiet and the next one tries again.
const watchingReocr = ref(false)
async function refreshWhileBusy() {
  const fresh = await api.request<DeloDetail>(`/api/dela/${id.value}`, { errorMode: 'background' })
  delo.value = fresh
  if (!isOcrBusy(fresh.pages)) {
    poll.stop()
    if (watchingReocr.value) {
      watchingReocr.value = false
      notify(t('dela.card.reocr.done', { shifr: fresh.shifr }), 'success')
    }
  }
}
// Created stopped; started only while there is OCR work. Disposed with the page (usePolling's scope).
const poll: ReturnType<typeof usePolling> = usePolling(refreshWhileBusy, DELO_POLL_MS, { immediate: false })
poll.stop()

const busy = computed(() => !!delo.value && isOcrBusy(delo.value.pages))
watch(busy, (b) => {
  if (b) poll.start()
})

watch(id, () => {
  poll.stop()
  watchingReocr.value = false
  void load()
}, { immediate: true })

const shifr = computed(() => delo.value ? { fond: delo.value.fond, opis: delo.value.opis, delo: delo.value.delo } : null)
const langs = computed(() => delo.value ? pageLangs(delo.value.pages) : [])
const gaps = computed(() => gapsLabel(delo.value?.gaps))

const counts = computed(() => {
  const pages = delo.value?.pages ?? []
  return {
    total: delo.value?.pages_total ?? 0,
    done: delo.value?.pages_done ?? 0,
    running: pages.filter(p => p.status === 'pending' || p.status === 'running').length,
    failed: delo.value?.pages_failed ?? 0,
    review: pages.filter(p => p.status === 'done' && p.low_conf === 1 && p.reviewed === 0).length,
    gaps: delo.value?.gaps.length ?? 0,
  }
})

// ---- export ----
const exporting = ref<ExportFormat | null>(null)
const canExport = computed(() => (delo.value?.pages_done ?? 0) > 0)

async function exportAs(fmt: ExportFormat) {
  if (!delo.value || exporting.value) return
  exporting.value = fmt
  try {
    const name = await api.download(api.dela.exportUrl(delo.value.id, fmt))
    notify(t('dela.card.exportDone', { name }), 'success')
  }
  catch {
    // The shared client already showed the server's detail as a toast.
  }
  finally {
    exporting.value = null
  }
}

const exportItems = computed<DropdownMenuItem[]>(() => EXPORT_FORMATS.map(fmt => ({
  label: t(`dela.card.formats.${fmt}`),
  icon: fmt === 'pdf' ? 'i-lucide-file-text' : 'i-lucide-file-code',
  onSelect: () => void exportAs(fmt),
})))

// ---- re-OCR (EDITORS) ----
const reocrOpen = ref(false)
const reocrSending = ref(false)

async function reocr(lang: OcrLang) {
  if (!delo.value || !canReocr.value || reocrSending.value) return
  reocrSending.value = true
  try {
    const res = await api.dela.reocr(delo.value.id, lang)
    reocrOpen.value = false
    notify(t('dela.card.reocr.queued', { leaves: plural('plural.leaf', res.queued) }), 'success')
    watchingReocr.value = true
    poll.start()
  }
  catch {
    // Toast from the shared client; the modal stays open so the user can retry or cancel.
  }
  finally {
    reocrSending.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-4">
    <!-- Loading -->
    <div
      v-if="loading && !delo"
      class="flex flex-col gap-4 rounded-lg bg-default p-6"
      aria-busy="true"
      :aria-label="t('state.loading')"
    >
      <USkeleton class="h-10 w-80" />
      <USkeleton class="h-7 w-2/3" />
      <USkeleton class="h-5 w-1/2" />
      <div class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 pt-4">
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="aspect-[1/1.414] w-full"
        />
      </div>
    </div>

    <!-- Error other than 403/404 (those replace the screen through the shared page error state) -->
    <UAlert
      v-else-if="failed && !delo"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('errors.generic')"
      :description="t('errors.genericBody')"
      :actions="[{ label: t('errors.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />

    <template v-else-if="delo && shifr">
      <!-- Address and identity -->
      <section
        class="flex flex-col gap-4 rounded-lg bg-default p-6"
        aria-labelledby="delo-title"
      >
        <ShifrPlate
          :shifr="shifr"
          current="delo"
        />
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1
              id="delo-title"
              dir="auto"
              class="text-[22px]/7 font-bold text-highlighted"
            >
              {{ delo.title }}
            </h1>
            <DelaRestrictedBadge :access="delo.access" />
          </div>
          <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div class="flex items-center gap-1.5">
              <dt class="text-muted">
                {{ t('dela.card.years') }}
              </dt>
              <dd class="flex">
                <YearChip
                  :years="delo.years"
                  labelled
                />
              </dd>
            </div>
            <div
              v-if="delo.fond_creator"
              class="flex gap-1.5"
            >
              <dt class="text-muted">
                {{ t('dela.card.creator') }}
              </dt>
              <dd
                dir="auto"
                class="text-default"
              >
                {{ delo.fond_creator }}
              </dd>
            </div>
            <div
              v-if="delo.doc_type"
              class="flex gap-1.5"
            >
              <dt class="text-muted">
                {{ t('dela.card.docType') }}
              </dt>
              <dd
                dir="auto"
                class="text-default"
              >
                {{ delo.doc_type }}
              </dd>
            </div>
            <div class="flex items-center gap-1.5">
              <dt class="text-muted">
                {{ t('dela.cols.langs') }}
              </dt>
              <dd>
                <DelaLangBadges :langs="langs" />
              </dd>
            </div>
          </dl>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-2 border-t border-default pt-4">
          <UDropdownMenu
            :items="exportItems"
            :disabled="!canExport"
          >
            <!-- Same treatment as the viewer's Экспорт: a secondary action, neutral outline. -->
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              trailing-icon="i-lucide-chevron-down"
              :label="t('dela.card.export')"
              :aria-label="t('dela.card.exportAria')"
              :disabled="!canExport"
              :loading="exporting !== null"
              :aria-describedby="canExport ? undefined : 'export-disabled-reason'"
            />
          </UDropdownMenu>
          <UButton
            v-if="delo.eais_case_id !== null"
            :to="api.eais.caseUrl(delo.eais_case_id)"
            target="_blank"
            external
            color="neutral"
            variant="outline"
            icon="i-lucide-external-link"
            :label="t('dela.card.eaisCard')"
            :title="t('dela.card.eaisCardHint')"
          />
          <UButton
            v-if="canReocr"
            class="ms-auto"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :label="t('dela.card.reocr.open')"
            :disabled="busy || delo.pages.length === 0"
            @click="reocrOpen = true"
          />
          <p
            v-if="!canExport"
            id="export-disabled-reason"
            class="basis-full text-sm text-muted"
          >
            {{ t('dela.card.exportDisabled') }}
          </p>
        </div>
      </section>

      <!-- Progress while OCR runs -->
      <UAlert
        v-if="busy"
        color="info"
        variant="soft"
        icon="i-lucide-loader-circle"
        role="status"
        :ui="{ icon: 'animate-spin motion-reduce:animate-none' }"
        :title="t('dela.card.busy', { done: counts.done, total: counts.total })"
      />

      <!-- Leaves -->
      <section
        class="flex flex-col gap-4 rounded-lg bg-default p-6"
        aria-labelledby="delo-leaves"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2
            id="delo-leaves"
            class="text-lg font-semibold text-highlighted"
          >
            {{ t('dela.card.leaves') }}
          </h2>
          <dl
            class="flex flex-wrap gap-x-5 gap-y-1 text-sm"
            :aria-label="t('dela.card.stats.label')"
          >
            <div class="flex gap-1.5">
              <dt class="text-muted">
                {{ t('dela.card.stats.total') }}
              </dt>
              <dd class="font-medium tabular-nums">
                {{ counts.total }}
              </dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-muted">
                {{ t('dela.card.stats.done') }}
              </dt>
              <dd class="font-medium tabular-nums">
                {{ counts.done }}
              </dd>
            </div>
            <div
              v-if="counts.running"
              class="flex gap-1.5"
            >
              <dt class="text-muted">
                {{ t('dela.card.stats.running') }}
              </dt>
              <dd class="font-medium tabular-nums">
                {{ counts.running }}
              </dd>
            </div>
            <div
              v-if="counts.failed"
              class="flex gap-1.5 text-error"
            >
              <dt>{{ t('dela.card.stats.failed') }}</dt>
              <dd class="font-medium tabular-nums">
                {{ counts.failed }}
              </dd>
            </div>
            <div
              v-if="counts.review"
              class="flex gap-1.5 text-warning"
            >
              <dt>{{ t('dela.card.stats.review') }}</dt>
              <dd class="font-medium tabular-nums">
                {{ counts.review }}
              </dd>
            </div>
            <div
              v-if="counts.gaps"
              class="flex gap-1.5 text-warning"
            >
              <dt>{{ t('dela.card.stats.gaps') }}</dt>
              <dd class="font-medium tabular-nums">
                {{ counts.gaps }}
              </dd>
            </div>
          </dl>
        </div>
        <p
          v-if="gaps"
          class="flex items-center gap-1.5 text-sm text-warning"
        >
          <UIcon
            name="i-lucide-file-x"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <span class="tabular-nums">{{ gaps }}.</span>
          <span class="text-muted">{{ t('dela.card.leavesHint') }}</span>
        </p>

        <div
          v-if="delo.pages.length === 0 && delo.gaps.length === 0"
          class="flex flex-col items-start gap-1 py-6"
        >
          <p class="font-medium text-highlighted">
            {{ t('dela.card.noPages') }}
          </p>
          <p class="text-sm text-muted">
            {{ t('dela.card.noPagesBody') }}
          </p>
        </div>
        <DelaThumbGrid
          v-else
          :pages="delo.pages"
          :gaps="delo.gaps"
        />
      </section>

      <DelaReocrModal
        v-if="canReocr"
        v-model:open="reocrOpen"
        :shifr="delo.shifr"
        :pages-total="delo.pages_total"
        :busy="reocrSending"
        @confirm="reocr"
      />
    </template>
  </div>
</template>
