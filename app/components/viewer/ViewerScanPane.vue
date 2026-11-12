<script setup lang="ts">
import type { Word } from '~/types/api'
import { confPercent, displayScale, scaleBox, stepZoom } from '~/composables/useViewer'

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

const isEdited = (w: Word) => props.drafts.has(w.id) && props.drafts.get(w.id) !== w.text

interface BoxView {
  id: number
  style: Record<string, string>
  cls: string[]
  title: string
}

/** Precedence (spec 2): selected > hit > corrected > low. Plain boxes only with «Рамки слов» on. */
const boxes = computed<BoxView[]>(() => {
  const s = scale.value
  if (!s) return []
  const out: BoxView[] = []
  for (const w of props.words) {
    const selected = w.id === props.selectedId
    const hit = props.hits.has(w.id)
    const corrected = w.corrected === 1 || isEdited(w)
    const low = !corrected && w.conf < props.threshold
    if (!selected && !hit && !corrected && !low && !showBoxes.value) continue
    const b = scaleBox(w, s)
    out.push({
      id: w.id,
      style: { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` },
      cls: [
        'scan-box',
        low ? 'scan-box--low' : '',
        hit ? 'scan-box--hit' : '',
        (selected || hit) ? 'scan-box--strong' : '',
      ],
      title: `${props.drafts.get(w.id) ?? w.text} · ${confPercent(Math.floor(w.conf))} %`,
    })
  }
  return out
})

const selectedBox = computed(() => {
  const w = props.words.find(x => x.id === props.selectedId)
  return w && scale.value ? scaleBox(w, scale.value) : null
})

/** Scroll the scan so the selected box is in view (centred when it was out of view). */
function revealSelected(smooth = true) {
  const b = selectedBox.value
  const vp = viewport.value
  if (!b || !vp) return
  const top = b.top + PAD
  const left = b.left + PAD
  const margin = 40
  const inY = top >= vp.scrollTop + margin && top + b.height <= vp.scrollTop + vp.clientHeight - margin
  const inX = left >= vp.scrollLeft && left + b.width <= vp.scrollLeft + vp.clientWidth
  if (inY && inX) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  vp.scrollTo({
    top: inY ? vp.scrollTop : Math.max(0, top - vp.clientHeight / 2 + b.height / 2),
    left: inX ? vp.scrollLeft : Math.max(0, left - vp.clientWidth / 2 + b.width / 2),
    behavior: smooth && !reduce ? 'smooth' : 'auto',
  })
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
      <span class="text-[13px] text-muted tabular-nums">{{ t('viewer.scan.leaf', { leaf }) }}</span>
      <div class="ms-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        <USwitch
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
            :style="{ left: `${selectedBox.left + selectedBox.width}px`, top: `${selectedBox.top + selectedBox.height / 2}px` }"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Spec 2 §Scan overlays: every stroke is two-tone (1 px white halo + ink core) at 100% opacity; only fills
   are translucent. Types differ by fill and stroke style, never by hue alone. */
.scan-box {
  position: absolute;
  cursor: pointer;
  border: 1px solid var(--color-ink);
  box-shadow: 0 0 0 1px var(--color-halo), inset 0 0 0 1px var(--color-halo);
  border-radius: 2px;
}

.scan-box--low {
  border-style: dashed;
  background-color: color-mix(in srgb, var(--color-lowconf-fill) 55%, transparent);
}

.scan-box--hit {
  background-color: color-mix(in srgb, var(--color-hit) 50%, transparent);
}

.scan-box--strong {
  border-width: 2px;
}

/* «You are here»: gold with an ink ring and a white keyline so it holds on dark paper too. */
.locator-pin {
  position: absolute;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
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
