<script setup lang="ts">
import type { OcrLang } from '~/types/api'
import { REOCR_LANGS } from '~/composables/useCases'
import { plural } from '~/utils/format'

// Re-OCR a whole case (handoff §5.3 POST /api/dela/{id}/ocr). Destructive: it overwrites manual corrections, so
// the modal says so in plain words and the confirm button is in the error colour. «Отмена» is the safe default.
defineProps<{
  shifr: string
  pagesTotal: number
  busy?: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [lang: OcrLang] }>()

const { t } = useT()
const lang = ref<OcrLang>('auto')

watch(open, (isOpen) => {
  if (isOpen) lang.value = 'auto'
})

// «Отмена» is the safe default: focus it when the dialog opens (Reka would otherwise focus the close button).
const cancelButton = useTemplateRef<{ $el?: HTMLElement }>('cancelButton')
const focusCancel = {
  onOpenAutoFocus: (e: Event) => {
    const el = cancelButton.value?.$el
    if (el instanceof HTMLElement) {
      e.preventDefault()
      el.focus()
    }
  },
}

const items = computed(() => REOCR_LANGS.map(value => ({ value, label: t(`langsFull.${value}`) })))
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('dela.card.reocr.title')"
    :description="t('dela.card.reocr.description', { shifr, leaves: plural('plural.leaf', pagesTotal) })"
    :ui="{ content: 'sm:max-w-lg', footer: 'justify-end' }"
    :content="focusCancel"
  >
    <template #body>
      <form
        id="reocr-form"
        class="flex flex-col gap-5"
        @submit.prevent="emit('confirm', lang)"
      >
        <URadioGroup
          v-model="lang"
          :legend="t('dela.card.reocr.lang')"
          :items="items"
        />
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="t('dela.card.reocr.warningTitle')"
          :description="t('dela.card.reocr.warningBody')"
        />
      </form>
    </template>
    <template #footer>
      <UButton
        ref="cancelButton"
        color="neutral"
        variant="outline"
        :label="t('dela.card.reocr.cancel')"
        @click="open = false"
      />
      <UButton
        type="submit"
        form="reocr-form"
        color="error"
        icon="i-lucide-refresh-cw"
        :loading="busy"
        :label="t('dela.card.reocr.confirm')"
      />
    </template>
  </UModal>
</template>
