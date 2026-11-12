<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/stores/auth'
import { headerButtonClass } from '~/utils/civic-ui'

// Header user menu: full name and role, «Выйти». The name hides visually below sm but stays the button's name.
const { t } = useT()
const auth = useAuthStore()
const loggingOut = ref(false)

const initials = computed(() => (auth.me?.full_name ?? '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(w => w[0]?.toUpperCase())
  .join(''))

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout()
  }
  finally {
    loggingOut.value = false
  }
}

const items = computed<DropdownMenuItem[][]>(() => [
  [{
    type: 'label',
    label: auth.me?.full_name ?? '',
    description: auth.me ? (auth.me.role_ru || t(`roles.${auth.me.role}`)) : '',
  }],
  [{ label: t('auth.logout'), icon: 'i-lucide-log-out', onSelect: () => void logout() }],
])
</script>

<template>
  <UDropdownMenu
    v-if="auth.me"
    :items="items"
    :content="{ align: 'end', sideOffset: 8 }"
    :ui="{ content: 'min-w-56' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      :class="['min-w-0 gap-2 ps-1.5', headerButtonClass]"
    >
      <span
        class="grid size-7 shrink-0 place-items-center rounded-full bg-default text-xs font-semibold text-secondary"
        aria-hidden="true"
      >{{ initials }}</span>
      <span class="sr-only truncate text-[13px] font-medium md:not-sr-only">{{ auth.me.full_name }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="hidden size-4 shrink-0 text-rail-muted md:block"
        aria-hidden="true"
      />
    </UButton>
  </UDropdownMenu>
</template>
