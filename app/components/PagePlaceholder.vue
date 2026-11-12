<script setup lang="ts">
import type { MessageKey } from '~/composables/useT'

// Placeholder for screens built in Stage 5+. The header already names the screen, so the page's h1 is for
// assistive tech and heading navigation only; each real screen replaces this with its own visible h1.
defineProps<{ title: MessageKey }>()
const { t } = useT()
</script>

<template>
  <section class="flex flex-col gap-2 rounded-lg bg-default p-6">
    <h1 class="sr-only">
      {{ t(title) }}
    </h1>
    <p class="text-sm text-muted">
      {{ t('placeholder.body') }}
    </p>
    <slot />
  </section>
</template>
