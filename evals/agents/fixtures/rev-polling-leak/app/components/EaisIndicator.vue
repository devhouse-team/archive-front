<script setup lang="ts">
const { t } = useT()
const online = ref(true)
setInterval(async () => {
  const h = await $fetch<{ eais_online: boolean }>('/api/health', { credentials: 'same-origin' })
  online.value = h.eais_online
}, 5000)
</script>

<template>
  <UBadge :color="online ? 'success' : 'error'" variant="subtle">
    {{ online ? t('eais.online') : t('eais.offline') }}
  </UBadge>
</template>
