import type { MessageKey } from '~/composables/useT'
import { translate } from '~/composables/useT'

/** Seconds as m:ss (retry countdowns, elapsed OCR time). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Seconds left until `deadlineMs`, never negative. */
export function secondsUntil(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
}

/** Unread and menu counts: anything above `cap` shows as «99+». */
export function formatCount(n: number, cap = 99): string {
  return n > cap ? `${cap}+` : String(n)
}

const TS = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/

/**
 * Server timestamps ("YYYY-MM-DD HH:MM:SS", server local time) for lists: the time alone when the date is
 * `today` (YYYY-MM-DD, client local date), otherwise DD.MM.YYYY HH:MM. The string is read as written,
 * with no timezone conversion. Anything unparsable is returned unchanged.
 */
export function formatTimestamp(ts: string, today: string = localDate()): string {
  // A string with a zone (ISO with Z or ±hh:mm) is converted to the client's local time; the backend's own
  // "YYYY-MM-DD HH:MM:SS" carries no zone and is shown as written.
  const zoned = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(ts.trim()) ? new Date(ts) : null
  if (zoned && !Number.isNaN(zoned.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return formatTimestamp(`${localDate(zoned)} ${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`, today)
  }
  const m = TS.exec(ts)
  if (!m) return ts
  const [, y, mo, d, h, mi] = m
  return `${y}-${mo}-${d}` === today ? `${h}:${mi}` : `${d}.${mo}.${y} ${h}:${mi}`
}

/** The client's local date as YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export type PluralForm = 'one' | 'few' | 'many'

/** Russian plural form for n: one (1, 21), few (2–4, 22–24), many (0, 5–20, 25…). */
export function pluralForm(n: number): PluralForm {
  const abs = Math.abs(Math.trunc(n))
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return 'one'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
  return 'many'
}

/** Locale paths whose node holds one/few/many forms, e.g. 'plural.leaf' or 'search.plural.case'. */
export type PluralKey = MessageKey extends infer K ? K extends `${infer P}.one` ? P : never : never

/**
 * The one way to say «n лист / листа / листов»: `key` names a locale node with one/few/many strings, each
 * carrying {n}. plural('plural.leaf', 3) → «3 листа».
 */
export function plural(key: PluralKey, n: number): string {
  return translate(`${key}.${pluralForm(n)}` as MessageKey, { n })
}

/**
 * Journal text may carry inbox paths («ws1/1/1/12/blank.png»). Screens show file base names only, as /upload
 * does: a path ending in a file name keeps only the file name («1/2» and other slashes stay).
 */
export function baseNames(text: string): string {
  return text.replace(/(?:[^\s/(«"]+\/)+(?=[^\s/]+\.[a-z0-9]{2,5}(?![^\s,;:)»]))/gi, '')
}
