<script setup lang="ts">
import { useCollectionsStore } from '~/stores/collections'
import { isApiError } from '~/utils/api-error'

// «В подборку» (handoff §5.5): a popover listing the user's подборки plus «Новая подборка».
// Adding is idempotent; a page known to be in a подборка shows «уже добавлен» and is not posted again.
const props = defineProps<{
  pageId: number
  leaf: number
  /** Smaller trigger for the per-page rows under «Все страницы дела». */
  compact?: boolean
}>()

const { t } = useT()
const { notify } = useNotify()
const store = useCollectionsStore()

const open = ref(false)
const busyId = ref<number | null>(null)
const newName = ref('')
const creating = ref(false)
const nameError = ref(false)

watch(open, (v) => {
  // Always ask the server: another tab or the collection screen may have changed the counts.
  if (v) void store.load(true)
  else {
    newName.value = ''
    nameError.value = false
  }
})

async function add(id: number, name: string) {
  if (busyId.value !== null) return
  busyId.value = id
  try {
    const result = await store.addPage(id, props.pageId)
    notify(t(result === 'added' ? 'collections.add.added' : 'collections.add.alreadyIn', { name }), result === 'added' ? 'success' : 'info')
    open.value = false
  }
  catch (e) {
    // useApi already toasted the server's detail.
    if (!isApiError(e)) throw e
  }
  finally {
    busyId.value = null
  }
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name) {
    nameError.value = true
    return
  }
  creating.value = true
  try {
    const row = await store.create(name)
    await add(row.id, row.name)
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    creating.value = false
  }
}

const inputId = useId()
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start', side: 'bottom', sideOffset: 6 }"
  >
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-folder-plus"
      :size="compact ? 'md' : 'lg'"
      :class="compact ? 'min-h-9' : undefined"
      :label="t('collections.add.open')"
      :aria-label="t('collections.add.openAria', { leaf })"
    />

    <template #content>
      <div class="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 p-3">
        <p class="text-sm font-semibold text-highlighted">
          {{ t('collections.add.title') }}
        </p>

        <p
          v-if="store.loading && !store.loaded"
          class="text-sm text-muted"
          role="status"
        >
          {{ t('collections.add.loading') }}
        </p>
        <UAlert
          v-else-if="store.error"
          color="error"
          variant="soft"
          :title="t('collections.add.error')"
          :actions="[{ label: t('search.retry'), color: 'error', variant: 'outline', onClick: () => store.load(true) }]"
        />
        <p
          v-else-if="store.list.length === 0"
          class="text-sm text-muted"
        >
          {{ t('collections.add.none') }}
        </p>
        <ul
          v-else
          class="-mx-1 flex max-h-64 flex-col overflow-y-auto"
        >
          <li
            v-for="c in store.list"
            :key="c.id"
          >
            <UButton
              block
              color="neutral"
              variant="ghost"
              class="justify-between text-start"
              :loading="busyId === c.id"
              :disabled="store.has(c.id, pageId)"
              :trailing-icon="store.has(c.id, pageId) ? 'i-lucide-check' : undefined"
              @click="add(c.id, c.name)"
            >
              <span
                dir="auto"
                class="min-w-0 flex-1 truncate"
              >{{ c.name }}</span>
              <span class="shrink-0 text-xs text-muted tabular-nums">
                {{ store.has(c.id, pageId) ? t('collections.add.already') : t('collections.add.count', { n: c.n }) }}
              </span>
            </UButton>
          </li>
        </ul>

        <USeparator />

        <form
          class="flex flex-col gap-2"
          novalidate
          @submit.prevent="createAndAdd"
        >
          <label
            :for="inputId"
            class="text-sm font-medium text-default"
          >{{ t('collections.add.newName') }}</label>
          <UInput
            :id="inputId"
            v-model="newName"
            dir="auto"
            maxlength="200"
            :placeholder="t('collections.add.newPlaceholder')"
            :color="nameError ? 'error' : 'primary'"
            :highlight="nameError"
            :aria-invalid="nameError || undefined"
            :aria-describedby="nameError ? `${inputId}-err` : undefined"
            @update:model-value="nameError = false"
          />
          <p
            v-if="nameError"
            :id="`${inputId}-err`"
            class="text-sm text-error"
          >
            {{ t('collections.list.nameRequired') }}
          </p>
          <UButton
            type="submit"
            icon="i-lucide-plus"
            :loading="creating"
            :label="t('collections.add.create')"
            class="self-start"
          />
        </form>
      </div>
    </template>
  </UPopover>
</template>
