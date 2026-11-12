<script setup lang="ts">
import type { Facets, Lang } from '~/types/api'
import type { FilterKey, SearchFilterState } from '~/composables/useSearchQuery'

// Facet filters for /search (handoff §5.4). Selects and radios apply at once; number fields apply on change
// (Enter or leaving the field), so typing «1935» does not fire four searches.
const props = defineProps<{
  facets: Facets | null
  loading?: boolean
  error?: boolean
  filters: SearchFilterState
  /** Prefix for element ids: the column and the mobile slideover can both be mounted. */
  idPrefix: string
}>()

const emit = defineEmits<{
  'update:filters': [filters: SearchFilterState]
  'retry': []
}>()

const { t } = useT()
const ALL = 'all'

function set(key: FilterKey, value: string | number | null | undefined) {
  const v = value === null || value === undefined ? '' : String(value).trim()
  const next: SearchFilterState = Object.fromEntries(Object.entries(props.filters).filter(([k]) => k !== key))
  if (v && v !== ALL) next[key] = v
  emit('update:filters', next)
}

const fondItems = computed(() => [
  { label: t('search.filters.fondAll'), value: ALL },
  ...(props.facets?.fonds ?? []).map(f => ({
    label: t('search.filters.fondOption', { fond: f.fond, creator: f.creator }),
    value: String(f.fond),
  })),
])

const docTypeItems = computed(() => [
  { label: t('search.filters.docTypeAll'), value: ALL },
  ...(props.facets?.doc_types ?? []).map(d => ({ label: d, value: d })),
])

const LANG_ORDER: readonly Lang[] = ['ru', 'kk-cyrl', 'kk-latn', 'kk-arab']
const langItems = computed(() => {
  const available = props.facets?.langs ?? []
  return [
    { label: t('search.filters.langAll'), value: ALL },
    ...LANG_ORDER.filter(l => available.includes(l)).map(l => ({ label: t(`langsFull.${l}`), value: l })),
  ]
})

const yearMin = computed(() => props.facets?.years.min ?? undefined)
const yearMax = computed(() => props.facets?.years.max ?? undefined)

// Number fields keep what the user types locally and commit on change.
const draft = reactive<Record<'opis' | 'delo' | 'year_from' | 'year_to', string>>({ opis: '', delo: '', year_from: '', year_to: '' })
watch(() => props.filters, (f) => {
  draft.opis = f.opis ?? ''
  draft.delo = f.delo ?? ''
  draft.year_from = f.year_from ?? ''
  draft.year_to = f.year_to ?? ''
}, { immediate: true, deep: true })

function commit(key: 'opis' | 'delo' | 'year_from' | 'year_to') {
  const v = draft[key].replace(/\D/g, '')
  if ((props.filters[key] ?? '') !== v) set(key, v)
  else draft[key] = v
}

const hasFilters = computed(() => Object.keys(props.filters).length > 0)
const fieldUi = { label: 'text-sm font-medium text-default', container: 'mt-1' }
const radioUi = { fieldset: 'flex-col gap-0', legend: 'mb-1 text-sm font-medium text-default', label: 'text-sm font-normal text-default' }
</script>

<template>
  <div class="flex flex-col gap-5">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('search.filters.loadError')"
      :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: () => emit('retry') }]"
    />

    <template v-else-if="loading && !facets">
      <USkeleton
        v-for="i in 5"
        :key="i"
        class="h-14 w-full"
      />
    </template>

    <template v-else>
      <UFormField
        :label="t('search.filters.fond')"
        :name="`${idPrefix}-fond`"
        :ui="fieldUi"
      >
        <USelect
          :id="`${idPrefix}-fond`"
          :model-value="filters.fond ?? ALL"
          :items="fondItems"
          class="w-full"
          :ui="{ content: 'min-w-80' }"
          @update:model-value="v => set('fond', v)"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-3">
        <UFormField
          :label="t('search.filters.opis')"
          :name="`${idPrefix}-opis`"
          :ui="fieldUi"
        >
          <UInput
            :id="`${idPrefix}-opis`"
            v-model="draft.opis"
            inputmode="numeric"
            autocomplete="off"
            :placeholder="t('search.filters.numberPlaceholder')"
            class="w-full"
            :ui="{ base: 'tabular-nums' }"
            @change="commit('opis')"
            @keydown.enter.prevent="commit('opis')"
          />
        </UFormField>
        <UFormField
          :label="t('search.filters.delo')"
          :name="`${idPrefix}-delo`"
          :ui="fieldUi"
        >
          <UInput
            :id="`${idPrefix}-delo`"
            v-model="draft.delo"
            inputmode="numeric"
            autocomplete="off"
            :placeholder="t('search.filters.numberPlaceholder')"
            class="w-full"
            :ui="{ base: 'tabular-nums' }"
            @change="commit('delo')"
            @keydown.enter.prevent="commit('delo')"
          />
        </UFormField>
      </div>

      <fieldset class="flex flex-col gap-1">
        <legend class="mb-1 text-sm font-medium text-default">
          {{ t('search.filters.years') }}
        </legend>
        <div class="grid grid-cols-2 gap-3">
          <UInput
            v-model="draft.year_from"
            inputmode="numeric"
            autocomplete="off"
            :aria-label="t('search.filters.yearFromLabel')"
            :placeholder="yearMin ? String(yearMin) : t('search.filters.yearFrom')"
            class="w-full"
            :ui="{ base: 'tabular-nums' }"
            @change="commit('year_from')"
            @keydown.enter.prevent="commit('year_from')"
          >
            <template #leading>
              <span
                class="text-sm text-muted"
                aria-hidden="true"
              >{{ t('search.filters.yearFrom') }}</span>
            </template>
          </UInput>
          <UInput
            v-model="draft.year_to"
            inputmode="numeric"
            autocomplete="off"
            :aria-label="t('search.filters.yearToLabel')"
            :placeholder="yearMax ? String(yearMax) : t('search.filters.yearTo')"
            class="w-full"
            :ui="{ base: 'tabular-nums' }"
            @change="commit('year_to')"
            @keydown.enter.prevent="commit('year_to')"
          >
            <template #leading>
              <span
                class="text-sm text-muted"
                aria-hidden="true"
              >{{ t('search.filters.yearTo') }}</span>
            </template>
          </UInput>
        </div>
      </fieldset>

      <URadioGroup
        :legend="t('search.filters.lang')"
        :model-value="filters.lang ?? ALL"
        :items="langItems"
        size="lg"
        :ui="radioUi"
        @update:model-value="v => set('lang', v as string)"
      />

      <UFormField
        :label="t('search.filters.docType')"
        :name="`${idPrefix}-doc-type`"
        :ui="fieldUi"
      >
        <USelect
          :id="`${idPrefix}-doc-type`"
          :model-value="filters.doc_type ?? ALL"
          :items="docTypeItems"
          class="w-full"
          @update:model-value="v => set('doc_type', v)"
        />
      </UFormField>

      <!-- A фондообразователь arrives only from a link (?creator=); it has no field, so it gets its own clear. -->
      <div
        v-if="filters.creator"
        class="flex items-center gap-1"
      >
        <p
          class="min-w-0 flex-1 text-sm text-muted"
          dir="auto"
        >
          {{ t('search.filters.creator', { name: filters.creator }) }}
        </p>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="min-h-9 min-w-9 shrink-0 justify-center"
          :aria-label="t('search.filters.creatorClear', { name: filters.creator })"
          @click="set('creator', '')"
        />
      </div>

      <UButton
        v-if="hasFilters"
        color="neutral"
        variant="outline"
        icon="i-lucide-filter-x"
        :label="t('search.filters.reset')"
        class="self-start"
        @click="emit('update:filters', {})"
      />
    </template>
  </div>
</template>
