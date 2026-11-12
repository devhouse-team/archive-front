<script setup lang="ts">
const emit = defineEmits<{ pick: [username: string] }>()
const accounts = ['admin', 'archivist', 'operator', 'reader']
</script>

<template>
  <div class="flex gap-1">
    <span v-for="a in accounts" :key="a" class="text-xs px-1 py-0.5 cursor-pointer text-blue-600" @click="emit('pick', a)">
      {{ a }}
    </span>
  </div>
</template>
