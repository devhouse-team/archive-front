<script setup lang="ts">
import type { CollectionDetail, CollectionExportFormat, CollectionItem } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { formatTimestamp } from '~/utils/format'
import { isApiError } from '~/utils/api-error'
import { parseShifr } from '~/utils/shifr'
import { useCollectionsStore } from '~/stores/collections'

definePageMeta({ roles: ACCESS.collections, title: 'pages.collection' })

// One подборка (handoff §5.5): its pages with шифр, title, years and a link to the page; remove an item;
// export XLSX / CSV / ZIP. A 404 (missing or someone else's) shows the shared not-found state through useApi.
const { t } = useT()
const { notify } = useNotify()
const api = useApi()
const route = useRoute()
const store = useCollectionsStore()

const id = computed(() => Number(route.params.id))
const data = ref<CollectionDetail | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load() {
  if (!Number.isInteger(id.value) || id.value <= 0) {
    usePageError().raise('notFound')
    return
  }
  loading.value = true
  failed.value = false
  try {
    data.value = await api.collections.get(id.value)
  }
  catch (e) {
    // 403/404 already replaced the screen; anything else gets the inline retry.
    if (!isApiError(e) || (e.kind !== 'notFound' && e.kind !== 'forbidden' && e.kind !== 'unauthorized')) failed.value = true
  }
  finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

const items = computed(() => data.value?.items ?? [])

// ---------- export ----------
const FORMATS: readonly CollectionExportFormat[] = ['xlsx', 'csv', 'zip']
const exporting = ref<CollectionExportFormat | null>(null)
async function exportAs(fmt: CollectionExportFormat) {
  exporting.value = fmt
  try {
    const name = await api.download(api.collections.exportUrl(id.value, fmt))
    notify(t('collections.detail.exported', { name }), 'success')
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    exporting.value = null
  }
}

// ---------- remove ----------
const removing = ref<number | null>(null)
async function remove(item: CollectionItem) {
  removing.value = item.page_id
  try {
    await api.collections.removeItem(id.value, item.page_id)
    store.forgetPage(id.value, item.page_id)
    if (data.value) data.value = { ...data.value, items: data.value.items.filter(i => i.page_id !== item.page_id) }
    notify(t('collections.detail.removed'), 'success')
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    removing.value = null
  }
}

function shifrOf(item: CollectionItem) {
  const parts = parseShifr(item.shifr)
  return parts ? { ...parts, leaf: item.leaf } : null
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
    <ULink
      to="/collections"
      class="inline-flex min-h-9 items-center gap-1.5 self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      <UIcon
        name="i-lucide-arrow-left"
        class="size-4"
        aria-hidden="true"
      />
      {{ t('collections.detail.back') }}
    </ULink>

    <UAlert
      v-if="failed"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('collections.detail.loadError')"
      :description="t('errors.genericBody')"
      :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />

    <div
      v-else-if="loading && !data"
      class="flex flex-col gap-3 rounded-lg bg-default p-5"
      role="status"
      :aria-label="t('state.loading')"
    >
      <USkeleton class="h-7 w-1/3" />
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-14 w-full"
      />
    </div>

    <template v-else-if="data">
      <header class="flex flex-col gap-3 rounded-lg bg-default p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div class="flex min-w-0 flex-col gap-1">
          <h1
            dir="auto"
            class="text-[22px]/tight font-bold text-highlighted break-words"
          >
            {{ data.name }}
          </h1>
          <p class="text-sm text-muted tabular-nums">
            {{ t('collections.detail.summary', { n: items.length, date: formatTimestamp(data.created_at) }) }}
          </p>
        </div>
        <div
          v-if="items.length"
          class="flex shrink-0 flex-col gap-1 sm:items-end"
        >
          <div
            role="group"
            :aria-label="t('collections.detail.export')"
            class="flex flex-wrap items-center gap-2"
          >
            <span
              class="text-sm text-muted"
              aria-hidden="true"
            >{{ t('collections.detail.export') }}</span>
            <UButton
              v-for="fmt in FORMATS"
              :key="fmt"
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              :loading="exporting === fmt"
              :disabled="exporting !== null && exporting !== fmt"
              :label="fmt.toUpperCase()"
              @click="exportAs(fmt)"
            />
          </div>
          <p class="text-xs text-muted">
            {{ t('collections.detail.exportHint') }}
          </p>
        </div>
      </header>

      <section
        v-if="items.length === 0"
        class="flex flex-col items-start gap-3 rounded-lg bg-default p-5 sm:p-6"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ t('collections.detail.emptyTitle') }}
        </h2>
        <p class="max-w-[68ch] text-sm text-muted">
          {{ t('collections.detail.emptyBody') }}
        </p>
        <UButton
          to="/search"
          icon="i-lucide-search"
          :label="t('collections.list.toSearch')"
        />
      </section>

      <ol
        v-else
        class="flex flex-col divide-y divide-default rounded-lg bg-default"
      >
        <li
          v-for="item in items"
          :key="item.page_id"
        >
          <article class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <ShifrPlate
                  v-if="shifrOf(item)"
                  :shifr="shifrOf(item)!"
                  variant="compact"
                  class="font-semibold"
                />
                <span
                  v-else
                  class="text-secondary tabular-nums"
                >{{ item.shifr }}</span>
                <SearchRestrictedBadge :access="item.access" />
              </div>
              <h2
                dir="auto"
                class="text-base font-semibold text-highlighted break-words"
              >
                {{ item.title }}
              </h2>
              <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <YearChip :years="item.years" />
                <ScriptBadge
                  v-if="item.lang"
                  :lang="item.lang"
                />
                <span class="tabular-nums">{{ t('collections.detail.added', { date: formatTimestamp(item.added_at) }) }}</span>
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2">
              <UButton
                :to="`/page/${item.page_id}`"
                color="neutral"
                variant="outline"
                icon="i-lucide-file-text"
                :label="t('collections.detail.open', { leaf: item.leaf })"
                :aria-label="t('collections.detail.openAria', { leaf: item.leaf, title: item.title })"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                :loading="removing === item.page_id"
                :label="t('collections.detail.remove')"
                :aria-label="t('collections.detail.removeAria', { leaf: item.leaf, title: item.title })"
                @click="remove(item)"
              />
            </div>
          </article>
        </li>
      </ol>
    </template>
  </div>
</template>
