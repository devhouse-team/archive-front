<script setup lang="ts">
import type { Lang } from '~/types/api'

// Script badges RU / KK / KK-лат / KK-араб (handoff §1). Plate colour, soft: they name an attribute, not a status.
defineProps<{ langs: readonly Lang[] }>()
const { t } = useT()
</script>

<template>
  <span
    v-if="langs.length"
    class="inline-flex flex-wrap gap-1"
  >
    <UBadge
      v-for="lang in langs"
      :key="lang"
      color="secondary"
      variant="soft"
      size="md"
      class="font-plate tracking-[0.02em]"
      :label="t(`langs.${lang}`)"
    />
  </span>
  <span
    v-else
    class="text-dimmed"
  >{{ t('dela.noLangs') }}</span>
</template>
