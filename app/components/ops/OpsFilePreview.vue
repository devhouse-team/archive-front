<script setup lang="ts">
// Preview of an M1 file through GET /api/m1/files/{id}/preview (PNG ≤400 px). 404/415 or any load failure
// shows the «Превью недоступно» placeholder. The image URL is the API route, never a server path.
const props = withDefaults(defineProps<{
  fileId: number
  name: string
  size?: 'sm' | 'lg'
}>(), { size: 'sm' })

const { t } = useT()
const api = useApi()
const failed = ref(false)
watch(() => props.fileId, () => {
  failed.value = false
})

const box = computed(() => props.size === 'lg' ? 'w-full max-w-[400px] aspect-[3/4]' : 'w-20 h-24')
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-scan-pane"
    :class="box"
  >
    <img
      v-if="!failed"
      :src="api.m1.previewUrl(fileId)"
      :alt="t('errors_screen.previewAlt', { name })"
      loading="lazy"
      decoding="async"
      class="size-full object-contain"
      @error="failed = true"
    >
    <span
      v-else
      lang="ru"
      class="flex w-full min-w-0 flex-col items-center gap-1 whitespace-normal text-center text-muted"
      :class="size === 'lg' ? 'p-3 text-sm' : 'px-1 text-xs leading-tight'"
    >
      <UIcon
        name="i-lucide-image-off"
        :class="size === 'lg' ? 'size-8' : 'size-4'"
        aria-hidden="true"
      />
      <!-- The small box is 80 px wide: the two words stack and long words may hyphenate, never clip. -->
      <span class="w-full min-w-0 whitespace-normal break-words hyphens-auto">{{ t('errors_screen.previewUnavailable') }}</span>
    </span>
  </div>
</template>
