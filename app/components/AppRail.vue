<script setup lang="ts">
import type { NavGroup } from '~/utils/nav'
import { useQueueStore } from '~/stores/queue'
import { railBadgeClass, railGroupLabelClass, railLinkClass } from '~/utils/civic-ui'
import { formatCount } from '~/utils/format'
import { isNavActive } from '~/utils/nav'

// The civic rail's navigation (spec 2 §Nuxt UI on civic fields). Renders exactly navForRole(): the shell passes
// the groups in, empty groups are already gone, so their labels never render.
// Plain links rather than UNavigationMenu: the vertical UNavigationMenu (accordion mode) re-rendered dozens of
// times on every mount and kept the main thread busy for seconds after sign-in (Stage 4 profiling note in
// docs/stages/2-design-system.md). A flat list of links needs none of its machinery.
defineProps<{ groups: NavGroup[] }>()

const { t } = useT()
const queue = useQueueStore()
const route = useRoute()

function counter(item: NavGroup['items'][number]): string | null {
  if (!item.counter) return null
  const n = queue.counts[item.counter]
  return n > 0 ? formatCount(n, 999) : null
}
</script>

<template>
  <nav
    :aria-label="t('nav.label')"
    class="flex flex-col px-2"
  >
    <div
      v-for="group in groups"
      :key="group.id"
      class="flex flex-col"
    >
      <p :class="railGroupLabelClass">
        <span lang="kk">{{ t(group.labelKk) }}</span> · {{ t(group.labelRu) }}
      </p>
      <ul class="flex flex-col gap-0.5">
        <li
          v-for="item in group.items"
          :key="item.id"
        >
          <NuxtLink
            :to="item.to"
            :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
            :class="railLinkClass"
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0 text-rail-muted group-hover:text-white group-aria-[current=page]:text-white"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate">{{ t(item.label) }}</span>
            <span
              v-if="counter(item)"
              :class="[railBadgeClass, item.counter === 'errors' ? 'bg-error' : 'bg-inverted']"
            >{{ counter(item) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
