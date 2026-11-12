import { translate } from '~/composables/useT'

/**
 * Handoff §3 error mapping. Bodies are {"detail": "<ready Russian message>"}.
 * 404 means "not found" or "hidden by access rules"; the UI treats both the same.
 */
export type ApiErrorKind
  = | 'unauthorized' // 401: go to /login?next=
    | 'forbidden' // 403: «Нет доступа»
    | 'notFound' // 404: not found or hidden
    | 'validation' // 400 / 422: show detail
    | 'unsupported' // 415: no preview
    | 'unavailable' // 503: mock ЕАИС outage
    | 'server' // other 4xx/5xx
    | 'network' // no response at all

export class ApiError extends Error {
  readonly status: number | null
  readonly kind: ApiErrorKind
  /** The server's detail string when it sent one. */
  readonly detail: string | null

  constructor(status: number | null, kind: ApiErrorKind, message: string, detail: string | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
    this.detail = detail
  }
}

export function kindForStatus(status: number | null | undefined): ApiErrorKind {
  if (status === null || status === undefined || status === 0) return 'network'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notFound'
  if (status === 400 || status === 422) return 'validation'
  if (status === 415) return 'unsupported'
  if (status === 503) return 'unavailable'
  return 'server'
}

/** The `detail` string, if the body has one. FastAPI 422 sends an array, which is not user copy. */
export function detailOf(data: unknown): string | null {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return null
}

export function toApiError(status: number | null | undefined, data: unknown): ApiError {
  const kind = kindForStatus(status)
  const detail = detailOf(data)
  let message: string
  if (kind === 'network') message = translate('errors.network')
  else if (detail) message = detail
  else if (kind === 'forbidden') message = translate('errors.forbiddenBody')
  else if (kind === 'notFound') message = translate('errors.notFound')
  else if (kind === 'validation') message = translate('errors.validation')
  else message = translate('errors.status', { status: status ?? 0 })
  return new ApiError(status ?? null, kind, message, detail)
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
