<script setup lang="ts">
import type { Fuzzy, SearchItem } from '~/types/api'
import { pageLink, pluralForm } from '~/composables/useSearchQuery'
import { parseShifr } from '~/utils/shifr'

// One search result = one case (handoff §5.4: results are grouped by case). Address first, then the title as
// the link to the best page, the case furniture (years, scripts, kind, hit pages), the snippet and the actions.
const props = defineProps<{
  item: SearchItem
  q: string
  fuzzy: Fuzzy
}>()

const { t } = useT()

const shifr = computed(() => parseShifr(props.item.shifr))
const bestLink = computed(() => pageLink(props.item.best_page_id, props.q, props.fuzzy))
const langs = computed(() => props.item.langs?.length ? props.item.langs : props.item.lang ? [props.item.lang] : [])
const hitPages = computed(() => t(`search.plural.hitPages.${pluralForm(props.item.hits_pages)}`, { n: props.item.hits_pages }))

const expanded = ref(false)
const panelId = useId()
const titleId = useId()
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-lg bg-default p-4 sm:p-5"
    :aria-labelledby="titleId"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <ShifrPlate
        v-if="shifr"
        :shifr="shifr"
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
      :id="titleId"
      class="-my-1.5 text-lg/snug font-semibold text-highlighted"
    >
      <NuxtLink
        :to="bestLink"
        dir="auto"
        class="inline-flex min-h-9 items-center rounded-sm underline-offset-4 decoration-1 hover:text-primary hover:underline"
      >{{ item.title }}</NuxtLink>
    </h2>

    <ul class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
      <li
        v-if="item.years"
        class="tabular-nums"
      >
        <span class="sr-only">{{ t('search.result.years', { years: item.years }) }}</span>
        <span aria-hidden="true">{{ item.years }}</span>
      </li>
      <li
        v-if="langs.length"
        class="flex flex-wrap gap-1"
      >
        <SearchLangBadge
          v-for="l in langs"
          :key="l"
          :lang="l"
        />
      </li>
      <li v-if="item.doc_type">
        {{ item.doc_type }}
      </li>
      <li class="tabular-nums">
        {{ hitPages }}
      </li>
    </ul>

    <SearchSnippet
      :snippet-html="item.snippet_html"
      ruled
    />

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        :to="bestLink"
        icon="i-lucide-file-text"
        :label="t('search.result.open', { leaf: item.leaf })"
        :aria-label="t('search.result.openAria', { leaf: item.leaf, title: item.title })"
      />
      <UButton
        v-if="item.hits_pages > 1"
        color="neutral"
        variant="ghost"
        :trailing-icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        :label="t('search.result.allPages', { n: item.hits_pages })"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      />
      <CollectionsAddPopover
        :page-id="item.best_page_id"
        :leaf="item.leaf"
      />
    </div>

    <div
      v-if="expanded"
      :id="panelId"
      class="rounded-md bg-muted px-3 sm:px-4"
    >
      <SearchDeloPages
        :delo-id="item.delo_id"
        :q="q"
        :fuzzy="fuzzy"
        :title="item.title"
      />
    </div>
  </article>
</template>
