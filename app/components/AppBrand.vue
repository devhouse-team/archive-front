<script setup lang="ts">
// Product mark and name on a civic field (rail top, login band). No institution name (PRODUCT.md).
const { t } = useT()
</script>

<template>
  <div class="flex min-w-0 items-center gap-2.5 text-white">
    <span
      class="grid size-8 shrink-0 place-items-center rounded-md bg-default font-plate text-[13px] font-semibold tracking-[0.04em] text-secondary"
      aria-hidden="true"
    >{{ t('app.mark') }}</span>
    <span class="text-[13px]/4 font-bold text-balance">{{ t('app.name') }}</span>
  </div>
</template>
