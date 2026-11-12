<script setup lang="ts">
import type { M1File } from '~/types/api'

// Подтверждение «Отправить принудительно» (handoff §5.2 retry с force): файл идёт в ЕАИС без проверки качества.
// Родитель отправляет запрос в `confirm` и закрывает окно сам.
defineProps<{ file: M1File | null, loading: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()
const { t } = useT()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('errors_screen.forceModal.title')"
    :description="file ? t('errors_screen.forceModal.description', { name: file.name }) : undefined"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p
        v-if="file?.error_reason"
        class="mb-3 flex items-start gap-1.5 rounded-md bg-error/10 p-3 text-sm text-error"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <span>{{ t('errors_screen.modal.was', { reason: file.error_reason }) }}</span>
      </p>
      <p class="text-sm text-default">
        {{ t('errors_screen.forceModal.body') }}
      </p>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('errors_screen.forceModal.cancel')"
        @click="open = false"
      />
      <UButton
        icon="i-lucide-send"
        :label="t('errors_screen.forceModal.submit')"
        :loading="loading"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
