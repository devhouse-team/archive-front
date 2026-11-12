<script setup lang="ts">
import { ru } from '@nuxt/ui/locale'
import type { MessageKey } from '~/composables/useT'
import type { PageErrorKind } from '~/composables/usePageError'

const { t } = useT()
const { pageError } = usePageError()
const route = useRoute()

const toaster = { position: 'bottom-right' as const }

const ERROR_TITLES: Record<PageErrorKind, MessageKey> = {
  forbidden: 'errors.forbidden',
  notFound: 'errors.notFound',
  error: 'errors.generic',
}

// One title per route from page meta (brief 4 §6). A page error replaces it, so a forbidden or hidden
// screen's name never reaches the tab title.
const title = computed(() => {
  if (pageError.value) return t(ERROR_TITLES[pageError.value.kind])
  return route.meta.title ? t(route.meta.title) : null
})

useHead({
  htmlAttrs: { lang: 'ru' },
  title,
  titleTemplate: value => value ? t('app.titleTemplate', { title: value, app: t('app.name') }) : t('app.name'),
})
</script>

<template>
  <UApp
    :locale="ru"
    :toaster="toaster"
  >
    <NuxtLayout>
      <PageErrorState
        v-if="pageError"
        :kind="pageError.kind"
        :detail="pageError.detail"
      />
      <NuxtPage v-else />
    </NuxtLayout>
  </UApp>
</template>
