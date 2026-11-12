<script setup lang="ts">
import type { CollectionSummary } from '~/types/api'
import { ACCESS } from '~/utils/access'
import { formatTimestamp } from '~/utils/format'
import { isApiError } from '~/utils/api-error'
import { useCollectionsStore } from '~/stores/collections'

definePageMeta({ roles: ACCESS.collections, title: 'pages.collections' })

// Подборки (handoff §5.5, §6 #9): the user's own collections with count and last change; create; delete
// behind a confirmation that names the collection.
const { t } = useT()
const { notify } = useNotify()
const api = useApi()
const store = useCollectionsStore()

const rows = ref<CollectionSummary[] | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    rows.value = await api.request<CollectionSummary[]>('/api/collections', { errorMode: 'background' })
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}
onMounted(load)

// ---------- create ----------
const newName = ref('')
const nameError = ref(false)
const creating = ref(false)
const inputId = useId()

async function create() {
  const name = newName.value.trim()
  if (!name) {
    nameError.value = true
    return
  }
  creating.value = true
  try {
    const row = await store.create(name)
    notify(t('collections.list.created', { name: row.name }), 'success')
    newName.value = ''
    await load()
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    creating.value = false
  }
}

// ---------- delete ----------
const toDelete = ref<CollectionSummary | null>(null)
const confirmOpen = computed({
  get: () => toDelete.value !== null,
  set: (v) => {
    if (!v) toDelete.value = null
  },
})
const deleting = ref(false)

async function confirmDelete() {
  const row = toDelete.value
  if (!row) return
  deleting.value = true
  try {
    await api.collections.remove(row.id)
    store.forget(row.id)
    rows.value = (rows.value ?? []).filter(r => r.id !== row.id)
    notify(t('collections.confirm.deleted', { name: row.name }), 'success')
    toDelete.value = null
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <h1 class="sr-only">
      {{ t('pages.collections') }}
    </h1>

    <section class="flex flex-col gap-3 rounded-lg bg-default p-4 sm:p-5">
      <p class="max-w-[68ch] text-sm text-muted">
        {{ t('collections.list.intro') }}
      </p>
      <form
        class="flex flex-col gap-1"
        novalidate
        @submit.prevent="create"
      >
        <label
          :for="inputId"
          class="text-sm font-medium text-default"
        >{{ t('collections.list.createLabel') }}</label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput
            :id="inputId"
            v-model="newName"
            dir="auto"
            maxlength="200"
            :placeholder="t('collections.list.createPlaceholder')"
            :color="nameError ? 'error' : 'primary'"
            :highlight="nameError"
            :aria-invalid="nameError || undefined"
            :aria-describedby="nameError ? `${inputId}-err` : undefined"
            class="min-w-0 flex-1 sm:max-w-md"
            @update:model-value="nameError = false"
          />
          <UButton
            type="submit"
            icon="i-lucide-plus"
            :loading="creating"
            :label="t('collections.list.create')"
            class="justify-center"
          />
        </div>
        <p
          v-if="nameError"
          :id="`${inputId}-err`"
          class="text-sm text-error"
        >
          {{ t('collections.list.nameRequired') }}
        </p>
      </form>
    </section>

    <UAlert
      v-if="failed"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('collections.list.loadError')"
      :description="t('errors.genericBody')"
      :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />

    <div
      v-else-if="loading && !rows"
      class="flex flex-col gap-2 rounded-lg bg-default p-4"
      role="status"
      :aria-label="t('state.loading')"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-10 w-full"
      />
    </div>

    <section
      v-else-if="rows && rows.length === 0"
      class="flex flex-col items-start gap-3 rounded-lg bg-default p-5 sm:p-6"
    >
      <h2 class="text-lg font-semibold text-highlighted">
        {{ t('collections.list.emptyTitle') }}
      </h2>
      <p class="max-w-[68ch] text-sm text-muted">
        {{ t('collections.list.emptyBody') }}
      </p>
      <UButton
        to="/search"
        icon="i-lucide-search"
        :label="t('collections.list.toSearch')"
      />
    </section>

    <div
      v-else-if="rows"
      class="overflow-x-auto rounded-lg bg-default"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-start text-muted">
            <th
              scope="col"
              class="px-4 py-2.5 text-start font-medium"
            >
              {{ t('collections.list.name') }}
            </th>
            <th
              scope="col"
              class="px-4 py-2.5 text-end font-medium"
            >
              {{ t('collections.list.count') }}
            </th>
            <th
              scope="col"
              class="hidden px-4 py-2.5 text-start font-medium sm:table-cell"
            >
              {{ t('collections.list.updated') }}
            </th>
            <th
              scope="col"
              class="px-4 py-2.5 text-end font-medium"
            >
              <span class="sr-only">{{ t('collections.list.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="row in rows"
            :key="row.id"
          >
            <td class="px-4 py-1.5">
              <NuxtLink
                :to="`/collections/${row.id}`"
                dir="auto"
                class="inline-flex min-h-9 items-center font-medium text-primary underline-offset-4 hover:underline"
              >{{ row.name }}</NuxtLink>
            </td>
            <td class="px-4 py-1.5 text-end tabular-nums">
              {{ row.n }}
            </td>
            <td class="hidden px-4 py-1.5 text-muted tabular-nums sm:table-cell">
              {{ row.updated_at ? formatTimestamp(row.updated_at) : formatTimestamp(row.created_at) }}
            </td>
            <td class="px-2 py-1.5 text-end">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :label="t('collections.list.delete')"
                :aria-label="t('collections.list.deleteAria', { name: row.name })"
                @click="toDelete = row"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal
      v-model:open="confirmOpen"
      :title="t('collections.confirm.title')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p
          class="text-sm text-default"
          dir="auto"
        >
          {{ t('collections.confirm.body', { name: toDelete?.name ?? '' }) }}
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          :label="t('collections.confirm.cancel')"
          @click="toDelete = null"
        />
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          :loading="deleting"
          :label="t('collections.confirm.confirm')"
          @click="confirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
