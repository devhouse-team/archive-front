<script setup lang="ts">
import type { M1File } from '~/types/api'
import type { ShifrInput } from '~/composables/useOps'
import { shifrErrors } from '~/composables/useOps'

// «Исправить шифр» (handoff §5.2 POST /api/m1/files/{id}/shifr): preview, Фонд/Опись/Дело/Лист with the live
// ЕАИС check, then save and requeue. The parent shows the toast and refreshes the list on `saved`.
const props = defineProps<{ file: M1File | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [file: M1File] }>()

const { t } = useT()
const api = useApi()

const shifr = ref<ShifrInput>({ fond: '', opis: '', delo: '', leaf: '' })
const showRequired = ref(false)
const saving = ref(false)

watch(() => [props.file, open.value] as const, ([f, isOpen]) => {
  if (!f || !isOpen) return
  const s = (v: number | null) => (v == null ? '' : String(v))
  shifr.value = { fond: s(f.fond), opis: s(f.opis), delo: s(f.delo), leaf: s(f.leaf_start) }
  showRequired.value = false
}, { immediate: true })

const invalid = computed(() => Object.keys(shifrErrors(shifr.value, true)).length > 0)

async function submit() {
  if (!props.file || saving.value) return
  if (invalid.value) {
    showRequired.value = true
    return
  }
  saving.value = true
  try {
    const leaf = shifr.value.leaf?.trim()
    const row = await api.m1.fixShifr(props.file.id, {
      fond: Number(shifr.value.fond),
      opis: Number(shifr.value.opis),
      delo: Number(shifr.value.delo),
      leaf: leaf ? Number(leaf) : null,
    })
    open.value = false
    emit('saved', row)
  }
  catch {
    // 400 detail is already a toast from the shared client; the modal stays open for a correction.
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('errors_screen.modal.title')"
    :description="file ? t('errors_screen.modal.description', { name: file.name }) : undefined"
    :ui="{ content: 'sm:max-w-3xl', footer: 'justify-end' }"
  >
    <template #body>
      <form
        v-if="file"
        id="fix-shifr-form"
        class="grid gap-6 sm:grid-cols-[240px_minmax(0,1fr)]"
        novalidate
        @submit.prevent="submit"
      >
        <OpsFilePreview
          :file-id="file.id"
          :name="file.name"
          size="lg"
        />
        <div class="flex flex-col gap-4">
          <p
            v-if="file.error_reason"
            class="flex items-start gap-1.5 rounded-md bg-error/10 p-3 text-sm text-error"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{{ t('errors_screen.modal.was', { reason: file.error_reason }) }}</span>
          </p>
          <OpsShifrFields
            v-model="shifr"
            with-leaf
            required
            :show-required="showRequired"
          />
        </div>
      </form>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('errors_screen.modal.cancel')"
        @click="open = false"
      />
      <UButton
        type="submit"
        form="fix-shifr-form"
        icon="i-lucide-send"
        :label="t('errors_screen.modal.submit')"
        :loading="saving"
      />
    </template>
  </UModal>
</template>
