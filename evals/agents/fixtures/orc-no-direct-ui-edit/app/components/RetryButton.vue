<script setup lang="ts">
const { t } = useT()
defineEmits<{ retry: [] }>()
</script>

<template>
  <UButton color="neutral" variant="soft" icon="i-lucide-rotate-cw" @click="$emit('retry')">
    {{ t('errors.resend') }}
  </UButton>
</template>
