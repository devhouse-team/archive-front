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
