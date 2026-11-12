<script setup lang="ts">
import type { Word } from '~/types/api'

// One word in the text pane: a roving-tabindex button, or the inline editor while it is being corrected.
// Keyboard handling for the pane lives in ViewerTextPane; this only owns the editor's Enter/Esc.
const props = defineProps<{
  word: Word
  text: string
  selected: boolean
  tabbable: boolean
  low: boolean
  hit: boolean
  corrected: boolean
  editing: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  commit: [id: number, text: string]
  cancel: [id: number]
}>()

const { t } = useT()
const value = ref(props.text)
const input = useTemplateRef<HTMLInputElement>('input')
let closed = false

watch(() => props.editing, (on) => {
  if (!on) return
  value.value = props.text
  closed = false
  nextTick(() => {
    input.value?.focus()
    input.value?.select()
  })
}, { immediate: true })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    closed = true
    emit('commit', props.word.id, value.value)
  }
  else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    closed = true
    emit('cancel', props.word.id)
  }
}

// Clicking away keeps what was typed: losing a correction to a stray click is worse than an extra edit.
function onBlur() {
  if (closed) return
  closed = true
  emit('commit', props.word.id, value.value)
}

const size = computed(() => Math.max(3, value.value.length + 1))
</script>

<template>
  <input
    v-if="editing"
    ref="input"
    v-model="value"
    type="text"
    :size="size"
    :aria-label="t('viewer.text.editLabel', { text: word.ocr_text })"
    spellcheck="false"
    autocomplete="off"
    class="viewer-word-input rounded-sm bg-default px-1 text-highlighted outline-2 outline-offset-1 outline-primary"
    @keydown="onKeydown"
    @blur="onBlur"
  >
  <button
    v-else
    type="button"
    :data-word-id="word.id"
    :tabindex="tabbable ? 0 : -1"
    :aria-current="selected ? 'true' : undefined"
    :class="[
      'viewer-word rounded-sm px-0.5 text-start text-default',
      low && 'viewer-word--low',
      hit && 'bg-hit',
      corrected && 'viewer-word--corrected',
      selected && 'viewer-word--selected',
    ]"
    @click="emit('select', word.id)"
  >
    {{ text }}
  </button>
</template>

<style scoped>
/* Spec 2 §Confidence semantics and §LocatorPin. Plain CSS so the states compose in a fixed precedence:
   low (amber fill + dashed warning rule) < corrected (dotted rule, replaces low) < hit fill < selected ring. */
.viewer-word {
  cursor: pointer;
  border-bottom: 2px solid transparent;
  line-height: inherit;
}

.viewer-word:hover {
  background-color: var(--ui-bg-elevated);
}

.viewer-word--low,
.viewer-word--low:hover {
  background-color: var(--color-lowconf-fill);
  border-bottom: 2px dashed var(--ui-warning);
}

.viewer-word--corrected {
  text-decoration: underline dotted var(--ui-border-accented) 1px;
  text-underline-offset: 4px;
}

.viewer-word.bg-hit,
.viewer-word.bg-hit:hover {
  background-color: var(--color-hit);
}

.viewer-word--selected {
  box-shadow: 0 0 0 2px var(--color-ink);
}

.viewer-word:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}

.viewer-word-input {
  font: inherit;
  line-height: 1.4;
}

/* Naskh descenders sit low: keep the dashed rule clear of them (spec 2 §Confidence semantics). */
:global([dir="rtl"]) .viewer-word--low {
  padding-bottom: 2px;
}
