<script setup lang="ts">
import type { FileStatus, M1File, Workplace } from '~/types/api'
import type { CaseCheckState, ShifrInput } from '~/composables/useOps'
import { errorText, OPS_POLL_MS, shifrErrors, uploadFilesWithProgress } from '~/composables/useOps'
import { useAuthStore } from '~/stores/auth'
import { useQueueStore } from '~/stores/queue'
import { ACCESS } from '~/utils/access'
import { isApiError } from '~/utils/api-error'
import { FILE_STATUS } from '~/utils/status'

// Загрузка и очередь (handoff §6 #3; surface brief app-pages-upload-vue). STAFF only.
definePageMeta({ roles: ACCESS.upload, title: 'pages.upload' })

const { t } = useT()
const api = useApi()
const route = useRoute()
const router = useRouter()
const { notify } = useNotify()

// ---------- upload form ----------
// The last scanner choice survives a reload within the tab (not a secret, so sessionStorage is fine).
const WORKPLACE_KEY = 'upload.workplace'
const storedWorkplace = sessionStorage.getItem(WORKPLACE_KEY)
const workplace = ref<Workplace>(storedWorkplace === 'ws2' ? 'ws2' : 'ws1')
watch(workplace, w => sessionStorage.setItem(WORKPLACE_KEY, w))
const shifr = ref<ShifrInput>({ fond: '', opis: '', delo: '' })
const showRequired = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const uploadError = ref<string | null>(null)
const caseCheck = ref<CaseCheckState>({ state: 'idle' })
const confirmOpen = ref(false)
const pendingFiles = ref<File[]>([])
const saved = ref<{ names: string[], workplace: Workplace } | null>(null)

const workplaceItems = computed(() => [
  { label: t('upload.workplaces.ws1'), value: 'ws1' },
  { label: t('upload.workplaces.ws2'), value: 'ws2' },
])
const shifrInvalid = computed(() => Object.keys(shifrErrors(shifr.value, false)).length > 0)
const shifrGiven = computed(() => [shifr.value.fond, shifr.value.opis, shifr.value.delo].some(v => v.trim() !== ''))

function pick() {
  fileInput.value?.click()
}

function onPicked(e: Event) {
  const input = e.target as HTMLInputElement
  send(Array.from(input.files ?? []))
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  send(Array.from(e.dataTransfer?.files ?? []))
}

/** Only a file name is shown, never a path (handoff §4): the saved relpath keeps its last segment. */
function baseName(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

function send(files: File[]) {
  if (!files.length || uploading.value) return
  if (shifrInvalid.value) {
    showRequired.value = true
    uploadError.value = t('upload.shifrIncomplete')
    return
  }
  // A case ЕАИС does not know: the files would fail later with that reason, so ask first.
  if (caseCheck.value.state === 'notFound') {
    pendingFiles.value = files
    confirmOpen.value = true
    return
  }
  void upload(files)
}

function confirmSend() {
  confirmOpen.value = false
  void upload(pendingFiles.value)
  pendingFiles.value = []
}

async function upload(files: File[]) {
  uploading.value = true
  progress.value = 0
  uploadError.value = null
  saved.value = null
  try {
    const r = await uploadFilesWithProgress(files, workplace.value, shifrGiven.value ? shifr.value : null, (f) => {
      progress.value = Math.round(f * 100)
    })
    saved.value = { names: r.saved.map(baseName), workplace: r.workplace }
    notify(t('upload.sentToast'), 'success')
    void loadFiles()
    void useQueueStore().refresh().catch(() => {})
  }
  catch (e) {
    if (isApiError(e) && e.kind === 'unauthorized') {
      // Same as the shared client's 401 path: drop the session, then /login?next=.
      useAuthStore().clear()
      await navigateTo({ path: '/login', query: { next: route.fullPath } }, { replace: true })
      return
    }
    uploadError.value = errorText(e) ?? t('upload.failed')
    notify(uploadError.value, 'error')
  }
  finally {
    uploading.value = false
  }
}

// ---------- queue ----------
const STATUSES = Object.keys(FILE_STATUS) as FileStatus[]
function statusFromQuery(v: unknown): FileStatus | 'all' {
  return typeof v === 'string' && (STATUSES as string[]).includes(v) ? v as FileStatus : 'all'
}

const status = ref<FileStatus | 'all'>(statusFromQuery(route.query.status))
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const files = ref<M1File[] | null>(null)
const filesLoading = ref(true)
const filesError = ref<string | null>(null)
const sending = ref<number | null>(null)
// Rows that appeared after the first load of the current filter: highlighted. null = not loaded yet.
let seen: Set<number> | null = null
const fresh = ref<ReadonlySet<number>>(new Set())

const statusItems = computed(() => [
  { label: t('upload.queue.allStatuses'), value: 'all' },
  ...STATUSES.map(s => ({ label: t(FILE_STATUS[s].label), value: s })),
])

let seq = 0
async function loadFiles() {
  const mine = ++seq
  try {
    const rows = await api.m1.files({ status: status.value === 'all' ? '' : status.value, q: q.value.trim() }, 'background')
    if (mine !== seq) return
    files.value = rows
    filesError.value = null
    if (seen) {
      const added = rows.filter(r => !seen!.has(r.id)).map(r => r.id)
      if (added.length) fresh.value = new Set([...fresh.value, ...added])
    }
    seen = new Set(rows.map(r => r.id))
  }
  catch (e) {
    if (mine === seq) filesError.value = errorText(e) ?? t('upload.queue.loadError')
  }
  finally {
    if (mine === seq) filesLoading.value = false
  }
}

const polling = usePolling(loadFiles, OPS_POLL_MS)

// Filters live in the URL so the ops tiles can link here (/upload?status=retry).
let debounce: ReturnType<typeof setTimeout> | null = null
function resetFresh() {
  seen = null
  fresh.value = new Set()
}
watch(status, (s) => {
  resetFresh()
  void router.replace({ query: { ...route.query, status: s === 'all' ? undefined : s } })
  filesLoading.value = true
  void loadFiles()
})
watch(q, (value) => {
  resetFresh()
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    void router.replace({ query: { ...route.query, q: value.trim() || undefined } })
    void loadFiles()
  }, 300)
})
onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce)
})
// The tiles link here with a different ?status while this screen is open.
watch(() => route.query.status, (v) => {
  status.value = statusFromQuery(v)
})

async function sendNow(f: M1File) {
  sending.value = f.id
  try {
    await api.m1.retryFile(f.id)
    notify(t('upload.sendNowDone'), 'success')
    void useQueueStore().refresh().catch(() => {})
    await loadFiles()
  }
  catch {
    // The shared client already showed the server's detail as a toast.
  }
  finally {
    sending.value = null
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] flex-col gap-6">
    <h1 class="sr-only">
      {{ t('pages.upload') }}
    </h1>

    <section
      class="grid gap-6 rounded-lg bg-default p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      aria-labelledby="upload-title"
    >
      <div class="flex flex-col gap-5">
        <h2
          id="upload-title"
          class="text-lg font-semibold text-highlighted"
        >
          {{ t('upload.title') }}
        </h2>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-sm font-medium text-default">
            {{ t('upload.shifrTitle') }}
          </legend>
          <p class="mb-1 text-[13px] text-muted">
            {{ t('upload.shifrHint') }}
          </p>
          <OpsShifrFields
            v-model="shifr"
            :show-required="showRequired"
            @check="caseCheck = $event"
          />
        </fieldset>

        <UFormField
          :label="t('upload.workplace')"
          :description="t('upload.workplaceHint')"
        >
          <URadioGroup
            v-model="workplace"
            :items="workplaceItems"
            orientation="horizontal"
            :ui="{ fieldset: 'gap-x-6' }"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-3">
        <div
          class="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors"
          :class="dragging ? 'border-primary bg-primary/5' : 'border-accented bg-muted'"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <UIcon
            name="i-lucide-upload"
            class="size-8 text-muted"
            aria-hidden="true"
          />
          <p class="text-base font-medium text-highlighted">
            {{ dragging ? t('upload.drop.active') : t('upload.drop.title') }}
          </p>
          <p class="text-sm text-muted">
            {{ t('upload.drop.or') }}
          </p>
          <UButton
            icon="i-lucide-folder-open"
            :label="t('upload.drop.pick')"
            :loading="uploading"
            @click="pick"
          />
          <p class="text-[13px] text-muted">
            {{ t('upload.drop.formats') }}
          </p>
          <input
            ref="fileInput"
            type="file"
            multiple
            accept=".tif,.tiff,.jpg,.jpeg,.png,.pdf"
            class="hidden"
            tabindex="-1"
            :aria-label="t('upload.drop.pick')"
            @change="onPicked"
          >
        </div>

        <div
          v-if="uploading"
          class="flex flex-col gap-1.5"
        >
          <UProgress
            v-model="progress"
            :max="100"
            :aria-label="t('upload.progressLabel')"
            :ui="{ base: 'bg-meter-track' }"
          />
          <p class="text-[13px] text-muted tabular-nums">
            {{ t('upload.progress', { percent: progress }) }}
          </p>
        </div>

        <div
          role="status"
          class="flex flex-col gap-2"
        >
          <UAlert
            v-if="uploadError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="uploadError"
          />
          <div
            v-else-if="saved"
            class="flex flex-col gap-2 rounded-md bg-elevated p-3 text-sm"
          >
            <p class="flex items-center gap-1.5 font-medium text-success">
              <UIcon
                name="i-lucide-circle-check"
                class="size-4"
                aria-hidden="true"
              />
              {{ t('upload.sent', { count: saved.names.length }) }}
            </p>
            <p class="text-[13px] text-muted">
              {{ t('upload.sentTo', { workplace: saved.workplace }) }}
            </p>
            <p class="text-[13px] text-default">
              {{ t('upload.sentNext') }}
            </p>
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="(name, i) in saved.names"
                :key="i"
              >
                <UBadge
                  color="neutral"
                  variant="outline"
                  :label="name"
                />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section
      class="flex flex-col gap-3"
      aria-labelledby="queue-title"
    >
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2
          id="queue-title"
          class="text-lg font-semibold text-highlighted"
        >
          {{ t('upload.queue.title') }}
        </h2>
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="status"
            :items="statusItems"
            :aria-label="t('upload.queue.status')"
            class="w-44"
          />
          <UInput
            v-model="q"
            type="search"
            icon="i-lucide-search"
            :placeholder="t('upload.queue.search')"
            :aria-label="t('upload.queue.searchLabel')"
            class="w-72"
          />
        </div>
      </div>
      <p
        v-if="files"
        class="text-sm text-muted tabular-nums"
      >
        {{ t('upload.queue.count', { count: files.length }) }}
      </p>

      <UAlert
        v-if="filesError && !files"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="filesError"
        :actions="[{ label: t('ops.reload'), color: 'neutral', variant: 'outline', onClick: () => polling.trigger() }]"
      />
      <OpsFilesTable
        v-else
        :rows="files"
        :loading="filesLoading"
        :filtered="status !== 'all' || q.trim() !== ''"
        :sending="sending"
        :fresh="fresh"
        @send-now="sendNow"
      />
    </section>

    <UModal
      v-model:open="confirmOpen"
      :title="t('upload.confirmNotFound.title')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm text-default">
          {{ t('upload.confirmNotFound.body', { fond: shifr.fond.trim(), opis: shifr.opis.trim(), delo: shifr.delo.trim() }) }}
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          :label="t('upload.confirmNotFound.back')"
          @click="confirmOpen = false"
        />
        <UButton
          icon="i-lucide-upload"
          :label="t('upload.confirmNotFound.submit')"
          @click="confirmSend"
        />
      </template>
    </UModal>
  </div>
</template>
