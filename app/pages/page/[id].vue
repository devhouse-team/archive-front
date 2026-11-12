<script setup lang="ts">
import type { ExportFormat, Fuzzy, PageDetail } from '~/types/api'
import type { LeaderGeometry } from '~/composables/useViewer'
import { changedEdits, confPercent, groupLines, isRecognising, lowThreshold, readingOrder, retryConfirmKey } from '~/composables/useViewer'
import { useAuthStore } from '~/stores/auth'
import { ACCESS } from '~/utils/access'
import { isApiError } from '~/utils/api-error'

// Страница (handoff §6 #6, Stage 5 brief): the scan and the recognised text side by side, joined by the locator.
// View mode for everyone; edit mode only for EDITORS with ?mode=edit (handoff §2). Others never see an edit
// affordance. 404 (missing or hidden) goes to the shared not-found state through useApi's 'page' mode.
definePageMeta({ roles: ACCESS.page, title: 'pages.page' })

const { t } = useT()
const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { notify } = useNotify()
const { raise } = usePageError()

// ---------- route ----------
const pageId = computed(() => Number(route.params.id))
const hl = computed(() => typeof route.query.hl === 'string' ? route.query.hl : '')
const fz = computed<Fuzzy | undefined>(() => {
  const v = Number(route.query.fz)
  return v === 0 || v === 1 || v === 2 ? v : undefined
})
const editable = computed(() => auth.isEditor && route.query.mode === 'edit')
const navQuery = computed(() => {
  const q: Record<string, string> = {}
  if (editable.value) q.mode = 'edit'
  if (hl.value) q.hl = hl.value
  if (fz.value !== undefined) q.fz = String(fz.value)
  return q
})

// ---------- data ----------
const page = ref<PageDetail | null>(null)
const loading = ref(true)
const selectedId = ref<number | null>(null)
const drafts = ref(new Map<number, string>())

const threshold = computed(() => lowThreshold(page.value))
const order = computed(() => page.value ? readingOrder(page.value.words) : [])
const lines = computed(() => page.value ? groupLines(page.value.words, threshold.value) : [])
const hits = computed(() => new Set(page.value?.highlight_word_ids ?? []))
const lowCount = computed(() => order.value.filter(w => w.corrected === 0 && w.conf < threshold.value).length)
const edits = computed(() => page.value ? changedEdits(page.value.words, drafts.value) : [])
const dirty = computed(() => edits.value.length > 0)
const selectedWord = computed(() => order.value.find(w => w.id === selectedId.value) ?? null)

let loadToken = 0
async function load(initial: boolean) {
  // The route changes before this screen unmounts on the way out: never react to another screen's URL.
  if (!route.path.startsWith('/page/')) return
  const id = pageId.value
  if (!Number.isInteger(id) || id <= 0) {
    raise('notFound')
    return
  }
  const token = ++loadToken
  if (initial) {
    loading.value = true
    page.value = null
    selectedId.value = null
    drafts.value = new Map()
  }
  try {
    const data = await api.request<PageDetail>(`/api/pages/${id}`, {
      query: { hl: hl.value || undefined, fz: hl.value ? fz.value : undefined },
      errorMode: initial ? 'page' : 'background',
    })
    if (token !== loadToken) return
    page.value = data
    if (initial) {
      const firstHit = readingOrder(data.words).find(w => data.highlight_word_ids.includes(w.id))
      selectedId.value = firstHit?.id ?? null
    }
    else if (selectedId.value !== null && !data.words.some(w => w.id === selectedId.value)) {
      selectedId.value = null
    }
  }
  catch (e) {
    if (token !== loadToken || !initial) return
    // 401/403/404 are handled by useApi ('page' mode); anything else gets the generic error state.
    if (isApiError(e) && (e.kind === 'unauthorized' || e.kind === 'forbidden' || e.kind === 'notFound')) return
    raise('error', isApiError(e) ? e.detail : null)
  }
  finally {
    if (token === loadToken) loading.value = false
  }
}

// ---------- long recognition: poll about every 3 s until done or failed (handoff §8) ----------
const waitStarted = ref(0)
const now = ref(Date.now())
const recognising = computed(() => isRecognising(page.value?.status))
const elapsed = computed(() => waitStarted.value ? (now.value - waitStarted.value) / 1000 : 0)
const poll = usePolling(() => load(false), 3000, { immediate: false })
const clock = usePolling(() => {
  now.value = Date.now()
}, 1000, { immediate: false })
poll.stop()
clock.stop()
const recognitionNotice = ref('')
watch(recognising, (on, was) => {
  if (was && !on && page.value?.status === 'done') recognitionNotice.value = t('viewer.running.done')
  if (on) {
    recognitionNotice.value = ''
    if (!waitStarted.value) waitStarted.value = Date.now()
    now.value = Date.now()
    poll.start()
    clock.start()
  }
  else {
    poll.stop()
    clock.stop()
    waitStarted.value = 0
  }
}, { immediate: true })

watch([pageId, hl, fz], () => {
  poll.stop()
  waitStarted.value = 0
  void load(true)
}, { immediate: true })

// ---------- selection and edits ----------
const leaderAnimate = ref(false)
let animTimer: ReturnType<typeof setTimeout> | undefined
function select(id: number) {
  selectedId.value = id
  leaderAnimate.value = true
  clearTimeout(animTimer)
  animTimer = setTimeout(() => {
    leaderAnimate.value = false
  }, 160)
}

function setDraft(id: number, text: string) {
  const w = page.value?.words.find(x => x.id === id)
  if (!w) return
  const next = new Map(drafts.value)
  const value = text.trim()
  if (value === '' || value === w.text) next.delete(id)
  else next.set(id, value)
  drafts.value = next
}

const saving = ref(false)
async function save(): Promise<boolean> {
  if (!page.value || !dirty.value || saving.value) return !dirty.value
  saving.value = true
  try {
    const result = await api.pages.saveWords(page.value.id, edits.value)
    drafts.value = new Map()
    notify(result.cer === null || result.cer === undefined
      ? t('viewer.text.savedNoCer', { changed: result.changed })
      : t('viewer.text.saved', { changed: result.changed, cer: confPercent(result.cer, 3) }), 'success')
    await load(false)
    return true
  }
  catch {
    // useApi toasted the server's detail; the drafts stay so nothing typed is lost.
    return false
  }
  finally {
    saving.value = false
  }
}

function discard() {
  if (!dirty.value) return
  if (!window.confirm(t('viewer.text.discardConfirm'))) return
  drafts.value = new Map()
}

defineShortcuts({
  meta_s: {
    usingInput: true,
    handler: async () => {
      if (!editable.value) return
      // An open inline editor commits on blur; take its word into the save.
      const active = document.activeElement
      if (active instanceof HTMLInputElement && active.classList.contains('viewer-word-input')) active.blur()
      await nextTick()
      if (dirty.value) void save()
    },
  },
})

// Unsaved edits: confirm before leaving the page, switching leaf or closing the tab.
function confirmLeave(): boolean {
  return !dirty.value || window.confirm(t('viewer.text.leaveConfirm'))
}
onBeforeRouteLeave(() => confirmLeave())
onBeforeRouteUpdate((to, from) => {
  if (to.params.id !== from.params.id || to.query.hl !== from.query.hl) return confirmLeave()
  if (to.query.mode !== 'edit' && from.query.mode === 'edit' && dirty.value) {
    if (!window.confirm(t('viewer.text.discardConfirm'))) return false
    drafts.value = new Map()
  }
  return true
})
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!dirty.value) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  clearTimeout(animTimer)
})

// ---------- mode (EDITORS only) ----------
const modeItems = computed(() => [
  { label: t('viewer.text.modeView'), value: 'view' },
  { label: t('viewer.text.modeEdit'), value: 'edit' },
])
// Reka tabs fire the setter on focus and on click: ignore repeats while a switch is in flight, so the
// discard confirmation (onBeforeRouteUpdate) appears once.
// A cancelled switch also swallows the repeat that arrives from the same click (mousedown, then click).
let modeSwitching = false
let modeSettledAt = 0
const mode = computed({
  get: () => editable.value ? 'edit' : 'view',
  set: (value: string) => {
    if (modeSwitching || Date.now() - modeSettledAt < 400 || value === (editable.value ? 'edit' : 'view')) return
    const query = { ...route.query }
    if (value === 'edit') query.mode = 'edit'
    else delete query.mode
    modeSwitching = true
    void router.replace({ query }).finally(() => {
      modeSwitching = false
      modeSettledAt = Date.now()
    })
  },
})

// ---------- actions ----------
const reviewing = ref(false)
async function markReviewed() {
  if (!page.value || reviewing.value) return
  if (dirty.value && !(await save())) return
  reviewing.value = true
  try {
    const result = await api.pages.markReviewed(page.value.id)
    if (result.next_review_id !== null && result.next_review_id !== undefined) {
      notify(t('viewer.reviewed.next'), 'success')
      await navigateTo({ path: `/page/${result.next_review_id}`, query: editable.value ? { mode: 'edit' } : {} })
    }
    else {
      notify(t('viewer.reviewed.queueEmpty'), 'success')
      await load(false)
    }
  }
  catch {
    // toasted by useApi
  }
  finally {
    reviewing.value = false
  }
}

const retrying = ref(false)
async function retryPage() {
  if (!page.value || retrying.value) return
  const key = retryConfirmKey(dirty.value, page.value.words.some(w => w.corrected === 1))
  if (key && !window.confirm(t(key))) return
  retrying.value = true
  try {
    await api.pages.retry(page.value.id)
    notify(t('viewer.retry.queued'), 'info')
    drafts.value = new Map()
    await load(false)
  }
  catch {
    // toasted by useApi
  }
  finally {
    retrying.value = false
  }
}

async function exportPage(fmt: ExportFormat) {
  if (!page.value) return
  try {
    const name = await api.download(api.pages.exportUrl(page.value.id, fmt))
    notify(t('viewer.export.done', { name }), 'success')
  }
  catch {
    // toasted by useApi (a 404 keeps the server's detail)
  }
}

// ---------- panes and the leader line ----------
const pane = ref<'scan' | 'text'>('scan')
const paneItems = computed(() => [
  { label: t('viewer.panes.scan'), value: 'scan', icon: 'i-lucide-image' },
  { label: t('viewer.panes.text'), value: 'text', icon: 'i-lucide-text' },
])
watch(pane, (value) => {
  nextTick(() => {
    const id = selectedId.value
    if (id === null) return
    if (value === 'text') textPane.value?.revealWord(id, false)
    else scanPane.value?.revealSelected(false)
    scheduleLeader()
  })
})
const isDesktop = ref(true)
let mql: MediaQueryList | null = null
function onMql() {
  isDesktop.value = !!mql?.matches
  scheduleLeader()
}

const work = useTemplateRef<HTMLElement>('work')
const scanPane = useTemplateRef<{ viewport: HTMLElement | null, boxEl: (id: number) => HTMLElement | null, revealSelected: (smooth?: boolean) => void }>('scanPane')
const textPane = useTemplateRef<{ viewport: HTMLElement | null, wordEl: (id: number) => HTMLElement | null, root: HTMLElement | null, revealWord: (id: number, smooth?: boolean) => void }>('textPane')
const leader = ref<LeaderGeometry | null>(null)

function inside(r: DOMRect, v: DOMRect) {
  return r.bottom > v.top && r.top < v.bottom && r.right > v.left && r.left < v.right
}

function updateLeader() {
  const id = selectedId.value
  const w = work.value
  if (id === null || !w || !isDesktop.value) {
    leader.value = null
    return
  }
  const box = scanPane.value?.boxEl(id)
  const word = textPane.value?.wordEl(id)
  const sv = scanPane.value?.viewport
  const tv = textPane.value?.viewport
  const tRoot = textPane.value?.root
  if (!box || !word || !sv || !tv || !tRoot) {
    leader.value = null
    return
  }
  const br = box.getBoundingClientRect()
  const wr = word.getBoundingClientRect()
  const svr = sv.getBoundingClientRect()
  const tvr = tv.getBoundingClientRect()
  if (!inside(br, svr) || !inside(wr, tvr)) {
    leader.value = null
    return
  }
  const origin = w.getBoundingClientRect()
  const scanRight = svr.right - origin.left
  const textLeft = tRoot.getBoundingClientRect().left - origin.left
  const x1 = Math.min(br.right - origin.left, scanRight - 6)
  const y1 = br.top + br.height / 2 - origin.top
  const yUnder = Math.min(br.bottom - origin.top + 4, svr.bottom - origin.top - 2)
  leader.value = {
    x1,
    y1,
    yUnder: Math.max(y1, yUnder),
    gx: (scanRight + textLeft) / 2,
    x2: textLeft,
    y2: wr.top + wr.height / 2 - origin.top,
  }
}

let leaderRaf = 0
function scheduleLeader() {
  if (leaderRaf) return
  leaderRaf = requestAnimationFrame(() => {
    leaderRaf = 0
    updateLeader()
  })
}
watch([selectedId, page, () => drafts.value, editable], () => nextTick(scheduleLeader))

onMounted(() => {
  mql = window.matchMedia('(min-width: 1024px)')
  onMql()
  mql.addEventListener('change', onMql)
  window.addEventListener('resize', scheduleLeader)
})
onBeforeUnmount(() => {
  mql?.removeEventListener('change', onMql)
  window.removeEventListener('resize', scheduleLeader)
  cancelAnimationFrame(leaderRaf)
})

const selectedOcr = computed(() => {
  const w = selectedWord.value
  if (!w) return null
  const current = drafts.value.get(w.id) ?? w.text
  return current !== w.ocr_text ? w.ocr_text : null
})
</script>

<template>
  <div class="flex min-h-full flex-col gap-4 lg:h-full lg:min-h-0">
    <p
      role="status"
      aria-live="polite"
      class="sr-only"
    >
      {{ recognitionNotice }}
    </p>
    <!-- Loading -->
    <template v-if="loading && !page">
      <div
        class="flex flex-col gap-3 rounded-lg bg-default p-5 ring-1 ring-default"
        role="status"
        :aria-label="t('viewer.loading')"
      >
        <USkeleton class="h-10 w-96 max-w-full" />
        <USkeleton class="h-7 w-[32rem] max-w-full" />
      </div>
      <div class="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
        <USkeleton class="h-96 lg:h-full" />
        <USkeleton class="hidden h-full lg:block" />
      </div>
    </template>

    <template v-else-if="page">
      <ViewerContext
        :page="page"
        :threshold="threshold"
        :low-count="lowCount"
        :can-review="auth.isEditor"
        :can-retry="auth.isStaff"
        :reviewing="reviewing"
        :retrying="retrying"
        :nav-query="navQuery"
        @export="exportPage"
        @reviewed="markReviewed"
        @retry="retryPage"
      />

      <ViewerRecognition
        v-if="recognising || page.status === 'failed'"
        :status="page.status"
        :elapsed="elapsed"
        :can-retry="auth.isStaff"
        :retrying="retrying"
        @retry="retryPage"
      />

      <template v-else>
        <UTabs
          v-model="pane"
          :items="paneItems"
          :content="false"
          :aria-label="t('viewer.panes.label')"
          class="lg:hidden"
          :ui="{ list: 'w-full', trigger: 'flex-1 justify-center' }"
        />

        <div
          ref="work"
          class="relative grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]"
        >
          <ViewerScanPane
            ref="scanPane"
            :class="['max-lg:h-[75svh]', pane !== 'scan' && 'max-lg:hidden']"
            :page-id="page.id"
            :leaf="page.leaf"
            :width="page.width"
            :height="page.height"
            :words="page.words"
            :selected-id="selectedId"
            :hits="hits"
            :drafts="drafts"
            :threshold="threshold"
            @select="select"
            @leader-change="scheduleLeader"
          />

          <ViewerTextPane
            ref="textPane"
            :class="[pane !== 'text' && 'max-lg:hidden']"
            :lines="lines"
            :order="order"
            :selected-id="selectedId"
            :hits="hits"
            :drafts="drafts"
            :threshold="threshold"
            :lang="page.lang"
            :editable="editable"
            @select="select"
            @edit="setDraft"
            @leader-change="scheduleLeader"
          >
            <template
              v-if="auth.isEditor"
              #mode
            >
              <UTabs
                v-model="mode"
                :items="modeItems"
                :content="false"
                :aria-label="t('viewer.text.modeLabel')"
                activation-mode="manual"
                size="md"
                :ui="{ trigger: 'min-h-9' }"
              />
            </template>
            <template #footer>
              <div class="flex min-h-13 flex-wrap items-center gap-x-4 gap-y-2 border-t border-default bg-elevated/50 px-4 py-2 text-[13px]">
                <p
                  v-if="selectedWord"
                  class="flex min-w-0 flex-wrap items-baseline gap-x-2"
                >
                  <span class="text-muted">{{ t('viewer.text.selected') }}</span>
                  <b
                    class="font-semibold text-highlighted"
                    :dir="page.lang === 'kk-arab' ? 'rtl' : 'auto'"
                  >{{ drafts.get(selectedWord.id) ?? selectedWord.text }}</b>
                  <span
                    v-if="selectedOcr"
                    class="text-muted"
                    dir="auto"
                  >{{ t('viewer.text.ocrWas', { text: selectedOcr }) }}</span>
                  <span class="text-muted tabular-nums">· {{ t('viewer.text.selectedConf', { value: confPercent(Math.floor(selectedWord.conf)) }) }}</span>
                </p>
                <p
                  v-else
                  class="text-muted"
                >
                  {{ t('viewer.text.selectHint') }}
                </p>
                <p class="ms-auto text-muted">
                  {{ editable ? t('viewer.text.hintsEdit') : t('viewer.text.hintsView') }}
                </p>
                <div
                  v-if="editable"
                  class="ms-auto flex flex-wrap items-center justify-end gap-2"
                >
                  <span
                    v-if="dirty"
                    class="font-medium text-highlighted tabular-nums"
                  >{{ t('viewer.text.changed', { count: edits.length }) }}</span>
                  <UButton
                    v-if="dirty"
                    color="neutral"
                    variant="ghost"
                    :label="t('viewer.text.discard')"
                    @click="discard"
                  />
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-save"
                    :disabled="!dirty"
                    :loading="saving"
                    :label="saving ? t('viewer.text.saving') : t('viewer.text.save')"
                    @click="save"
                  >
                    <template #trailing>
                      <UKbd
                        value="meta"
                        size="sm"
                      /><UKbd
                        value="S"
                        size="sm"
                      />
                    </template>
                  </UButton>
                </div>
              </div>
            </template>
          </ViewerTextPane>

          <ViewerLeader
            class="max-lg:hidden"
            :geometry="leader"
            :animate="leaderAnimate"
          />
        </div>
      </template>
    </template>
  </div>
</template>
