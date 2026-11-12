<script setup lang="ts">
import { ALL_ROLES } from '~/utils/access'

// Unknown addresses: the same not-found state as a hidden or missing record, inside the shell.
// Anonymous users never get here: the auth middleware sends them to /login?next= first.
definePageMeta({ roles: ALL_ROLES, title: 'errors.notFound' })
</script>

<template>
  <PageErrorState kind="notFound" />
</template>
