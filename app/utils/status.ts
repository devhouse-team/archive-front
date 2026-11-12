import type { MessageKey } from '~/composables/useT'
import type { FileStatus, Flag, Lang, PageStatus } from '~/types/api'

// Spec 2 §Status mapping (handoff §4). Every status badge is `variant="soft"`.

export type StatusColor = 'neutral' | 'warning' | 'success' | 'error'

export interface StatusView {
  label: MessageKey
  color: StatusColor
  /** Spinner for work in progress (pages.running). */
  icon?: string
}

const SPINNER = 'i-lucide-loader-circle'

export const FILE_STATUS: Record<FileStatus, StatusView> = {
  queued: { label: 'status.file.queued', color: 'neutral' },
  retry: { label: 'status.file.retry', color: 'warning' },
  uploaded: { label: 'status.file.uploaded', color: 'success' },
  invalid: { label: 'status.file.invalid', color: 'error' },
}

export const PAGE_STATUS: Record<PageStatus, StatusView> = {
  pending: { label: 'status.page.pending', color: 'neutral' },
  running: { label: 'status.page.running', color: 'neutral', icon: SPINNER },
  done: { label: 'status.page.done', color: 'success' },
  failed: { label: 'status.page.failed', color: 'error' },
}

export const REVIEW_STATUS = {
  pending: { label: 'status.review.pending', color: 'warning' },
  reviewed: { label: 'status.review.reviewed', color: 'success' },
} as const satisfies Record<string, StatusView>

/**
 * The review layer on top of a done page: «на проверке» when low_conf=1 and reviewed=0, «проверено» when reviewed=1.
 * The UI never recomputes low_conf (spec 2 §Confidence semantics).
 */
export function reviewStatus(page: { status: PageStatus, low_conf: Flag, reviewed: Flag }): StatusView | null {
  if (page.status !== 'done') return null
  if (page.reviewed === 1) return REVIEW_STATUS.reviewed
  if (page.low_conf === 1) return REVIEW_STATUS.pending
  return null
}

export const LANGS: readonly Lang[] = ['ru', 'kk-cyrl', 'kk-latn', 'kk-arab']
