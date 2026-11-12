import type { Health, WorkerHeartbeat } from '~/types/api'
import { translate } from '~/composables/useT'
import { formatDuration } from '~/utils/format'

// The header ЕАИС indicator (handoff §4, §6; spec 2 §Status mapping). Pure, so it can be tested without the shell.

export type EaisState = 'online' | 'down' | 'unknown'
export type WorkerId = keyof Health['workers']

export const WORKER_IDS: readonly WorkerId[] = ['watcher', 'upload', 'ocr']

export interface WorkerView {
  id: WorkerId
  ok: boolean
  /** «работает», «нет сигнала 2:15» or «нет сигнала». */
  status: string
}

export interface EaisView {
  state: EaisState
  /** «ЕАИС на связи» / «ЕАИС недоступна» / «ЕАИС: нет данных». */
  label: string
  /** «Повтор через 0:42», «Повтор сейчас», or null when no automatic retry is scheduled. */
  retry: string | null
  /** The bare countdown «0:42» for narrow headers (the full phrase sits in the STAFF popover). */
  retryShort: string | null
  workers: WorkerView[]
  diskLow: boolean
  /** Workers with ok: false, plus one for a low disk. STAFF see this on the indicator. */
  problems: number
}

/** «Повтор через m:ss»; at zero the retry is due now. */
export function retryLabel(seconds: number | null): string | null {
  if (seconds === null) return null
  return seconds <= 0 ? translate('eais.retryNow') : translate('eais.retryIn', { time: formatDuration(seconds) })
}

function workerStatus(w: WorkerHeartbeat): string {
  if (w.ok) return translate('eais.workers.ok')
  if (w.age_s === null) return translate('eais.workers.never')
  return translate('eais.workers.stale', { age: formatDuration(w.age_s) })
}

/**
 * @param health the last /api/health answer (null before the first one)
 * @param retryIn seconds to the next automatic retry, ticking locally between polls (health store)
 */
export function eaisView(health: Health | null, retryIn: number | null): EaisView {
  if (!health) {
    return { state: 'unknown', label: translate('eais.unknown'), retry: null, retryShort: null, workers: [], diskLow: false, problems: 0 }
  }
  const workers = WORKER_IDS
    .filter(id => health.workers?.[id])
    .map(id => ({ id, ok: health.workers[id].ok, status: workerStatus(health.workers[id]) }))
  const problems = workers.filter(w => !w.ok).length + (health.disk_low ? 1 : 0)
  return {
    state: health.eais_online ? 'online' : 'down',
    label: translate(health.eais_online ? 'eais.online' : 'eais.down'),
    retry: retryLabel(retryIn),
    retryShort: retryIn === null ? null : formatDuration(retryIn),
    workers,
    diskLow: health.disk_low,
    problems,
  }
}
