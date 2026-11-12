<script setup lang="ts">
import type { Lang } from '~/types/api'

// A case's script badges (handoff §1), each the shared ScriptBadge; «нет» when no page is recognised yet.
defineProps<{ langs: readonly Lang[] }>()
const { t } = useT()
</script>

<template>
  <span
    v-if="langs.length"
    class="inline-flex flex-wrap gap-1"
  >
    <ScriptBadge
      v-for="lang in langs"
      :key="lang"
      :lang="lang"
    />
  </span>
  <span
    v-else
    class="text-dimmed"
  >{{ t('dela.noLangs') }}</span>
</template>
