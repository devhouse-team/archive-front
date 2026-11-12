<script setup lang="ts">
import type { OcrLang } from '~/types/api'
import { REOCR_LANGS } from '~/composables/useCases'

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

const items = computed(() => REOCR_LANGS.map(value => ({ value, label: t(`langsFull.${value}`) })))
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('dela.card.reocr.title')"
    :description="t('dela.card.reocr.description', { shifr, count: pagesTotal })"
    :ui="{ content: 'sm:max-w-lg', footer: 'justify-end' }"
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
        color="neutral"
        variant="outline"
        :label="t('dela.card.reocr.cancel')"
        autofocus
        @click="open = false"
      />
      <UButton
        type="submit"
        form="reocr-form"
        color="error"
        icon="i-lucide-refresh-ccw"
        :loading="busy"
        :label="t('dela.card.reocr.confirm')"
      />
    </template>
  </UModal>
</template>
