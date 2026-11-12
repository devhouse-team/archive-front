<script setup lang="ts">
import type { SearchItem } from '~/types/api'
defineProps<{ item: SearchItem }>()
</script>

<template>
  <UCard>
    <h3 class="text-highlighted font-medium" v-html="item.title" />
    <p class="text-muted" dir="auto" v-html="item.snippet_html" />
    <span class="text-dimmed">{{ item.shifr }}</span>
  </UCard>
</template>
