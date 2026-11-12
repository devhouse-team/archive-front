<script setup lang="ts">
const props = defineProps<{ fond: number, opis: number, delo: number, leaf?: number }>()
const { t } = useT()
const label = computed(() => {
  const base = t('shifr.format', { fond: props.fond, opis: props.opis, delo: props.delo })
  return props.leaf ? `${base} · ${t('shifr.leaf', { leaf: props.leaf })}` : base
})
</script>

<template>
  <span class="font-mono text-sm text-default tabular-nums">{{ label }}</span>
</template>
