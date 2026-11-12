<script setup lang="ts">
import type { DeloSnippet, Fuzzy } from '~/types/api'
import { pageLink } from '~/composables/useSearchQuery'

// «Все страницы дела» (handoff §5.4): one snippet per matching page of one case, loaded on expand.
const props = defineProps<{
  deloId: number
  q: string
  fuzzy: Fuzzy
  title: string
}>()

const { t } = useT()
const api = useApi()

const rows = ref<DeloSnippet[] | null>(null)
const loading = ref(false)
const error = ref(false)

async function load() {
  loading.value = true
  error.value = false
  try {
    rows.value = await api.request<DeloSnippet[]>(`/api/search/delo/${props.deloId}`, {
      query: { q: props.q, fuzzy: props.fuzzy },
      errorMode: 'background',
    })
  }
  catch {
    error.value = true
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
// The query or fuzzy level changed while the list was open: its snippets and pages are stale.
watch(() => [props.q, props.fuzzy], () => {
  void load()
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p
      v-if="loading"
      class="flex items-center gap-2 py-2 text-sm text-muted"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-4 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      {{ t('search.result.pagesLoading') }}
    </p>
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('search.result.pagesError')"
      :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />
    <p
      v-else-if="rows && rows.length === 0"
      class="py-2 text-sm text-muted"
    >
      {{ t('search.result.pagesEmpty') }}
    </p>
    <ol
      v-else-if="rows"
      class="flex flex-col divide-y divide-default"
      :aria-label="t('search.result.pagesTitle')"
    >
      <li
        v-for="row in rows"
        :key="row.page_id"
        class="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
      >
        <ULink
          :to="pageLink(row.page_id, q, fuzzy)"
          class="inline-flex min-h-9 items-center text-sm font-semibold text-primary tabular-nums underline-offset-4 hover:underline"
          :aria-label="t('search.result.leafAria', { leaf: row.leaf, title })"
        >
          {{ t('search.result.leaf', { leaf: row.leaf }) }}
        </ULink>
        <div class="min-w-0 pt-1.5">
          <SearchSnippet :snippet-html="row.snippet_html" />
        </div>
        <div class="col-start-2 sm:col-start-auto">
          <CollectionsAddPopover
            :page-id="row.page_id"
            :leaf="row.leaf"
            compact
          />
        </div>
      </li>
    </ol>
  </div>
</template>
