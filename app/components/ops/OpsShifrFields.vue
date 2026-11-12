<script setup lang="ts">
import type { CaseCheckState, ShifrField, ShifrFieldErrors, ShifrInput } from '~/composables/useOps'
import { shifrErrors, useCaseCheck } from '~/composables/useOps'

// Фонд / Опись / Дело (/ Лист) inputs, digits only, with the live ЕАИС case check under them.
// Used by the upload form (optional шифр) and the «Исправить шифр» modal (required шифр).
const props = withDefaults(defineProps<{
  withLeaf?: boolean
  /** fond/opis/delo must be filled. */
  required?: boolean
  /** Show "required" errors (after a submit attempt). Digit errors show while typing. */
  showRequired?: boolean
}>(), { withLeaf: false, required: false, showRequired: false })

const model = defineModel<ShifrInput>({ required: true })
// The parent (the upload form) asks before sending to a case ЕАИС does not know.
const emit = defineEmits<{ check: [state: CaseCheckState] }>()
const { t } = useT()

const errors = computed<ShifrFieldErrors>(() => shifrErrors(model.value, props.required))
const { result: check } = useCaseCheck(model)
watch(check, c => emit('check', c), { immediate: true })

const fields = computed(() => {
  const list: { id: ShifrField, label: string }[] = [
    { id: 'fond', label: t('upload.fond') },
    { id: 'opis', label: t('upload.opis') },
    { id: 'delo', label: t('upload.delo') },
  ]
  if (props.withLeaf) list.push({ id: 'leaf', label: t('upload.leaf') })
  return list
})

function errorFor(id: ShifrField): string | undefined {
  const e = errors.value[id]
  if (e === 'digits') return t('upload.digitsOnly')
  if (e === 'required' && props.showRequired) return props.required ? t('upload.required') : t('upload.shifrIncomplete')
  return undefined
}

function update(id: ShifrField, value: string | number) {
  model.value = { ...model.value, [id]: String(value ?? '') }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      class="grid gap-3"
      :class="withLeaf ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'"
    >
      <UFormField
        v-for="f in fields"
        :key="f.id"
        :label="f.label"
        :error="errorFor(f.id)"
        :name="f.id"
        :required="required && f.id !== 'leaf'"
        :ui="{ error: 'text-xs' }"
      >
        <UInput
          :model-value="model[f.id] ?? ''"
          inputmode="numeric"
          autocomplete="off"
          maxlength="9"
          class="w-full"
          :ui="{ base: 'tabular-nums' }"
          @update:model-value="update(f.id, $event)"
        />
      </UFormField>
    </div>
    <OpsCaseCheck :check="check" />
  </div>
</template>
