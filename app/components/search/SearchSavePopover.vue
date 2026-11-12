<script setup lang="ts">
import type { SearchState } from '~/composables/useSearchQuery'
import { storedFilters } from '~/composables/useSearchQuery'
import { isApiError } from '~/utils/api-error'

// «Сохранить запрос»: names the current query with its filters (handoff §5.4 POST /api/saved-queries).
const props = defineProps<{ state: SearchState }>()

const { t } = useT()
const { notify } = useNotify()
const api = useApi()

const open = ref(false)
const name = ref('')
const nameError = ref(false)
const saving = ref(false)
const inputId = useId()

watch(open, (v) => {
  if (v) {
    name.value = props.state.q
    nameError.value = false
  }
})

async function save() {
  const n = name.value.trim()
  if (!n) {
    nameError.value = true
    return
  }
  saving.value = true
  try {
    await api.search.save({ name: n, q: props.state.q, filters: storedFilters(props.state) })
    notify(t('search.save.saved', { name: n }), 'success')
    open.value = false
  }
  catch (e) {
    if (!isApiError(e)) throw e
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
  >
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-bookmark-plus"
      :label="t('search.save.open')"
    />

    <template #content>
      <form
        class="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 p-3"
        novalidate
        @submit.prevent="save"
      >
        <label
          :for="inputId"
          class="text-sm font-semibold text-highlighted"
        >{{ t('search.save.name') }}</label>
        <UInput
          :id="inputId"
          v-model="name"
          dir="auto"
          maxlength="200"
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
          {{ t('search.save.nameRequired') }}
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('search.save.cancel')"
            @click="open = false"
          />
          <UButton
            type="submit"
            :loading="saving"
            :label="t('search.save.submit')"
          />
        </div>
      </form>
    </template>
  </UPopover>
</template>
