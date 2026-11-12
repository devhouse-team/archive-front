<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { DeloSummary, Facets } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { deloLangs, gapsLabel } from '~/composables/useCases'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ roles: ACCESS.dela, title: 'pages.dela' })

// Handoff §6 #5, surface brief app-pages-dela-index-vue. Search by шифр or title and a fond filter, both kept
// in the URL so «Назад» from a case returns to the same list.
const { t } = useT()
const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const fondParam = Number(route.query.fond)
const fond = ref<number | undefined>(Number.isInteger(fondParam) && fondParam > 0 ? fondParam : undefined)

const rows = ref<DeloSummary[]>([])
const loading = ref(true)
const failed = ref(false)
const facets = ref<Facets | null>(null)

const filtered = computed(() => q.value.trim() !== '' || fond.value !== undefined)
const showAccess = computed(() => auth.can('restricted'))

/** USelect needs a non-empty value for «Все фонды»; 0 is never a real fond number. */
const ALL = 0
const fondModel = computed<number>({
  get: () => fond.value ?? ALL,
  set: (v) => {
    fond.value = v === ALL ? undefined : v
  },
})
const fondItems = computed(() => [
  { label: t('dela.fondAll'), value: ALL },
  ...(facets.value?.fonds ?? []).map(f => ({
    label: t('dela.fondOption', { fond: f.fond, creator: f.creator }),
    value: f.fond,
  })),
])

// /api/dela carries `langs` per case; an older backend without it falls back to `lang_override`, then «—».
const langsOf = deloLangs

let seq = 0
async function load() {
  const mine = ++seq
  loading.value = true
  failed.value = false
  try {
    const data = await api.dela.list({ q: q.value.trim() || undefined, fond: fond.value })
    if (mine !== seq) return
    rows.value = data
  }
  catch {
    if (mine !== seq) return
    failed.value = true
  }
  finally {
    if (mine === seq) loading.value = false
  }
}

async function loadFacets() {
  try {
    facets.value = await api.search.facets()
  }
  catch {
    // The filter falls back to «Все фонды»; the list itself still works.
  }
}

let debounce: ReturnType<typeof setTimeout> | null = null
watch([q, fond], () => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    void router.replace({ query: { ...route.query, q: q.value.trim() || undefined, fond: fond.value } })
    void load()
  }, 300)
})
onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce)
})

function reset() {
  q.value = ''
  fond.value = undefined
}

void load()
void loadFacets()

const columns = computed<TableColumn<DeloSummary>[]>(() => [
  { id: 'shifr', header: t('dela.cols.shifr') },
  { id: 'title', header: t('dela.cols.title') },
  { id: 'years', header: t('dela.cols.years') },
  { id: 'langs', header: t('dela.cols.langs') },
  { id: 'pages', header: t('dela.cols.pages') },
  { id: 'gaps', header: t('dela.cols.gaps') },
  { id: 'lowConf', header: t('dela.cols.lowConf') },
  ...(showAccess.value ? [{ id: 'access', header: t('dela.cols.access') }] : []),
])

// The title link is the keyboard path; a click anywhere else on the row opens the case too.
function onRowClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('a, button, input, [role="button"]')) return
  const tr = target.closest('tbody > tr')
  if (!tr?.parentElement) return
  const index = Array.prototype.indexOf.call(tr.parentElement.children, tr)
  const row = rows.value[index]
  if (row) void navigateTo(`/dela/${row.id}`)
}

const tableUi = {
  root: 'overflow-x-auto',
  thead: 'bg-elevated',
  th: 'py-2.5 text-[13px] font-semibold text-toned',
  td: 'py-3 text-sm text-default align-top',
  tbody: '[&>tr]:cursor-pointer [&>tr]:hover:bg-elevated/40',
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-4">
    <h1 class="sr-only">
      {{ t('dela.title') }}
    </h1>

    <section
      class="flex flex-wrap items-end gap-3 rounded-lg bg-default p-4"
      :aria-label="t('dela.toolbar')"
    >
      <UFormField
        :label="t('dela.q')"
        class="min-w-[18rem] flex-1"
      >
        <UInput
          v-model="q"
          type="search"
          icon="i-lucide-search"
          :placeholder="t('dela.qPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('dela.fond')"
        class="w-full sm:w-80"
      >
        <USelect
          v-model="fondModel"
          :items="fondItems"
          class="w-full"
        />
      </UFormField>
      <UButton
        v-if="filtered"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        :label="t('dela.reset')"
        @click="reset"
      />
    </section>

    <!-- The one row-count line style (Stage 9): muted, small, tabular, top-left above the list. -->
    <p
      class="min-h-5 text-sm text-muted tabular-nums"
      role="status"
    >
      <template v-if="!loading && !failed">
        {{ t('dela.count', { count: rows.length }) }}
      </template>
    </p>

    <UAlert
      v-if="failed"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('dela.error')"
      :actions="[{ label: t('dela.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />

    <section
      v-else
      class="overflow-hidden rounded-lg bg-default"
    >
      <div
        v-if="loading && rows.length === 0"
        class="flex flex-col gap-3 p-4"
        :aria-label="t('dela.loading')"
        aria-busy="true"
      >
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="h-12 w-full"
        />
      </div>

      <div
        v-else-if="rows.length === 0"
        class="flex flex-col items-start gap-2 p-8"
      >
        <UIcon
          :name="filtered ? 'i-lucide-search-x' : 'i-lucide-folder-open'"
          class="size-7 text-muted"
          aria-hidden="true"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          {{ filtered ? t('dela.emptyFiltered') : t('dela.empty') }}
        </h2>
        <p class="text-sm text-muted">
          {{ filtered ? t('dela.emptyFilteredBody') : t('dela.emptyBody') }}
        </p>
        <UButton
          v-if="filtered"
          color="neutral"
          variant="outline"
          :label="t('dela.reset')"
          @click="reset"
        />
      </div>

      <!-- Mouse shortcut only: the title link in each row is the keyboard path to the same case. -->
      <div
        v-else
        @click="onRowClick"
      >
        <UTable
          :data="rows"
          :columns="columns"
          :loading="loading"
          :ui="tableUi"
        >
          <template #shifr-cell="{ row }">
            <ShifrPlate
              variant="compact"
              :shifr="row.original"
              class="font-medium"
            />
          </template>
          <template #title-cell="{ row }">
            <div class="flex min-w-[16rem] max-w-[32rem] flex-col gap-0.5 whitespace-normal">
              <NuxtLink
                :to="`/dela/${row.original.id}`"
                dir="auto"
                class="-my-2 self-start py-2 font-medium text-highlighted underline-offset-4 hover:text-primary hover:underline"
              >{{ row.original.title }}</NuxtLink>
              <span
                dir="auto"
                class="text-[13px] text-muted"
              >{{ row.original.fond_creator }}</span>
            </div>
          </template>
          <template #years-cell="{ row }">
            <YearChip
              :years="row.original.years"
              labelled
            />
          </template>
          <template #langs-cell="{ row }">
            <DelaLangBadges :langs="langsOf(row.original)" />
          </template>
          <template #pages-cell="{ row }">
            <span
              class="tabular-nums"
              :aria-label="t('dela.pagesAria', { done: row.original.pages_done, total: row.original.pages_total })"
            >{{ t('dela.pagesDone', { done: row.original.pages_done, total: row.original.pages_total }) }}</span>
            <span
              v-if="row.original.pages_failed > 0"
              class="ms-2"
            >
              <UBadge
                color="error"
                variant="soft"
                size="md"
                icon="i-lucide-circle-alert"
                :label="String(row.original.pages_failed)"
                :aria-label="t('dela.card.stats.failed') + ': ' + row.original.pages_failed"
              />
            </span>
          </template>
          <template #gaps-cell="{ row }">
            <span
              v-if="gapsLabel(row.original.gaps)"
              class="inline-flex items-center gap-1.5 text-warning"
            >
              <UIcon
                name="i-lucide-file-x"
                class="size-4 shrink-0"
                aria-hidden="true"
              />
              <span class="tabular-nums">{{ gapsLabel(row.original.gaps) }}</span>
            </span>
            <span
              v-else
              class="text-dimmed"
            >{{ t('dela.gapsNone') }}</span>
          </template>
          <template #lowConf-cell="{ row }">
            <UBadge
              v-if="row.original.low_conf > 0"
              color="warning"
              variant="soft"
              size="md"
              icon="i-lucide-scan-eye"
              class="tabular-nums"
              :label="String(row.original.low_conf)"
              :aria-label="t('dela.lowConfAria', { count: row.original.low_conf })"
            />
            <span
              v-else
              class="text-dimmed tabular-nums"
            >0</span>
          </template>
          <template #access-cell="{ row }">
            <DelaRestrictedBadge :access="row.original.access" />
          </template>
        </UTable>
      </div>
    </section>
  </div>
</template>
