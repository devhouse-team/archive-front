import type {
  AdminUser, CheckCaseResult, CollectionDetail, CollectionExportFormat, CollectionSummary, CreateUserBody,
  DeloDetail, DeloSnippet, DeloSummary, EaisCase, EaisCaseRow, EaisStatus, EaisSwitchResult, ExportFormat, Facets,
  Fuzzy, Health, HistoryItem, JournalResult, JournalRow, LoginBody, M1File, NotificationsResponse, OcrLang, Ok,
  PageDetail, QueueCounters, ReocrResult, ReviewedResult, ReviewItem, SavedQuery, SaveQueryBody, SaveWordsResult,
  SearchParams, SearchResponse, ShifrBody, StatsRow, UpdateUserBody, UploadResult, User, WordEdit, Workplace,
  FileStatus,
} from '~/types/api'
import { toApiError } from '~/utils/api-error'
import { translate } from '~/composables/useT'
import type { ApiError } from '~/utils/api-error'
import { filenameFromDisposition } from '~/utils/content-disposition'
import { useAuthStore } from '~/stores/auth'

/**
 * How a failed request surfaces (handoff §3):
 * - 'page': 403/404 replace the screen with «Нет доступа» / not found. Default for GET.
 * - 'toast': every error becomes a toast with `detail`. Default for mutations.
 * - 'background': only a 401 acts (session gone → /login?next=); everything else stays quiet. For polling.
 * - 'silent': no side effects at all; the caller handles the ApiError (the session check, the login form).
 * In 'page', 'toast' and 'background' mode a 401 sends the user to /login?next=<current>; in 'page' and
 * 'toast' mode 400 and others toast.
 */
export type ErrorMode = 'page' | 'toast' | 'background' | 'silent'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'
type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: Method
  query?: Query
  body?: unknown
  errorMode?: ErrorMode
}

/** A $fetch-compatible function: resolves with the parsed body, rejects with an error carrying status/data. */
export type Fetcher = (url: string, options: {
  method: Method
  query?: Query
  body?: unknown
  credentials: RequestCredentials
}) => Promise<unknown>

export interface ApiDeps {
  fetcher: Fetcher
  /** Raw fetch for downloads (needs headers and a Blob). */
  rawFetch?: typeof fetch
  onUnauthorized: () => void
  onPageError: (error: ApiError) => void
  onToast: (message: string) => void
  /** Saves a Blob to disk. */
  saveBlob?: (blob: Blob, filename: string) => void
}

function statusOf(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const e = error as { status?: unknown, statusCode?: unknown, response?: { status?: unknown } }
    const status = e.status ?? e.statusCode ?? e.response?.status
    if (typeof status === 'number' && status > 0) return status
  }
  return null
}

function dataOf(error: unknown): unknown {
  if (error && typeof error === 'object' && 'data' in error) return (error as { data: unknown }).data
  return undefined
}

function cleanQuery(query?: Query): Query | undefined {
  if (!query) return undefined
  const out: Query = {}
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}

function withQuery(path: string, query?: Query): string {
  const q = cleanQuery(query)
  if (!q || Object.keys(q).length === 0) return path
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) params.set(k, String(v))
  return `${path}?${params.toString()}`
}

export function createApiClient(deps: ApiDeps) {
  /**
   * Apply the §3 mapping for one failed request, then return the error for the caller to throw.
   * `keepNotFoundDetail`: show the server's 404 detail instead of the generic copy (downloads only, see download()).
   */
  function handle(error: ApiError, path: string, mode: ErrorMode, keepNotFoundDetail = false): ApiError {
    if (mode === 'silent') return error
    if (error.kind === 'unauthorized' && path !== '/api/login') {
      deps.onUnauthorized()
      return error
    }
    if (mode === 'background') return error
    if (mode === 'page' && (error.kind === 'forbidden' || error.kind === 'notFound')) {
      deps.onPageError(error)
      return error
    }
    // 404 means "not found or hidden by access rules" (handoff §2-3). The server's detail tells those apart
    // («Дело не найдено» for a hidden case), so a 404 toast uses the same generic copy, except for downloads.
    deps.onToast(error.kind === 'notFound' && !keepNotFoundDetail ? translate('errors.notFound') : error.message)
    return error
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET'
    const mode = options.errorMode ?? (method === 'GET' ? 'page' : 'toast')
    try {
      return await deps.fetcher(path, {
        method,
        query: cleanQuery(options.query),
        body: options.body,
        credentials: 'same-origin',
      }) as T
    }
    catch (e) {
      throw handle(toApiError(statusOf(e), dataOf(e)), path, mode)
    }
  }

  const get = <T>(path: string, query?: Query, errorMode?: ErrorMode) => request<T>(path, { query, errorMode })
  const post = <T>(path: string, body?: unknown, errorMode?: ErrorMode) => request<T>(path, { method: 'POST', body, errorMode })
  const patch = <T>(path: string, body?: unknown, errorMode?: ErrorMode) => request<T>(path, { method: 'PATCH', body, errorMode })
  const del = <T>(path: string, errorMode?: ErrorMode) => request<T>(path, { method: 'DELETE', errorMode })

  /**
   * Download a file response (exports). Reads the name from Content-Disposition (filename*=UTF-8''…).
   * Errors follow the same mapping; default mode is 'toast' because a download is an action.
   * A 404 here keeps the server's detail (e.g. «Нет распознанных страниц»): downloads are only offered for
   * objects already on screen, so the detail cannot reveal a hidden case (Stage 3 review round 2 #2).
   */
  async function download(url: string, errorMode: ErrorMode = 'toast'): Promise<string> {
    const doFetch = deps.rawFetch ?? globalThis.fetch.bind(globalThis)
    let response: Response
    try {
      response = await doFetch(url, { credentials: 'same-origin' })
    }
    catch {
      throw handle(toApiError(null, undefined), url, errorMode)
    }
    if (!response.ok) {
      let data: unknown
      try {
        data = await response.json()
      }
      catch {
        data = undefined
      }
      throw handle(toApiError(response.status, data), url, errorMode, true)
    }
    const filename = filenameFromDisposition(response.headers.get('content-disposition'))
    const blob = await response.blob()
    deps.saveBlob?.(blob, filename)
    return filename
  }

  return {
    request,
    download,

    auth: {
      /** Silent: the login form shows the server's «Неверный логин или пароль» itself. */
      login: (body: LoginBody) => post<User>('/api/login', body, 'silent'),
      logout: () => post<Ok>('/api/logout', undefined, 'silent'),
      /** Silent: the session check must not redirect or toast; the middleware decides. */
      me: () => get<User>('/api/me', undefined, 'silent'),
    },

    health: {
      get: (errorMode: ErrorMode = 'background') => get<Health>('/api/health', undefined, errorMode),
    },

    notifications: {
      list: (errorMode: ErrorMode = 'background') => get<NotificationsResponse>('/api/notifications', undefined, errorMode),
      markAllRead: () => post<Ok>('/api/notifications/read'),
    },

    m1: {
      upload: (files: File[], workplace: Workplace, shifr?: { fond?: string, opis?: string, delo?: string }) => {
        const form = new FormData()
        for (const f of files) form.append('files', f)
        form.append('workplace', workplace)
        if (shifr?.fond) form.append('fond', shifr.fond)
        if (shifr?.opis) form.append('opis', shifr.opis)
        if (shifr?.delo) form.append('delo', shifr.delo)
        return post<UploadResult>('/api/upload', form)
      },
      files: (query: { status?: FileStatus | '', q?: string, limit?: number } = {}, errorMode?: ErrorMode) =>
        get<M1File[]>('/api/m1/files', query, errorMode),
      previewUrl: (id: number) => `/api/m1/files/${id}/preview`,
      queue: (errorMode: ErrorMode = 'background') => get<QueueCounters>('/api/m1/queue', undefined, errorMode),
      // Live check while typing: quiet on failure (the field shows «не удалось проверить»), but a 401 still
      // sends the user to /login like every other request.
      checkCase: (fond: number, opis: number, delo: number) =>
        get<CheckCaseResult>('/api/m1/check-case', { fond, opis, delo }, 'background'),
      fixShifr: (id: number, body: ShifrBody) => post<M1File>(`/api/m1/files/${id}/shifr`, body),
      /** «Отправить сейчас» on a `retry` file, «Отправить повторно» on an `invalid` one. */
      retryFile: (id: number, force = false) => post<M1File>(`/api/m1/files/${id}/retry`, { force }),
      retryJob: (jobId: number) => post<Ok>(`/api/m1/jobs/${jobId}/retry`),
      stats: (period: 'day' | 'month') => get<StatsRow[]>('/api/m1/stats', { period }),
      journal: (query: { q?: string, result?: JournalResult | '', limit?: number, offset?: number } = {}) =>
        get<JournalRow[]>('/api/m1/journal', query),
    },

    dela: {
      list: (query: { q?: string, fond?: number } = {}) => get<DeloSummary[]>('/api/dela', query),
      get: (id: number) => get<DeloDetail>(`/api/dela/${id}`),
      /** Destructive: overwrites manual corrections. Confirm first. */
      reocr: (id: number, lang: OcrLang) => post<ReocrResult>(`/api/dela/${id}/ocr`, { lang }),
      exportUrl: (id: number, fmt: ExportFormat) => withQuery(`/api/dela/${id}/export`, { fmt }),
    },

    pages: {
      get: (id: number, query: { hl?: string, fz?: Fuzzy } = {}) => get<PageDetail>(`/api/pages/${id}`, query),
      /** Full PNG without `w`; JPEG thumbnail with w = 80…800. */
      imageUrl: (id: number, w?: number) => withQuery(`/api/pages/${id}/image`, { w }),
      saveWords: (id: number, edits: WordEdit[]) => patch<SaveWordsResult>(`/api/pages/${id}/words`, edits),
      markReviewed: (id: number) => post<ReviewedResult>(`/api/pages/${id}/reviewed`),
      retry: (id: number) => post<Ok>(`/api/pages/${id}/retry`),
      exportUrl: (id: number, fmt: ExportFormat) => withQuery(`/api/pages/${id}/export`, { fmt }),
    },

    review: {
      list: (errorMode?: ErrorMode) => get<ReviewItem[]>('/api/review', undefined, errorMode),
    },

    search: {
      query: (params: SearchParams) => get<SearchResponse>('/api/search', { ...params }),
      delo: (deloId: number, q: string, fuzzy: Fuzzy = 0) => get<DeloSnippet[]>(`/api/search/delo/${deloId}`, { q, fuzzy }),
      facets: () => get<Facets>('/api/search/facets'),
      history: () => get<HistoryItem[]>('/api/history'),
      saved: () => get<SavedQuery[]>('/api/saved-queries'),
      save: (body: SaveQueryBody) => post<{ id: number }>('/api/saved-queries', body),
      deleteSaved: (id: number) => del<Ok>(`/api/saved-queries/${id}`),
    },

    collections: {
      list: () => get<CollectionSummary[]>('/api/collections'),
      create: (name: string) => post<{ id: number, name: string }>('/api/collections', { name }),
      get: (id: number) => get<CollectionDetail>(`/api/collections/${id}`),
      remove: (id: number) => del<Ok>(`/api/collections/${id}`),
      addItem: (id: number, pageId: number) => post<Ok>(`/api/collections/${id}/items`, { page_id: pageId }),
      removeItem: (id: number, pageId: number) => del<Ok>(`/api/collections/${id}/items/${pageId}`),
      exportUrl: (id: number, fmt: CollectionExportFormat) => withQuery(`/api/collections/${id}/export`, { fmt }),
    },

    users: {
      list: () => get<AdminUser[]>('/api/users'),
      create: (body: CreateUserBody) => post<{ id: number }>('/api/users', body),
      update: (id: number, body: UpdateUserBody) => patch<Ok>(`/api/users/${id}`, body),
    },

    eais: {
      status: (errorMode: ErrorMode = 'silent') => get<EaisStatus>('/mock-eais/api/status', undefined, errorMode),
      /** Admin-only demo outage switch. */
      setOnline: (online: boolean) => post<EaisSwitchResult>('/mock-eais/api/status', { online }),
      cases: () => get<EaisCaseRow[]>('/mock-eais/api/cases'),
      case: (id: number) => get<EaisCase>(`/mock-eais/api/cases/${id}`),
      /** The «Карточка ЕАИС» link target. */
      caseUrl: (id: number) => `/mock-eais/api/cases/${id}`,
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

function saveBlobToDisk(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** The API client wired to Nuxt: router for 401, the page error state for 403/404, Nuxt UI toasts for the rest. */
export function useApi(): ApiClient {
  const nuxtApp = useNuxtApp()
  return createApiClient({
    fetcher: (url, options) => $fetch(url, options as Parameters<typeof $fetch>[1]),
    // Parallel requests (health, queue and bell polls, the screen's own GET) can all come back 401 together.
    // Only the first one acts: clear() drops the user synchronously, so the rest find no session and stop here.
    // One redirect, one toast, no loop (the login page itself never sends a session request through here).
    onUnauthorized: () => {
      void nuxtApp.runWithContext(() => {
        const auth = useAuthStore()
        if (!auth.me) return
        const route = useRoute()
        auth.clear()
        if (route.path === '/login') return
        useNotify().notify(translate('auth.sessionExpired'), 'info')
        return navigateTo({ path: '/login', query: { next: route.fullPath } }, { replace: true })
      })
    },
    onPageError: (error) => {
      void nuxtApp.runWithContext(() => {
        usePageError().raise(error.kind === 'forbidden' ? 'forbidden' : 'notFound', error.detail)
      })
    },
    onToast: (message) => {
      void nuxtApp.runWithContext(() => {
        useNotify().notify(message, 'error')
      })
    },
    saveBlob: saveBlobToDisk,
  })
}
