<script setup lang="ts">
import { ALL_ROLES } from '~/utils/access'

// `/` never renders: the auth middleware sends every user to the role's start route.
definePageMeta({ roles: ALL_ROLES })
</script>

<template>
  <div />
</template>
