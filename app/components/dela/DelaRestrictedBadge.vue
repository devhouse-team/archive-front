<script setup lang="ts">
import type { Access } from '~/types/api'
import { useAuthStore } from '~/stores/auth'

// Handoff §2: the restricted mark is for EDITORS only. The backend already hides restricted cases from everyone
// else; this check makes sure the mark itself can never render for them either.
defineProps<{ access: Access }>()
const { t } = useT()
const auth = useAuthStore()
</script>

<template>
  <UBadge
    v-if="access === 'restricted' && auth.can('restricted')"
    data-testid="restricted-badge"
    color="neutral"
    variant="soft"
    size="md"
    icon="i-lucide-lock"
    :label="t('access.restricted')"
  />
</template>
