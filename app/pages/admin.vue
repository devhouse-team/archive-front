<script setup lang="ts">
import { ACCESS } from '~/utils/access'

definePageMeta({ roles: ACCESS.admin, title: 'pages.admin' })

// Handoff §6 #11, surface brief app-pages-admin-vue. Admin only (the route meta gates it; the nav hides it).
const { t } = useT()
</script>

<template>
  <div class="mx-auto grid max-w-[1440px] items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <h1 class="sr-only">
      {{ t('admin.title') }}
    </h1>
    <AdminUsers class="xl:row-span-2" />
    <AdminEais />
    <AdminHealth />
  </div>
</template>
