<script setup lang="ts">
import type { CreatedCase } from '~/types/api'
import { isDigits } from '~/composables/useOps'
import { isApiError } from '~/utils/api-error'

// «Новое дело» (handoff §5.2 POST /api/m1/cases, EDITORS only; the caller renders this only for editors).
// Фонд and опись come prefilled from the picker, дело with the next free number. 201 → `created`;
// 409 «Такой шифр уже есть в ЕАИС» → offers «Выбрать это дело» (`pick`); 400 / 503 → the server's detail inline.
const props = defineProps<{
  fond: string
  opis: string
  /** Suggested дело number (the next free one in the selected опись), or null. */
  suggestedDelo: number | null
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  created: [c: CreatedCase]
  pick: [shifr: { fond: string, opis: string, delo: string }]
}>()

const { t } = useT()
const api = useApi()

const form = ref({ fond: '', opis: '', delo: '', title: '', yearFrom: '', yearTo: '' })
const showErrors = ref(false)
const saving = ref(false)
/** 409: the шифр that already exists. Editing any шифр field clears it. */
const exists = ref<{ fond: string, opis: string, delo: string, detail: string } | null>(null)
const serverError = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  form.value = {
    fond: props.fond.trim(),
    opis: props.opis.trim(),
    delo: props.suggestedDelo ? String(props.suggestedDelo) : '',
    title: '',
    yearFrom: '',
    yearTo: '',
  }
  showErrors.value = false
  exists.value = null
  serverError.value = null
}, { immediate: true })

watch(() => [form.value.fond, form.value.opis, form.value.delo], () => {
  exists.value = null
})

type Field = keyof typeof form.value
const errors = computed(() => {
  const out: Partial<Record<Field, string>> = {}
  const f = form.value
  for (const k of ['fond', 'opis', 'delo'] as const) {
    const v = f[k].trim()
    if (!v) out[k] = t('upload.required')
    else if (!isDigits(v) || Number(v) < 1) out[k] = t('upload.digitsOnly')
  }
  if (!f.title.trim()) out.title = t('upload.required')
  for (const k of ['yearFrom', 'yearTo'] as const) {
    const v = f[k].trim()
    if (v && !/^\d{4}$/.test(v)) out[k] = t('upload.newCase.yearDigits')
  }
  if (!out.yearFrom && !out.yearTo && f.yearFrom.trim() && f.yearTo.trim() && Number(f.yearTo) < Number(f.yearFrom)) {
    out.yearTo = t('upload.newCase.yearOrder')
  }
  return out
})
const errorFor = (k: Field) => {
  const e = errors.value[k]
  // Digit and year-format errors show while typing; "required" waits for a submit attempt.
  if (!e) return undefined
  return showErrors.value || e !== t('upload.required') ? e : undefined
}

async function submit() {
  if (saving.value) return
  if (exists.value) return pickExisting()
  if (Object.keys(errors.value).length) {
    showErrors.value = true
    return
  }
  saving.value = true
  serverError.value = null
  const f = form.value
  const year = (v: string) => (v.trim() ? Number(v.trim()) : null)
  try {
    const created = await api.m1.createCase({
      fond: Number(f.fond),
      opis: Number(f.opis),
      delo: Number(f.delo),
      title: f.title.trim(),
      year_from: year(f.yearFrom),
      year_to: year(f.yearTo),
    })
    open.value = false
    emit('created', created)
  }
  catch (e) {
    if (isApiError(e) && e.status === 409) {
      exists.value = { fond: f.fond.trim(), opis: f.opis.trim(), delo: f.delo.trim(), detail: e.message }
    }
    else if (!(isApiError(e) && e.kind === 'unauthorized')) {
      serverError.value = isApiError(e) ? e.message : t('errors.network')
    }
  }
  finally {
    saving.value = false
  }
}

function pickExisting() {
  if (!exists.value) return
  const { fond, opis, delo } = exists.value
  open.value = false
  emit('pick', { fond, opis, delo })
}

const numberInput = { inputmode: 'numeric', autocomplete: 'off', maxlength: 9 } as const
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('upload.newCase.title')"
    :description="t('upload.newCase.description')"
    :ui="{ content: 'sm:max-w-xl', footer: 'justify-end' }"
  >
    <template #body>
      <form
        id="new-case-form"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="submit"
      >
        <div class="grid grid-cols-3 gap-3">
          <UFormField
            :label="t('upload.newCase.fond')"
            name="fond"
            required
            :error="errorFor('fond')"
            :ui="{ error: 'text-xs' }"
          >
            <UInput
              v-model="form.fond"
              v-bind="numberInput"
              class="w-full"
              :ui="{ base: 'tabular-nums' }"
            />
          </UFormField>
          <UFormField
            :label="t('upload.newCase.opis')"
            name="opis"
            required
            :error="errorFor('opis')"
            :ui="{ error: 'text-xs' }"
          >
            <UInput
              v-model="form.opis"
              v-bind="numberInput"
              class="w-full"
              :ui="{ base: 'tabular-nums' }"
            />
          </UFormField>
          <UFormField
            :label="t('upload.newCase.delo')"
            name="delo"
            required
            :error="errorFor('delo')"
            :ui="{ error: 'text-xs' }"
          >
            <UInput
              v-model="form.delo"
              v-bind="numberInput"
              class="w-full"
              :ui="{ base: 'tabular-nums' }"
            />
          </UFormField>
        </div>

        <UFormField
          :label="t('upload.newCase.caseTitle')"
          :description="t('upload.newCase.caseTitleHint')"
          name="title"
          required
          :error="errorFor('title')"
          :ui="{ error: 'text-xs' }"
        >
          <UInput
            v-model="form.title"
            autocomplete="off"
            maxlength="300"
            dir="auto"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="t('upload.newCase.yearFrom')"
            :hint="t('upload.newCase.optional')"
            name="yearFrom"
            :error="errorFor('yearFrom')"
            :ui="{ error: 'text-xs' }"
          >
            <UInput
              v-model="form.yearFrom"
              inputmode="numeric"
              autocomplete="off"
              maxlength="4"
              class="w-full"
              :ui="{ base: 'tabular-nums' }"
            />
          </UFormField>
          <UFormField
            :label="t('upload.newCase.yearTo')"
            :hint="t('upload.newCase.optional')"
            name="yearTo"
            :error="errorFor('yearTo')"
            :ui="{ error: 'text-xs' }"
          >
            <UInput
              v-model="form.yearTo"
              inputmode="numeric"
              autocomplete="off"
              maxlength="4"
              class="w-full"
              :ui="{ base: 'tabular-nums' }"
            />
          </UFormField>
        </div>

        <div
          role="status"
          class="empty:hidden"
        >
          <UAlert
            v-if="exists"
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            :title="exists.detail"
            :description="t('upload.newCase.exists', { fond: exists.fond, opis: exists.opis, delo: exists.delo })"
            data-testid="new-case-exists"
          />
          <UAlert
            v-else-if="serverError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="serverError"
          />
        </div>
      </form>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('upload.newCase.cancel')"
        @click="open = false"
      />
      <UButton
        v-if="exists"
        icon="i-lucide-check"
        :label="t('upload.newCase.pickExisting')"
        data-testid="new-case-pick"
        @click="pickExisting"
      />
      <UButton
        v-else
        type="submit"
        form="new-case-form"
        icon="i-lucide-plus"
        :label="t('upload.newCase.submit')"
        :loading="saving"
      />
    </template>
  </UModal>
</template>
