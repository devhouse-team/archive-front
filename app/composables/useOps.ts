import { onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { CheckCaseResult, JournalResult, M1File, UploadResult, Workplace } from '~/types/api'
import type { ApiError } from '~/utils/api-error'
import { isApiError, toApiError } from '~/utils/api-error'
import type { ShifrParts } from '~/utils/shifr'

// Stage 7 (M1 operator screens): pure helpers and small composables for /ops, /upload, /errors, /journal.

/** Poll interval for the queue, the file list and the error list while an ops screen is mounted (handoff §4). */
export const OPS_POLL_MS = 5000

/** Handoff §9: a resend cannot fix a blank, black or low-resolution scan, so «Отправить повторно» is hidden. */
export const NO_RESEND_PREFIXES = ['Пустая', 'Чёрная', 'Разрешение'] as const

export function canResend(reason: string | null | undefined): boolean {
  const r = (reason ?? '').trim()
  return !NO_RESEND_PREFIXES.some(p => r.startsWith(p))
}

/** Шифр parts are digits only (handoff §5.2). An empty string is "not given", not invalid. */
export function isDigits(value: string): boolean {
  return /^\d+$/.test(value)
}

export interface ShifrInput {
  fond: string
  opis: string
  delo: string
  leaf?: string
}

export type ShifrField = keyof ShifrInput
export type ShifrFieldErrors = Partial<Record<ShifrField, 'digits' | 'required'>>

/**
 * Field errors for a шифр form.
 * @param required true when fond/opis/delo must be filled (Исправить шифр); false when the whole шифр is optional
 *   (upload), in which case it is all-or-nothing.
 */
export function shifrErrors(input: ShifrInput, required: boolean): ShifrFieldErrors {
  const out: ShifrFieldErrors = {}
  const main = ['fond', 'opis', 'delo'] as const
  for (const k of [...main, 'leaf'] as ShifrField[]) {
    const v = (input[k] ?? '').trim()
    if (v && !isDigits(v)) out[k] = 'digits'
  }
  const filled = main.filter(k => input[k].trim() !== '')
  if (required || filled.length > 0) {
    for (const k of main) {
      if (!out[k] && input[k].trim() === '') out[k] = 'required'
    }
  }
  return out
}

/** All three main parts present and numeric. */
export function shifrComplete(input: ShifrInput): boolean {
  return (['fond', 'opis', 'delo'] as const).every(k => isDigits(input[k].trim()))
}

/** Шифр parts of a file row, or null when the backend has none (invalid files, handoff §9). */
export function fileShifr(file: Pick<M1File, 'fond' | 'opis' | 'delo' | 'leaf_start'>): ShifrParts | null {
  if (file.fond == null || file.opis == null || file.delo == null) return null
  return { fond: file.fond, opis: file.opis, delo: file.delo, leaf: file.leaf_start }
}

/** Period keys from /api/m1/stats: «2026-11-12» → «12.11», «2026-11» → «11.2026». */
export function periodLabel(period: string): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period)
  if (day) return `${day[3]}.${day[2]}`
  const month = /^(\d{4})-(\d{2})$/.exec(period)
  if (month) return `${month[2]}.${month[1]}`
  return period
}

export const JOURNAL_RESULT: Record<JournalResult, { color: 'success' | 'error' | 'neutral', icon: string }> = {
  ok: { color: 'success', icon: 'i-lucide-check' },
  error: { color: 'error', icon: 'i-lucide-circle-alert' },
  info: { color: 'neutral', icon: 'i-lucide-info' },
}

export type CaseCheckState
  = | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'found', title: string }
    | { state: 'notFound' }
    | { state: 'down', detail: string | null }
    | { state: 'failed' }

export function caseCheckFromResult(r: CheckCaseResult): CaseCheckState {
  if (r.found === null) return { state: 'down', detail: r.detail ?? null }
  if (r.found) return { state: 'found', title: r.title ?? '' }
  return { state: 'notFound' }
}

/**
 * Live «Дело в ЕАИС: …» check. Runs, debounced, whenever the шифр becomes complete; idle otherwise.
 * A stale answer (the user kept typing) is dropped.
 */
export function useCaseCheck(input: MaybeRefOrGetter<ShifrInput>, delay = 350) {
  const api = useApi()
  const result = ref<CaseCheckState>({ state: 'idle' })
  let timer: ReturnType<typeof setTimeout> | null = null
  let seq = 0

  function clear() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  watch(() => {
    const s = toValue(input)
    return shifrComplete(s) ? `${s.fond.trim()}/${s.opis.trim()}/${s.delo.trim()}` : ''
  }, (key) => {
    clear()
    const mine = ++seq
    if (!key) {
      result.value = { state: 'idle' }
      return
    }
    result.value = { state: 'checking' }
    timer = setTimeout(async () => {
      const [fond, opis, delo] = key.split('/').map(Number) as [number, number, number]
      try {
        const r = await api.m1.checkCase(fond, opis, delo)
        if (mine === seq) result.value = caseCheckFromResult(r)
      }
      catch {
        if (mine === seq) result.value = { state: 'failed' }
      }
    }, delay)
  }, { immediate: true })

  onScopeDispose(() => {
    clear()
    seq++
  })

  return { result }
}

/**
 * POST /api/upload with upload progress (the shared client uses $fetch, which has none).
 * Same-origin XHR sends the session cookie; nothing is stored client-side.
 * Rejects with an ApiError built by the shared §3 mapping.
 */
export function uploadFilesWithProgress(
  files: File[],
  workplace: Workplace,
  shifr: ShifrInput | null,
  onProgress: (fraction: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    form.append('workplace', workplace)
    if (shifr) {
      form.append('fond', shifr.fond.trim())
      form.append('opis', shifr.opis.trim())
      form.append('delo', shifr.delo.trim())
    }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.withCredentials = false
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      let data: unknown
      try {
        data = JSON.parse(xhr.responseText)
      }
      catch {
        data = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data as UploadResult)
      else reject(toApiError(xhr.status, data))
    }
    xhr.onerror = () => reject(toApiError(null, undefined))
    xhr.send(form)
  })
}

/** Error message for an inline error state. */
export function errorText(e: unknown): string | null {
  return isApiError(e) ? (e as ApiError).message : null
}
