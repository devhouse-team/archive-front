<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ReviewItem } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { formatShifr, parseShifr } from '~/utils/shifr'

definePageMeta({ roles: ACCESS.review, title: 'pages.review' })

// Handoff §6 #7, surface brief app-pages-review-vue. EDITORS work worst-first; the server already sorts that way,
// so the table keeps its order and the first row's «Открыть» is the obvious next action.
const { t } = useT()
const api = useApi()

const rows = ref<ReviewItem[]>([])
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    rows.value = await api.review.list()
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}
void load()

function shifrOf(item: ReviewItem) {
  const parts = parseShifr(item.shifr)
  return parts ? { ...parts, leaf: item.leaf } : null
}
function shifrText(item: ReviewItem) {
  const parts = shifrOf(item)
  return parts ? formatShifr(parts) : item.shifr
}
const pct = (share: number) => Math.round(share * 100)

const columns = computed<TableColumn<ReviewItem>[]>(() => [
  { id: 'rank', header: t('review.cols.rank') },
  { id: 'shifr', header: t('review.cols.shifr') },
  { id: 'title', header: t('review.cols.title') },
  { id: 'lang', header: t('review.cols.lang') },
  { id: 'conf', header: t('review.cols.conf') },
  { id: 'low', header: t('review.cols.low') },
  { id: 'action', header: () => h('span', { class: 'sr-only' }, t('review.cols.action')) },
])

const tableUi = {
  root: 'overflow-x-auto',
  thead: 'bg-elevated',
  th: 'py-2.5 text-[13px] font-semibold text-toned',
  td: 'py-3 text-sm text-default align-middle',
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px]/7 font-bold text-highlighted">
          <template v-if="!loading && !failed">
            {{ t('review.count', { count: rows.length }) }}
          </template>
          <template v-else>
            {{ t('review.title') }}
          </template>
        </h1>
        <p class="text-sm text-muted">
          {{ t('review.intro') }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :label="t('review.refresh')"
        :loading="loading"
        @click="load"
      />
    </header>

    <UAlert
      v-if="failed"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('review.error')"
      :actions="[{ label: t('review.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />

    <section
      v-else
      class="overflow-hidden rounded-lg bg-default"
    >
      <div
        v-if="loading && rows.length === 0"
        class="flex flex-col gap-3 p-4"
        aria-busy="true"
        :aria-label="t('review.loading')"
      >
        <USkeleton
          v-for="i in 5"
          :key="i"
          class="h-12 w-full"
        />
      </div>

      <div
        v-else-if="rows.length === 0"
        class="flex flex-col items-start gap-2 p-8"
      >
        <UIcon
          name="i-lucide-circle-check"
          class="size-7 text-success"
          aria-hidden="true"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          {{ t('review.empty') }}
        </h2>
        <p class="text-sm text-muted">
          {{ t('review.emptyBody') }}
        </p>
        <UButton
          to="/dela"
          color="neutral"
          variant="outline"
          :label="t('review.toDela')"
        />
      </div>

      <UTable
        v-else
        :data="rows"
        :columns="columns"
        :loading="loading"
        :ui="tableUi"
      >
        <template #rank-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.index + 1 }}</span>
        </template>
        <template #shifr-cell="{ row }">
          <ShifrPlate
            v-if="shifrOf(row.original)"
            variant="compact"
            :shifr="shifrOf(row.original)!"
            class="font-medium"
          />
          <span
            v-else
            class="text-secondary tabular-nums"
          >{{ row.original.shifr }}</span>
        </template>
        <template #title-cell="{ row }">
          <NuxtLink
            :to="`/dela/${row.original.delo_id}`"
            dir="auto"
            class="block max-w-[28rem] truncate text-muted underline-offset-4 hover:text-primary hover:underline"
          >{{ row.original.title }}</NuxtLink>
        </template>
        <template #lang-cell="{ row }">
          <DelaLangBadges :langs="row.original.lang ? [row.original.lang] : []" />
        </template>
        <template #conf-cell="{ row }">
          <DelaConfMeter
            :conf="row.original.mean_conf"
            low
          />
        </template>
        <template #low-cell="{ row }">
          <span class="tabular-nums">{{ t('review.lowShare', { pct: pct(row.original.low_share) }) }}</span>
        </template>
        <template #action-cell="{ row }">
          <UButton
            :to="{ path: `/page/${row.original.id}`, query: { mode: 'edit' } }"
            :variant="row.index === 0 ? 'solid' : 'outline'"
            :color="row.index === 0 ? 'primary' : 'neutral'"
            trailing-icon="i-lucide-arrow-right"
            :label="t('review.open')"
            :aria-label="t('review.openAria', { shifr: shifrText(row.original) })"
          />
        </template>
      </UTable>
    </section>
  </div>
</template>
