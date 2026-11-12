<script setup lang="ts">
import type { Word } from '~/types/api'
import { confPercent, confShown, displayScale, scaleBox, stepZoom } from '~/composables/useViewer'

// The scan with word overlays (spec 2 §Scan overlays). Boxes are scaled by displayedWidth / width (handoff §4)
// and recomputed on resize and zoom. Overlays are pointer targets only; the keyboard path is the text pane.
const props = defineProps<{
  pageId: number
  leaf: number
  width: number
  height: number
  words: Word[]
  selectedId: number | null
  hits: ReadonlySet<number>
  drafts: ReadonlyMap<number, string>
  threshold: number
  /** Правка mode: «Рамки слов» and the low/corrected boxes. Просмотр shows only search hits and the selection. */
  editable?: boolean
}>()

const emit = defineEmits<{
  'select': [id: number]
  'leader-change': []
}>()

const { t } = useT()
const api = useApi()

const viewport = useTemplateRef<HTMLElement>('viewport')
const stage = useTemplateRef<HTMLElement>('stage')
const PAD = 16
/** Overlay boxes sit this many screen px outside the glyph box, so strokes frame the word instead of cutting it. */
const BOX_OUTSET = 3
/** The locator pin sits just past the selected box's bottom-end corner, clear of the word. */
const PIN_GAP = 2

const zoom = ref<'fit' | number>('fit')
const showBoxes = ref(false)
const viewportWidth = ref(0)
const imageFailed = ref(false)

const displayedWidth = computed(() => {
  if (zoom.value === 'fit') return Math.max(0, viewportWidth.value - PAD * 2)
  return props.width * zoom.value
})
const scale = computed(() => displayScale(displayedWidth.value, props.width))
const displayedHeight = computed(() => props.height * scale.value)
const zoomPercent = computed(() => confPercent(scale.value * 100))

const src = computed(() => api.pages.imageUrl(props.pageId))
watch(src, () => {
  imageFailed.value = false
})

function zoomBy(direction: 1 | -1) {
  zoom.value = stepZoom(scale.value, direction)
}

watch(() => props.editable, (on) => {
  if (!on) showBoxes.value = false
})

const isEdited = (w: Word) => props.drafts.has(w.id) && props.drafts.get(w.id) !== w.text

interface BoxView {
  id: number
  style: Record<string, string>
  cls: string[]
  title: string
}

/**
 * Precedence (spec 2): selected > hit > corrected > low. Plain boxes only with «Рамки слов» on.
 * Stage 11c: in Просмотр only the selected word and search hits are drawn; low and corrected marks are Правка tools.
 */
const boxes = computed<BoxView[]>(() => {
  const s = scale.value
  if (!s) return []
  const out: BoxView[] = []
  for (const w of props.words) {
    const selected = w.id === props.selectedId
    const hit = props.hits.has(w.id)
    const corrected = !!props.editable && (w.corrected === 1 || isEdited(w))
    const low = !!props.editable && !corrected && w.conf < props.threshold
    if (!selected && !hit && !corrected && !low && !showBoxes.value) continue
    const b = outset(scaleBox(w, s))
    out.push({
      id: w.id,
      style: { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` },
      cls: [
        'scan-box',
        low ? 'scan-box--low' : '',
        hit ? 'scan-box--hit' : '',
        corrected && !selected && !hit ? 'scan-box--corrected' : '',
        selected ? 'scan-box--selected' : '',
      ],
      title: `${props.drafts.get(w.id) ?? w.text} · ${confShown(w.conf, props.threshold)} %`,
    })
  }
  return out
})

function outset(b: { left: number, top: number, width: number, height: number }) {
  return { left: b.left - BOX_OUTSET, top: b.top - BOX_OUTSET, width: b.width + BOX_OUTSET * 2, height: b.height + BOX_OUTSET * 2 }
}

const selectedBox = computed(() => {
  const w = props.words.find(x => x.id === props.selectedId)
  return w && scale.value ? outset(scaleBox(w, scale.value)) : null
})

/**
 * The shared line grid (spec: FIRST VIEWPORT): the selected word's line drawn as a band across the scan at that
 * line's y-range, numbered at the scan's start edge like the text pane's gutter.
 */
const selectedLine = computed(() => {
  const s = scale.value
  const sel = props.words.find(x => x.id === props.selectedId)
  if (!sel || !s) return null
  let top = Infinity
  let bottom = -Infinity
  for (const w of props.words) {
    if (w.line !== sel.line) continue
    top = Math.min(top, w.y)
    bottom = Math.max(bottom, w.y + w.h)
  }
  if (!Number.isFinite(top)) return null
  const pad = 3
  return { n: sel.line + 1, top: Math.max(0, top * s - pad), height: (bottom - top) * s + pad * 2 }
})

/** The nearest scrolling ancestor of the scan (the shell's <main>), or the document. */
function outerScroller(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/**
 * Scroll the scan so the selected box is in view (centred when it was out of view). On narrow screens the scan
 * pane itself can sit below the fold, so the page scroller follows until the box is on screen too.
 */
function revealSelected(smooth = true) {
  const b = selectedBox.value
  const vp = viewport.value
  // Hidden (the «Текст» pane is showing on a narrow screen): nothing to reveal, and no page scroll.
  if (!b || !vp || !vp.getClientRects().length) return
  const top = b.top + PAD
  const left = b.left + PAD
  const margin = 40
  const inY = top >= vp.scrollTop + margin && top + b.height <= vp.scrollTop + vp.clientHeight - margin
  const inX = left >= vp.scrollLeft && left + b.width <= vp.scrollLeft + vp.clientWidth
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = smooth && !reduce ? 'smooth' : 'auto'
  const targetTop = inY ? vp.scrollTop : Math.max(0, Math.min(top - vp.clientHeight / 2 + b.height / 2, vp.scrollHeight - vp.clientHeight))
  if (!inY || !inX) {
    vp.scrollTo({
      top: targetTop,
      left: inX ? vp.scrollLeft : Math.max(0, left - vp.clientWidth / 2 + b.width / 2),
      behavior,
    })
  }
  // Where the box lands on screen once the scan has scrolled; bring it into the page scroller's view.
  const outer = outerScroller(vp)
  const outerRect = outer === document.scrollingElement
    ? { top: 0, bottom: window.innerHeight }
    : outer.getBoundingClientRect()
  const boxTop = vp.getBoundingClientRect().top + vp.clientTop + top - targetTop
  if (boxTop >= outerRect.top + margin && boxTop + b.height <= outerRect.bottom - margin) return
  const height = outerRect.bottom - outerRect.top
  outer.scrollBy({ top: boxTop - outerRect.top - height / 3, behavior })
}

watch(() => props.selectedId, () => nextTick(() => revealSelected()))
watch(scale, () => nextTick(() => {
  revealSelected(false)
  emit('leader-change')
}))

function boxEl(id: number): HTMLElement | null {
  return stage.value?.querySelector<HTMLElement>(`[data-box-id="${id}"]`) ?? null
}

let observer: ResizeObserver | null = null
onMounted(() => {
  if (!viewport.value) return
  viewportWidth.value = viewport.value.clientWidth
  observer = new ResizeObserver(() => {
    if (viewport.value) viewportWidth.value = viewport.value.clientWidth
  })
  observer.observe(viewport.value)
})

let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    emit('leader-change')
  })
}

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(raf)
})

defineExpose({ viewport, boxEl, revealSelected })
</script>

<template>
  <section
    class="flex min-h-0 flex-col overflow-hidden rounded-lg bg-scan-pane ring-1 ring-default"
    :aria-label="t('viewer.scan.title')"
  >
    <header class="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-2 border-b border-default bg-default px-4 py-2">
      <h2 class="text-sm font-semibold text-highlighted">
        {{ t('viewer.scan.title') }}
      </h2>
      <div class="ms-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        <USwitch
          v-if="editable"
          v-model="showBoxes"
          :label="t('viewer.scan.boxes')"
          size="md"
        />
        <div
          role="group"
          :aria-label="t('viewer.scan.toolbar')"
          class="flex items-center gap-1"
        >
          <UButton
            icon="i-lucide-minus"
            color="neutral"
            variant="outline"
            :aria-label="t('viewer.scan.zoomOut')"
            @click="zoomBy(-1)"
          />
          <UButton
            color="neutral"
            :variant="zoom === 1 ? 'soft' : 'outline'"
            :aria-pressed="zoom === 1"
            :aria-label="t('viewer.scan.zoomValue', { value: zoomPercent })"
            class="min-w-16 justify-center tabular-nums"
            :label="`${zoomPercent} %`"
            @click="zoom = 1"
          />
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            :aria-label="t('viewer.scan.zoomIn')"
            @click="zoomBy(1)"
          />
          <UButton
            color="neutral"
            :variant="zoom === 'fit' ? 'soft' : 'outline'"
            :aria-pressed="zoom === 'fit'"
            :label="t('viewer.scan.fit')"
            @click="zoom = 'fit'"
          />
        </div>
      </div>
    </header>

    <div
      ref="viewport"
      class="relative min-h-0 flex-1 overflow-auto"
      @scroll.passive="onScroll"
    >
      <div
        ref="stage"
        class="relative"
        :style="{ width: `${displayedWidth}px`, height: `${displayedHeight}px`, margin: `${PAD}px` }"
      >
        <img
          v-if="!imageFailed"
          :src="src"
          :alt="t('viewer.scan.imageAlt', { leaf })"
          :width="displayedWidth"
          :height="displayedHeight"
          decoding="async"
          class="block size-full bg-default shadow-scan select-none"
          draggable="false"
          @load="emit('leader-change')"
          @error="imageFailed = true"
        >
        <div
          v-else
          class="flex size-full items-center justify-center bg-default p-6 text-center text-sm text-muted"
          role="img"
          :aria-label="t('viewer.scan.imageError')"
        >
          {{ t('viewer.scan.imageError') }}
        </div>
        <div
          class="absolute inset-0"
          aria-hidden="true"
        >
          <template v-if="selectedLine">
            <div
              class="scan-line-band"
              :style="{ top: `${selectedLine.top}px`, height: `${selectedLine.height}px` }"
            />
            <span
              class="scan-line-number"
              :style="{ top: `${selectedLine.top + selectedLine.height / 2}px` }"
            >{{ selectedLine.n }}</span>
          </template>
          <div
            v-for="b in boxes"
            :key="b.id"
            :data-box-id="b.id"
            :class="b.cls"
            :style="b.style"
            :title="b.title"
            @click="emit('select', b.id)"
          />
          <span
            v-if="selectedBox"
            class="locator-pin"
            :style="{ left: `${selectedBox.left + selectedBox.width + PIN_GAP}px`, top: `${selectedBox.top + selectedBox.height + PIN_GAP}px` }"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Spec 2 §Scan overlays. Boxes are outset from the glyphs (BOX_OUTSET) so strokes frame the word and never
   cross ink. Fills multiply onto the scan, so dark glyphs stay fully dark under any tint and the word stays
   readable. Types differ by fill and stroke style, never by hue alone. */
.scan-box {
  position: absolute;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--color-ink) 55%, transparent);
  border-radius: 3px;
  transition: background-color 120ms ease-out, box-shadow 120ms ease-out;
}

.scan-box:hover {
  border-color: var(--color-ink);
  background-color: color-mix(in srgb, var(--color-civic-800) 8%, transparent);
}

.scan-box--low {
  border: 1px dashed var(--color-locator-700);
  background-color: var(--color-lowconf-fill);
  mix-blend-mode: multiply;
}

.scan-box--corrected {
  border-style: dotted;
}

.scan-box--hit {
  border-color: transparent;
  background-color: var(--color-hit);
  mix-blend-mode: multiply;
}

/* Selected: a soft gold wash under the word plus a crisp ink frame with a white keyline outside it, so the
   frame holds on dark paper. The wash multiplies, so the word reads through it. */
.scan-box--selected {
  border: 2px solid var(--color-ink);
  background-color: transparent;
  box-shadow: 0 0 0 1.5px var(--color-halo), 0 2px 6px color-mix(in srgb, var(--color-ink) 25%, transparent);
  mix-blend-mode: normal;
}

.scan-box--selected::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 1px;
  background-color: var(--color-locator-200);
  mix-blend-mode: multiply;
  pointer-events: none;
}

.scan-box--selected.scan-box--hit::before {
  background-color: var(--color-hit);
}

.scan-box--selected.scan-box--hit,
.scan-box--selected.scan-box--low {
  border-style: solid;
}

/* The shared line grid: the selected line's band (same token as the text pane) and its number on the
   scan's start edge, bold civic on a white keyline so it holds on dark paper. */
.scan-line-band {
  position: absolute;
  inset-inline: 0;
  background: var(--color-line-band);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-civic-800) 22%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--color-civic-800) 22%, transparent);
  pointer-events: none;
}

.scan-line-number {
  position: absolute;
  inset-inline-start: 4px;
  transform: translateY(-50%);
  min-width: 1.5rem;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--color-halo);
  color: var(--color-civic-800);
  font-family: var(--font-plate);
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  text-align: end;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-civic-800) 30%, transparent);
  pointer-events: none;
}

/* «You are here»: gold with an ink ring and a white keyline so it holds on dark paper too. */
.locator-pin {
  position: absolute;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 9999px;
  background: var(--color-locator);
  box-shadow: 0 0 0 1.5px var(--color-ink), 0 0 0 3px var(--color-halo);
  pointer-events: none;
  transition: left 120ms cubic-bezier(0.16, 1, 0.3, 1), top 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .locator-pin {
    transition: none;
  }
}
</style>
