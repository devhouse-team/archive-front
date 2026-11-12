<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useHealthStore } from '~/stores/health'
import { useNotificationsStore } from '~/stores/notifications'
import { useQueueStore } from '~/stores/queue'
import { headerButtonClass } from '~/utils/civic-ui'
import { isEnabled } from '~/utils/config'
import { navForRole } from '~/utils/nav'

// The civic app shell (spec 2, surface brief app-layouts-default-vue): a 220 px rail and a 56 px header as
// flat civic fields. Below 1024 px the rail becomes a slideover opened from the header.
// Polling lives in this component's scope: it stops when the shell unmounts (logout, 401 → /login).
const { t } = useT()
const auth = useAuthStore()
const route = useRoute()
const { pageError } = usePageError()

useHealthStore().startPolling()
useQueueStore().startPolling()
useNotificationsStore().startPolling()

const groups = computed(() => navForRole(auth.role))
// The comp's rail footer: a quiet reminder that this instance holds demo data (same switch as the login's demo accounts).
const demoData = isEnabled(useRuntimeConfig().public.demoAccounts)
const showBell = computed(() => auth.can('notifications'))

// Screen names only: error states and the catch-all carry no screen name in the header.
const title = computed(() => {
  const key = route.meta.title
  return !pageError.value && key?.startsWith('pages.') ? t(key) : null
})

const mainEl = useTemplateRef<HTMLElement>('main')
function skipToContent() {
  mainEl.value?.focus()
}

// Constant objects, so a layout re-render does not hand the dashboard components new props.
const civicToggle = { class: headerButtonClass, color: 'neutral' as const, variant: 'ghost' as const }
const sidebarUi = {
  root: 'w-[220px] min-w-[220px] border-e-0 bg-rail',
  header: 'h-14 px-4',
  body: 'gap-0 px-0 pt-0 pb-4',
  content: 'w-[280px] max-w-[85vw] bg-rail divide-y-0 ring-0',
}
// The mobile drawer's dialog name: the menu it holds, not the toggle's «Открыть боковую панель».
const sidebarMenu = { title: t('nav.label') }
const navbarAs = { root: 'header', title: 'p' }
const navbarUi = {
  root: 'h-14 gap-2 border-b-0 bg-rail px-3 sm:px-6',
  left: 'min-w-0 flex-1 gap-2',
  title: 'min-w-0 truncate text-base font-semibold text-white',
  right: 'min-w-0 gap-1 sm:gap-2',
}
const panelUi = { root: 'min-w-0' }
</script>

<template>
  <div>
    <a
      href="#main"
      class="sr-only z-50 rounded-md bg-default text-sm font-semibold text-highlighted shadow-lg focus-visible:not-sr-only focus-visible:px-4 focus-visible:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:fixed focus-visible:start-3 focus-visible:top-3 focus-visible:inline-flex focus-visible:min-h-9 focus-visible:items-center"
      @click.prevent="skipToContent"
    >{{ t('app.skipToContent') }}</a>

    <UDashboardGroup :persistent="false">
      <UDashboardSidebar
        :toggle="civicToggle"
        :menu="sidebarMenu"
        :ui="sidebarUi"
      >
        <template #header>
          <AppBrand />
        </template>
        <AppRail :groups="groups" />
        <template
          v-if="demoData"
          #footer
        >
          <p class="ps-1 font-plate text-[10px]/5 font-medium tracking-[0.06em] text-rail-muted uppercase">
            {{ t('app.demoData') }}
          </p>
        </template>
      </UDashboardSidebar>

      <UDashboardPanel :ui="panelUi">
        <UDashboardNavbar
          :as="navbarAs"
          :title="title ?? undefined"
          :toggle="civicToggle"
          :ui="navbarUi"
        >
          <template #right>
            <EaisIndicator />
            <NotificationBell v-if="showBell" />
            <UserMenu />
          </template>
        </UDashboardNavbar>

        <main
          id="main"
          ref="main"
          tabindex="-1"
          class="min-w-0 flex-1 overflow-y-auto p-4 focus:outline-none sm:p-6"
        >
          <slot />
        </main>
      </UDashboardPanel>
    </UDashboardGroup>
  </div>
</template>
