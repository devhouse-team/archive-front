<script setup lang="ts">
import type { CaseCheckState } from '~/composables/useOps'

// The live «Дело в ЕАИС: …» line (handoff §5.2 check-case): found, not found, ЕАИС down. Polite live region,
// so a screen reader hears the outcome once it arrives. The ЕАИС title is user data: interpolation only.
const props = defineProps<{ check: CaseCheckState }>()
const { t } = useT()

const view = computed(() => {
  const c = props.check
  switch (c.state) {
    case 'checking': return { icon: 'i-lucide-loader-circle', cls: 'text-muted', spin: true, text: t('upload.check.checking') }
    case 'found': return { icon: 'i-lucide-circle-check', cls: 'text-success', spin: false, text: t('upload.check.found', { title: c.title }) }
    case 'notFound': return { icon: 'i-lucide-triangle-alert', cls: 'text-warning', spin: false, text: t('upload.check.notFound') }
    case 'down': return {
      icon: 'i-lucide-cloud-off',
      cls: 'text-error',
      spin: false,
      text: c.detail ? t('upload.check.down', { detail: c.detail }) : t('upload.check.downNoDetail'),
    }
    case 'failed': return { icon: 'i-lucide-circle-alert', cls: 'text-error', spin: false, text: t('upload.check.failed') }
    default: return null
  }
})
</script>

<template>
  <p
    role="status"
    class="flex min-h-6 items-start gap-1.5 text-sm"
    :class="view?.cls"
  >
    <template v-if="view">
      <UIcon
        :name="view.icon"
        class="mt-0.5 size-4 shrink-0"
        :class="view.spin ? 'animate-spin motion-reduce:animate-none' : ''"
        aria-hidden="true"
      />
      <span dir="auto">{{ view.text }}</span>
    </template>
  </p>
</template>
