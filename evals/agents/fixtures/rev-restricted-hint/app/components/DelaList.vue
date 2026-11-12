<script setup lang="ts">
import type { DeloSummary } from '~/types/api'
const props = defineProps<{ items: DeloSummary[], totalInFond: number }>()
const hiddenCount = computed(() => props.totalInFond - props.items.length)
const { t } = useT()
</script>

<template>
  <div>
    <UTable :data="items" />
    <UAlert v-if="hiddenCount > 0" color="neutral" :title="t('dela.hiddenNotice', { n: hiddenCount })" />
  </div>
</template>
