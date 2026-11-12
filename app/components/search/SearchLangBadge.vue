<script setup lang="ts">
import type { Lang } from '~/types/api'

// Script badge RU / KK / KK-лат / KK-араб (handoff §1). The full name is the accessible label.
const props = defineProps<{ lang: Lang }>()
const { t } = useT()
const full = computed(() => t(`langsFull.${props.lang}`))
</script>

<template>
  <UBadge
    color="neutral"
    variant="outline"
    size="md"
    class="tabular-nums"
    :title="full"
  >
    <span aria-hidden="true">{{ t(`langs.${lang}`) }}</span>
    <span class="sr-only">{{ full }}</span>
  </UBadge>
</template>
