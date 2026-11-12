<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// 🔒 for restricted cases (handoff §2). Only editors ever receive restricted rows, but the badge also checks the
// role itself, so a stray row can never hint to a reader or operator that hidden cases exist.
defineProps<{ access: 'open' | 'restricted' | string | null | undefined }>()
const { t } = useT()
const auth = useAuthStore()
</script>

<template>
  <UBadge
    v-if="access === 'restricted' && auth.can('restricted')"
    color="warning"
    variant="soft"
    size="md"
    icon="i-lucide-lock"
    :label="t('search.restricted')"
  />
</template>
