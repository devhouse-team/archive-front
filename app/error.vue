<script setup lang="ts">
import type { NuxtError } from '#app'
import { ru } from '@nuxt/ui/locale'

// Fallback for errors Nuxt raises outside the page error state (fatal errors).
const props = defineProps<{ error: NuxtError }>()

const kind = computed(() =>
  props.error.statusCode === 403 ? 'forbidden' : props.error.statusCode === 404 ? 'notFound' : 'error')
</script>

<template>
  <UApp :locale="ru">
    <main class="min-h-screen bg-muted p-8">
      <PageErrorState :kind="kind" />
    </main>
  </UApp>
</template>
