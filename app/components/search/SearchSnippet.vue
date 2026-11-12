<script setup lang="ts">
// The one place in the app that renders HTML from the server (handoff §4, CLAUDE.md): `snippet_html` from
// /api/search and /api/search/delo is escaped server-side and carries only <mark>. Nothing else may use v-html.
defineProps<{
  /** A search payload's `snippet_html`, passed through untouched. */
  snippetHtml: string
  /** A quotation rule on the inline-start side; it follows the snippet's own direction (right for Töte). */
  ruled?: boolean
}>()
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- snippet_html only: server-escaped, <mark> is the only tag -->
  <p
    dir="auto"
    class="search-snippet text-sm/6 text-default break-words"
    :class="ruled && 'border-s border-default ps-3'"
    v-html="snippetHtml"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
/* Search hit: ink on cyan-200 (13.28:1, spec 2 §Colour roles). Hits only, never decoration. */
.search-snippet :deep(mark) {
  background-color: var(--color-hit);
  color: var(--color-ink);
  border-radius: 2px;
  padding-inline: 1px;
  box-decoration-break: clone;
}

/* Töte runs pick up the Arabic face and its taller line (spec 2 §Type) through the font stack. */
.search-snippet:dir(rtl) {
  font-family: var(--font-arabic);
  line-height: 1.9;
  font-size: 1rem;
}
</style>
