<script setup lang="ts">
import type { PageStatus } from '~/types/api'
import { elapsedClock } from '~/composables/useViewer'

// Long recognition (handoff §8): pending/running can last a minute or two with vlm. The page polls; this shows
// honest progress with elapsed time. Failed pages offer STAFF a retry; others just learn the text isn't there.
const props = defineProps<{
  status: PageStatus
  /** Seconds since this screen started waiting. */
  elapsed: number
  canRetry: boolean
  retrying: boolean
}>()

const emit = defineEmits<{ retry: [] }>()
const { t } = useT()

const failed = computed(() => props.status === 'failed')
const title = computed(() => {
  if (failed.value) return t('viewer.running.failedTitle')
  return props.status === 'pending' ? t('viewer.running.pendingTitle') : t('viewer.running.title')
})
</script>

<template>
  <section
    class="flex flex-col items-start gap-3 rounded-lg bg-default px-6 py-8 ring-1 ring-default"
    :aria-labelledby="'viewer-recognition-title'"
  >
    <UIcon
      :name="failed ? 'i-lucide-circle-alert' : 'i-lucide-loader-circle'"
      :class="['size-7', failed ? 'text-error' : 'animate-spin text-muted motion-reduce:animate-none']"
      aria-hidden="true"
    />
    <h2
      id="viewer-recognition-title"
      class="text-lg font-semibold text-highlighted"
    >
      {{ title }}
    </h2>
    <template v-if="!failed">
      <p class="max-w-[60ch] text-sm text-muted">
        {{ t('viewer.running.body') }}
      </p>
      <UProgress
        animation="carousel"
        class="w-72 max-w-full"
        :ui="{ base: 'bg-meter-track', indicator: 'bg-meter' }"
      />
      <p
        class="text-[13px] text-muted tabular-nums"
        role="timer"
        aria-live="off"
      >
        {{ t('viewer.running.elapsed', { time: elapsedClock(elapsed) }) }}
      </p>
    </template>
    <template v-else>
      <p class="max-w-[60ch] text-sm text-muted">
        {{ canRetry ? t('viewer.running.failedBody') : t('viewer.running.failedBodyReader') }}
      </p>
      <UButton
        v-if="canRetry"
        icon="i-lucide-refresh-cw"
        :loading="retrying"
        :label="t('viewer.retry.action')"
        @click="emit('retry')"
      />
    </template>
  </section>
</template>
