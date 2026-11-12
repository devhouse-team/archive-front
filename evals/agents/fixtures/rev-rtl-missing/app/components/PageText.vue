<script setup lang="ts">
import type { Page } from '~/types/api'
const props = defineProps<{ page: Page }>()
const lines = computed(() => {
  const byLine = new Map<number, string[]>()
  for (const w of [...props.page.words].sort((a, b) => a.idx - b.idx)) {
    byLine.set(w.line, [...(byLine.get(w.line) ?? []), w.text])
  }
  return [...byLine.values()].map(ws => ws.join(' '))
})
</script>

<template>
  <!-- page.lang can be ru | kk-cyrl | kk-latn | kk-arab -->
  <div class="text-default leading-relaxed">
    <p v-for="(l, i) in lines" :key="i">{{ l }}</p>
  </div>
</template>
