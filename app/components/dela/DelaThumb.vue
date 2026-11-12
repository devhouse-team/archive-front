<script setup lang="ts">
import type { DeloPage } from '~/types/api'
import { delaConf } from '~/composables/useCases'
import { PAGE_STATUS, reviewStatus } from '~/utils/status'

// One leaf in the case grid: a lazy 200 px thumbnail, the leaf number, the page status (review layered on top of
// «распознано») and the mean confidence. The whole tile is one link to /page/:id.
const props = defineProps<{ page: DeloPage }>()

const { t } = useT()
const api = useApi()

const src = computed(() => api.pages.imageUrl(props.page.id, 200))
const status = computed(() => reviewStatus(props.page) ?? PAGE_STATUS[props.page.status])
const low = computed(() => props.page.low_conf === 1 && props.page.reviewed === 0)
const conf = computed(() => delaConf(props.page.mean_conf))
const broken = ref(false)

const ariaLabel = computed(() => {
  const parts = [t('dela.card.thumbAria', { leaf: props.page.leaf, status: t(status.value.label) })]
  if (conf.value !== null) parts.push(t('dela.card.thumbConf', { conf: conf.value }))
  return parts.join(', ')
})
</script>

<template>
  <NuxtLink
    :to="`/page/${page.id}`"
    :aria-label="ariaLabel"
    class="group flex flex-col overflow-hidden rounded-md bg-default ring-1 ring-default transition-shadow hover:ring-2 hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    <span
      class="relative block aspect-[1/1.414] overflow-hidden bg-scan-pane"
      aria-hidden="true"
    >
      <img
        v-if="!broken"
        :src="src"
        alt=""
        loading="lazy"
        decoding="async"
        width="200"
        height="283"
        class="size-full object-contain"
        @error="broken = true"
      >
      <UIcon
        v-else
        name="i-lucide-image-off"
        class="absolute inset-0 m-auto size-7 text-muted"
      />
      <span
        v-if="low"
        class="absolute inset-x-0 top-0 h-1 bg-warning"
      />
    </span>
    <span
      class="flex flex-col gap-1.5 border-t border-default p-2"
      aria-hidden="true"
    >
      <span class="flex items-baseline justify-between gap-2">
        <span class="font-plate text-[15px] font-semibold text-secondary tabular-nums">{{ t('dela.card.leaf', { leaf: page.leaf }) }}</span>
        <span
          v-if="conf !== null"
          class="text-[13px] tabular-nums"
          :class="low ? 'font-medium text-warning' : 'text-muted'"
        >{{ t('dela.card.conf', { conf }) }}</span>
      </span>
      <UBadge
        :color="status.color"
        variant="soft"
        size="md"
        :icon="status.icon ?? (low ? 'i-lucide-scan-eye' : undefined)"
        :label="t(status.label)"
        class="self-start"
        :ui="{ leadingIcon: status.icon ? 'animate-spin motion-reduce:animate-none' : undefined }"
      />
    </span>
  </NuxtLink>
</template>
