<script setup lang="ts">
import type { PageErrorKind } from '~/composables/usePageError'
import type { MessageKey } from '~/composables/useT'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  kind: PageErrorKind
  /** Server detail (already Russian). Rendered as text, never as HTML. */
  detail?: string | null
}>()

const { t } = useT()
const auth = useAuthStore()

const copy: Record<PageErrorKind, { title: MessageKey, body: MessageKey, icon: string }> = {
  forbidden: { title: 'errors.forbidden', body: 'errors.forbiddenBody', icon: 'i-lucide-lock' },
  notFound: { title: 'errors.notFound', body: 'errors.notFoundBody', icon: 'i-lucide-file-question' },
  error: { title: 'errors.generic', body: 'errors.genericBody', icon: 'i-lucide-circle-alert' },
}

const view = computed(() => copy[props.kind])
// 403 copy is fixed: the backend's 403 detail says the same thing, and a 404 detail could name a hidden case.
const body = computed(() => props.kind === 'error' && props.detail ? props.detail : t(view.value.body))
const home = computed(() => auth.me ? auth.startPath : '/login')

// The state replaces the whole screen, so focus moves to its heading and screen readers read it once
// (Stage 3 review round 1 #8: no role="alert" on the whole section).
const heading = useTemplateRef<HTMLHeadingElement>('heading')
onMounted(() => heading.value?.focus({ preventScroll: true }))
watch(() => props.kind, () => nextTick(() => heading.value?.focus({ preventScroll: true })))
</script>

<template>
  <section
    class="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-lg bg-default p-8"
    aria-labelledby="page-error-title"
  >
    <UIcon
      :name="view.icon"
      class="size-8 text-muted"
      aria-hidden="true"
    />
    <h1
      id="page-error-title"
      ref="heading"
      tabindex="-1"
      class="text-[22px] font-semibold text-highlighted focus:outline-none"
    >
      {{ t(view.title) }}
    </h1>
    <p class="text-sm text-muted">
      {{ body }}
    </p>
    <div class="flex flex-wrap gap-2">
      <UButton
        :to="home"
        :label="t('errors.toStart')"
      />
      <UButton
        v-if="kind === 'error'"
        color="neutral"
        variant="outline"
        :label="t('errors.retry')"
        @click="reloadNuxtApp()"
      />
    </div>
  </section>
</template>
