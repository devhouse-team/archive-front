<script setup lang="ts">
import type { DeloPage } from '~/types/api'
import { leafSlots } from '~/composables/useCases'

// Leaves in order with the gaps in place (handoff §5.3 `gaps`): a missing leaf is a dashed placeholder where the
// scan would be, so a reader of the grid sees «л. 3, [нет л. 4], л. 5» without arithmetic.
const props = defineProps<{
  pages: readonly DeloPage[]
  gaps: readonly number[]
}>()

const { t } = useT()
const slots = computed(() => leafSlots(props.pages, props.gaps))
</script>

<template>
  <ul
    class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3"
    role="list"
  >
    <li
      v-for="slot in slots"
      :key="`${slot.kind}-${slot.leaf}`"
      :data-gap="slot.kind === 'gap' ? slot.leaf : undefined"
    >
      <DelaThumb
        v-if="slot.kind === 'page'"
        :page="slot.page"
      />
      <div
        v-else
        role="img"
        :aria-label="t('dela.card.gapAria', { leaf: slot.leaf })"
        class="flex h-full flex-col overflow-hidden rounded-md border-2 border-dashed border-accented"
      >
        <span
          class="flex aspect-[1/1.414] flex-col items-center justify-center gap-2 text-muted"
          aria-hidden="true"
        >
          <UIcon
            name="i-lucide-file-x"
            class="size-7"
          />
          <span class="text-sm font-medium">{{ t('dela.card.gap') }}</span>
        </span>
        <span
          class="border-t-2 border-dashed border-accented p-2 font-plate text-[15px] font-semibold text-muted tabular-nums"
          aria-hidden="true"
        >{{ t('dela.card.leaf', { leaf: slot.leaf }) }}</span>
      </div>
    </li>
  </ul>
</template>
