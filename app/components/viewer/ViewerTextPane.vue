<script setup lang="ts">
import type { Lang, Word } from '~/types/api'
import type { NavKey, ViewerLine } from '~/composables/useViewer'
import { confPercent, NAV_KEYS, navigateWords } from '~/composables/useViewer'

// The recognised text (spec 2 §LocatorPin, §Shared line grid): one tab stop with a roving tabindex.
// ←/→ move in visual order (mirrored in RTL), ↑/↓ jump between low-confidence words, Tab leaves the pane.
// In edit mode (EDITORS only; the page decides) Enter opens the inline editor.
const props = defineProps<{
  lines: ViewerLine[]
  order: Word[]
  selectedId: number | null
  hits: ReadonlySet<number>
  drafts: ReadonlyMap<number, string>
  threshold: number
  lang: Lang | null
  editable: boolean
}>()

const emit = defineEmits<{
  'select': [id: number]
  'edit': [id: number, text: string]
  'leader-change': []
}>()

const { t } = useT()
const dir = useLangDir(() => props.lang)
const arabic = computed(() => props.lang === 'kk-arab')
const LANG_TAGS: Record<Lang, string> = { 'ru': 'ru', 'kk-cyrl': 'kk', 'kk-latn': 'kk-Latn', 'kk-arab': 'kk-Arab' }
const langTag = computed(() => props.lang ? LANG_TAGS[props.lang] : undefined)

const root = useTemplateRef<HTMLElement>('root')
const viewport = useTemplateRef<HTMLElement>('viewport')
const editingId = ref<number | null>(null)
const announcement = ref('')

const wordText = (w: Word) => props.drafts.get(w.id) ?? w.text
const isEdited = (w: Word) => props.drafts.has(w.id) && props.drafts.get(w.id) !== w.text
const isLow = (w: Word) => w.corrected === 0 && !isEdited(w) && w.conf < props.threshold
const isCorrected = (w: Word) => w.corrected === 1 || isEdited(w)

const tabStopId = computed(() => props.selectedId ?? props.order[0]?.id ?? null)
const lowWords = computed(() => props.order.filter(isLow))
const lowPosition = computed(() => {
  const i = lowWords.value.findIndex(w => w.id === props.selectedId)
  return i === -1 ? null : i + 1
})

function wordEl(id: number): HTMLElement | null {
  return root.value?.querySelector<HTMLElement>(`[data-word-id="${id}"]`) ?? null
}

function focusWord(id: number) {
  nextTick(() => wordEl(id)?.focus({ preventScroll: true }))
}

/** Scroll the selected word's row into the pane (the pane scrolls, never the whole page). */
function revealWord(id: number, smooth = true) {
  const el = wordEl(id)
  const vp = viewport.value
  if (!el || !vp) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Stacked mobile layout: the pane grows with its text and the page scrolls instead.
  if (vp.scrollHeight <= vp.clientHeight + 1) {
    const r = el.getBoundingClientRect()
    if (r.top < 64 || r.bottom > window.innerHeight - 24) el.scrollIntoView({ block: 'center', behavior: smooth && !reduceMotion ? 'smooth' : 'auto' })
    return
  }
  const er = el.getBoundingClientRect()
  const vr = vp.getBoundingClientRect()
  const margin = 48
  if (er.top >= vr.top + margin && er.bottom <= vr.bottom - margin) return
  const target = vp.scrollTop + (er.top - vr.top) - vr.height / 2 + er.height / 2
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  vp.scrollTo({ top: Math.max(0, target), behavior: smooth && !reduce ? 'smooth' : 'auto' })
}

function announce(id: number) {
  const i = props.order.findIndex(w => w.id === id)
  const w = props.order[i]
  if (!w) return
  const params = { n: i + 1, total: props.order.length, conf: confPercent(Math.floor(w.conf)) }
  announcement.value = t(isLow(w) ? 'viewer.text.announceLow' : 'viewer.text.announce', params)
}

watch(() => props.selectedId, (id) => {
  if (id === null) return
  announce(id)
  nextTick(() => revealWord(id))
})

// The page selects the first search hit before this pane mounts: scroll to it, without announcing it.
onMounted(() => {
  const id = props.selectedId
  if (id !== null) nextTick(() => revealWord(id, false))
})

function select(id: number, focus: boolean) {
  emit('select', id)
  if (focus) focusWord(id)
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const id = Number(target.dataset.wordId)
  if (!Number.isFinite(id) || target.tagName !== 'BUTTON') return
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (NAV_KEYS.includes(e.key)) {
    e.preventDefault()
    const next = navigateWords(props.order, id, e.key as NavKey, dir.value, isLow)
    if (next === null) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') announcement.value = t('viewer.text.noMoreLow')
      return
    }
    select(next, true)
    return
  }
  if (e.key === 'Enter' && props.editable) {
    e.preventDefault()
    emit('select', id)
    editingId.value = id
  }
}

/** ↑/↓ buttons in the pane header: same moves as the keys, starting from the selection. */
function stepLow(key: 'ArrowUp' | 'ArrowDown') {
  const next = navigateWords(props.order, props.selectedId, key, dir.value, isLow)
  if (next === null) {
    announcement.value = t('viewer.text.noMoreLow')
    return
  }
  select(next, false)
}

function commit(id: number, text: string) {
  editingId.value = null
  emit('edit', id, text)
  focusWord(id)
}

function cancel(id: number) {
  editingId.value = null
  focusWord(id)
}

watch(() => props.editable, (on) => {
  if (!on) editingId.value = null
})

function lineMeta(line: ViewerLine) {
  if (line.mean < props.threshold) return { text: t('viewer.text.lineMean', { value: confPercent(Math.floor(line.mean)) }), cls: 'text-warning font-medium', aria: null }
  if (line.lowCount > 0) return { text: t('viewer.text.lineLow', { count: line.lowCount }), cls: 'text-muted', aria: t('viewer.text.lineLowAria', { count: line.lowCount }) }
  return { text: t('viewer.text.lineMean', { value: confPercent(Math.floor(line.mean)) }), cls: 'text-dimmed', aria: null }
}

let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    emit('leader-change')
  })
}
onBeforeUnmount(() => cancelAnimationFrame(raf))

defineExpose({ wordEl, viewport, revealWord, stepLow, root })
</script>

<template>
  <section
    ref="root"
    class="flex min-h-0 flex-col overflow-hidden rounded-lg bg-default ring-1 ring-default"
    :aria-label="t('viewer.text.title')"
  >
    <header class="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-2 border-b border-default px-4 py-2">
      <slot name="mode" />
      <h2 class="text-sm font-semibold text-highlighted">
        {{ t('viewer.text.title') }}
      </h2>
      <div class="ms-auto flex items-center gap-1">
        <span class="me-1 text-[13px] text-muted tabular-nums">
          <template v-if="lowWords.length === 0">{{ t('viewer.text.lowNavNone') }}</template>
          <template v-else>{{ t('viewer.text.lowNav', { position: lowPosition ?? '–', count: lowWords.length }) }}</template>
        </span>
        <UButton
          v-if="lowWords.length > 0"
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          :aria-label="t('viewer.text.prevLow')"
          @click="stepLow('ArrowUp')"
        />
        <UButton
          v-if="lowWords.length > 0"
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          :aria-label="t('viewer.text.nextLow')"
          @click="stepLow('ArrowDown')"
        />
      </div>
    </header>

    <div
      v-if="order.length === 0"
      class="flex flex-1 flex-col items-start gap-2 px-6 py-10"
    >
      <UIcon
        name="i-lucide-file-x"
        class="size-6 text-muted"
        aria-hidden="true"
      />
      <h3 class="text-base font-semibold text-highlighted">
        {{ t('viewer.text.empty') }}
      </h3>
      <p class="text-sm text-muted">
        {{ t('viewer.text.emptyBody') }}
      </p>
    </div>

    <div
      v-else
      ref="viewport"
      class="viewer-text min-h-0 flex-1 overflow-y-auto py-3"
      @scroll.passive="onScroll"
    >
      <div
        role="group"
        :aria-label="t('viewer.text.label')"
        :dir="dir"
        :lang="langTag"
        :class="arabic ? 'font-arabic text-lg leading-[30px]' : 'text-base leading-6'"
        @keydown="onKeydown"
      >
        <div
          v-for="line in lines"
          :key="line.line"
          :data-line="line.line"
          :class="[
            'grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-baseline px-1',
            line.words.some(w => w.id === selectedId) && 'bg-elevated/60',
          ]"
        >
          <span
            class="pe-3 text-end font-sans text-[13px] leading-[inherit] text-muted tabular-nums select-none"
            aria-hidden="true"
          >{{ line.line + 1 }}</span>
          <p class="py-0.5">
            <template
              v-for="(w, i) in line.words"
              :key="w.id"
            >
              <template v-if="i > 0">
                {{ ' ' }}
              </template>
              <UTooltip
                v-if="isCorrected(w) && editingId !== w.id"
                :text="t('viewer.text.ocrWas', { text: w.ocr_text })"
              >
                <ViewerWord
                  :word="w"
                  :text="wordText(w)"
                  :selected="w.id === selectedId"
                  :tabbable="w.id === tabStopId"
                  :low="false"
                  :hit="hits.has(w.id)"
                  corrected
                  :editing="false"
                  @select="select($event, false)"
                />
              </UTooltip>
              <ViewerWord
                v-else
                :word="w"
                :text="wordText(w)"
                :selected="w.id === selectedId"
                :tabbable="w.id === tabStopId"
                :low="isLow(w)"
                :hit="hits.has(w.id)"
                :corrected="isCorrected(w)"
                :editing="editingId === w.id"
                @select="select($event, false)"
                @commit="commit"
                @cancel="cancel"
              />
            </template>
          </p>
          <span
            :class="['ps-2 pe-3 text-end font-sans text-[13px] leading-[inherit] tabular-nums', lineMeta(line).cls]"
          ><bdi
            dir="ltr"
            :aria-hidden="lineMeta(line).aria ? 'true' : undefined"
          >{{ lineMeta(line).text }}</bdi><span
            v-if="lineMeta(line).aria"
            class="sr-only"
          >{{ lineMeta(line).aria }}</span></span>
        </div>
      </div>
    </div>

    <slot name="footer" />

    <p
      role="status"
      aria-live="polite"
      class="sr-only"
    >
      {{ announcement }}
    </p>
  </section>
</template>
