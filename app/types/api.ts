// API types for the FastAPI backend (../astana-archive/app/api.py).
// /openapi.json leaves response bodies untyped, so these come from handoff §5 and live responses
// captured from the dev instance on 2026-11-12.

// ---------- shared ----------

export type Role = 'admin' | 'archivist' | 'operator' | 'reader'
export const ROLES: readonly Role[] = ['admin', 'archivist', 'operator', 'reader']

/** Script/language of a page or case. kk-arab is right-to-left; ru-old is pre-1918 Russian orthography. */
export type Lang = 'ru' | 'ru-old' | 'kk-cyrl' | 'kk-latn' | 'kk-arab'
export type OcrLang = Lang | 'auto'
export type Access = 'open' | 'restricted'
/** SQLite booleans arrive as 0/1. */
export type Flag = 0 | 1
/** "YYYY-MM-DD HH:MM:SS", server local time. */
export type Timestamp = string
export type ExportFormat = 'txt' | 'json' | 'hocr' | 'alto' | 'pdf'
export type CollectionExportFormat = 'xlsx' | 'csv' | 'zip'

/** Every error body: a ready-to-show Russian message. FastAPI validation (422) sends an array instead. */
export interface ApiErrorBody {
  detail: string | Array<{ type: string, loc: (string | number)[], msg: string }>
}

export interface Ok {
  ok: boolean
}

// ---------- 5.1 auth and state ----------

export interface User {
  id: number
  username: string
  full_name: string
  role: Role
  role_ru: string
}

export interface LoginBody {
  username: string
  password: string
}

export interface WorkerHeartbeat {
  /** Seconds since the last heartbeat; null when the worker never reported. */
  age_s: number | null
  ok: boolean
}

export interface Health {
  eais_online: boolean
  eais_down_since: string | null
  workers: { watcher: WorkerHeartbeat, upload: WorkerHeartbeat, ocr: WorkerHeartbeat }
  disk_free_gb: number
  disk_low: boolean
  /** Unix seconds of the next automatic upload retry. */
  next_retry_at: number | null
  /** Seconds until the next retry, at server_time. */
  next_retry_in: number | null
  /** 'auto' (backend 2026-11-12): each page picks its own engine, vlm for Arabic script. */
  ocr_engine: 'tesseract' | 'vlm' | 'auto' | string
  tesseract: string
  last_backup: string | null
  server_time: number
}

export type NotificationLevel = 'info' | 'warn' | 'error'

export interface Notification {
  id: number
  ts: Timestamp
  level: NotificationLevel
  message: string
  read: Flag
}

export interface NotificationsResponse {
  unread: number
  items: Notification[]
}

// ---------- 5.2 M1 ----------

export type Workplace = 'ws1' | 'ws2'
export type FileStatus = 'queued' | 'retry' | 'uploaded' | 'invalid'
export type ShifrSource = 'filename' | 'folder' | 'manual'

export interface UploadResult {
  saved: string[]
  workplace: Workplace
}

/**
 * A row of /api/m1/files. The backend also sends spool_path, archive_path and error_path:
 * server file paths that must never be displayed, so they are deliberately not typed here.
 */
export interface M1File {
  id: number
  workplace: Workplace
  src_relpath: string
  name: string
  sha256: string | null
  size: number | null
  fmt: string | null
  dpi: number | null
  n_pages: number | null
  fond: number | null
  opis: number | null
  delo: number | null
  leaf_start: number | null
  shifr_source: ShifrSource | null
  status: FileStatus
  error_reason: string | null
  force: Flag
  eais_receipt: string | null
  delo_id: number | null
  created_at: Timestamp
  updated_at: Timestamp
  attempts: number | null
  next_run_at: number | null
  last_error: string | null
  job_status: string | null
  /** "Ф.1 Оп.1 Д.12 л.5"; empty for invalid files (handoff §9). */
  shifr: string
}

export interface OcrFailed {
  id: number
  page_id: number
  last_error: string | null
  leaf: number
  shifr: string
}

export interface QueueCounters {
  files: Record<FileStatus, number>
  uploaded_today: number
  pages_today: number
  pages_done: number
  ocr: { pending: number, running: number, failed: number }
  ocr_failed: OcrFailed[]
  review: number
  next_retry_at: number | null
  next_retry_in: number | null
}

export interface CheckCaseResult {
  /** null when ЕАИС is down; then `detail` explains. */
  found: boolean | null
  title?: string | null
  detail?: string
}

export interface ShifrBody {
  fond: number
  opis: number
  delo: number
  leaf?: number | null
}

export interface StatsRow {
  /** "YYYY-MM-DD" for period=day, "YYYY-MM" for period=month. */
  period: string
  uploaded: number
  errors: number
  pages: number
}

export type JournalResult = 'ok' | 'error' | 'info'

export interface JournalRow {
  id: number
  ts: Timestamp
  actor: string
  action: string
  file_name: string
  shifr: string
  result: JournalResult
  details: string
}

// ---------- 5.3 дела, pages, review ----------

export type PageStatus = 'pending' | 'running' | 'done' | 'failed'
export type Script = 'Cyrillic' | 'Latin' | 'Arabic' | string
export type OcrEngine = 'tesseract' | 'vlm' | string

export interface DeloSummary {
  id: number
  fond: number
  opis: number
  delo: number
  shifr: string
  eais_case_id: number | null
  title: string
  year_from: number | null
  year_to: number | null
  years: string
  fond_creator: string
  doc_type: string
  access: Access
  lang_override: Lang | null
  pages_total: number
  pages_done: number
  pages_failed: number
  /** Missing leaf numbers. */
  gaps: number[]
  /** Count of pages awaiting review. */
  low_conf: number
  /** Distinct page languages. Added by the backend on 2026-11-12; older backends omit it. */
  langs?: Lang[]
}

export interface DeloPage {
  id: number
  leaf: number
  lang: Lang | null
  mean_conf: number | null
  low_conf: Flag
  reviewed: Flag
  status: PageStatus
  script: Script | null
  engine: OcrEngine | null
}

export interface DeloDetail extends DeloSummary {
  pages: DeloPage[]
}

export interface ReocrResult {
  queued: number
}

export interface ReviewItem {
  id: number
  leaf: number
  lang: Lang | null
  mean_conf: number
  shifr: string
  title: string
  delo_id: number
  low_share: number
}

export interface Word {
  id: number
  idx: number
  block: number
  line: number
  /** Current text, possibly corrected. */
  text: string
  /** Original OCR output. */
  ocr_text: string
  conf: number
  x: number
  y: number
  w: number
  h: number
  corrected: Flag
}

export interface PageDelo {
  id: number
  shifr: string
  title: string
  years: string
  access: Access
  eais_case_id: number | null
}

export interface PageDetail {
  id: number
  delo_id: number
  file_id: number
  leaf: number
  width: number
  height: number
  script: Script | null
  lang: Lang | null
  engine: OcrEngine | null
  mean_conf: number | null
  low_conf: Flag
  reviewed: Flag
  cer: number | null
  status: PageStatus
  updated_at: Timestamp
  /**
   * Low-confidence threshold for this page's engine (60 Tesseract, 96.5 vlm by default). A word is low when
   * conf < low_word_conf. Added by the backend on 2026-11-12; older backends omit it, so fall back to 60.
   */
  low_word_conf?: number
  delo: PageDelo
  words: Word[]
  highlight_word_ids: number[]
  prev_id: number | null
  next_id: number | null
  position: number
  count: number
  max_leaf: number
  /** Leaf numbers of the neighbouring pages (null at the ends). Added 2026-11-12; older backends omit them. */
  prev_leaf?: number | null
  next_leaf?: number | null
  job: { id: number, last_error: string | null } | null
}

export interface WordEdit {
  id: number
  text: string
}

export interface SaveWordsResult {
  changed: number
  cer: number
}

export interface ReviewedResult {
  ok: boolean
  next_review_id: number | null
}

/** Handoff §4 default when a page payload has no low_word_conf. */
export const DEFAULT_LOW_WORD_CONF = 60

// ---------- 5.4 search ----------

export type Fuzzy = 0 | 1 | 2
export type SearchSort = 'rel' | 'date' | 'shifr'

export interface SearchFilters {
  fond?: number | string
  opis?: number | string
  delo?: number | string
  year_from?: number | string
  year_to?: number | string
  lang?: Lang
  doc_type?: string
  creator?: string
}

export interface SearchParams extends SearchFilters {
  q: string
  fuzzy?: Fuzzy
  sort?: SearchSort
  page?: number
}

export interface SearchHitPage {
  page_id: number
  leaf: number
}

export interface SearchItem {
  delo_id: number
  shifr: string
  title: string
  access: Access
  years: string
  lang: Lang | null
  langs: Lang[]
  doc_type: string
  best_page_id: number
  leaf: number
  hits_pages: number
  /** Escaped server-side; only <mark> is added. The one field rendered with v-html. */
  snippet_html: string
  score: number
  pages: SearchHitPage[]
}

export interface SearchResponse {
  total: number
  pages_total: number
  page?: number
  pages?: number
  took: number
  items: SearchItem[]
  /** Present with HTTP 200 for an empty or unparsable query (handoff §9). */
  error?: string
}

export interface DeloSnippet {
  page_id: number
  leaf: number
  snippet_html: string
}

export interface Facets {
  fonds: Array<{ fond: number, creator: string }>
  doc_types: string[]
  creators: string[]
  years: { min: number | null, max: number | null }
  langs: Lang[]
}

export interface SavedQuery {
  id: number
  user_id: number
  name: string
  q: string
  filters_json: string
  filters: SearchFilters
}

export interface HistoryItem {
  id: number
  user_id: number
  q: string
  filters_json: string
  /** History also records the fuzzy level used. */
  filters: SearchFilters & { fuzzy?: Fuzzy }
  ts: Timestamp
  hits: number
}

export interface SaveQueryBody {
  name: string
  q: string
  filters: SearchFilters
}

// ---------- 5.5 collections ----------

export interface CollectionSummary {
  id: number
  user_id: number
  name: string
  created_at: Timestamp
  n: number
  updated_at: Timestamp | null
}

export interface CollectionItem {
  page_id: number
  leaf: number
  lang: Lang | null
  delo_id: number
  shifr: string
  title: string
  year_from: number | null
  year_to: number | null
  years: string
  eais_case_id: number | null
  access: Access
  added_at: Timestamp
}

export interface CollectionDetail {
  id: number
  user_id: number
  name: string
  created_at: Timestamp
  items: CollectionItem[]
}

// ---------- 5.6 admin and the mock ЕАИС ----------

export interface AdminUser {
  id: number
  username: string
  full_name: string
  role: Role
}

export interface CreateUserBody {
  username: string
  password: string
  role: Role
  full_name?: string
}

export interface UpdateUserBody {
  role?: Role
  password?: string
}

export interface EaisStatus {
  online: boolean
  cases: number
  files: number
}

/** POST /mock-eais/api/status returns only the new state. */
export interface EaisSwitchResult {
  online: boolean
}

export type EaisCaseRow = Omit<EaisCase, 'files'>

export interface EaisCaseFile {
  id: number
  leaf: number
  filename: string
  sha256: string
  received_at: Timestamp
}

export interface EaisCase {
  id: number
  fond: number
  opis: number
  delo: number
  title: string
  year_from: number | null
  year_to: number | null
  fond_creator: string
  doc_type: string
  access: Access
  files: EaisCaseFile[]
}
