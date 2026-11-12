/**
 * File name from a Content-Disposition header. The backend sends
 * `attachment; filename*=UTF-8''<percent-encoded>` (RFC 5987); plain `filename="…"` is the fallback.
 */
export function filenameFromDisposition(header: string | null | undefined, fallback = 'download'): string {
  if (!header) return fallback

  const star = /filename\*\s*=\s*([^;]+)/i.exec(header)
  if (star?.[1]) {
    let value = star[1].trim().replace(/^"(.*)"$/, '$1')
    const parts = /^([\w-]+)'[^']*'(.*)$/.exec(value)
    if (parts?.[2] !== undefined) value = parts[2]
    try {
      const decoded = decodeURIComponent(value)
      if (decoded) return sanitize(decoded, fallback)
    }
    catch {
      // Malformed percent-encoding: fall through to the plain parameter.
    }
  }

  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header)
  const value = plain?.[2] ?? plain?.[1]
  if (value) return sanitize(value.trim(), fallback)
  return fallback
}

/** Strip path separators and control characters; a file name never carries a directory. */
function sanitize(name: string, fallback: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = name.replace(/[\\/]/g, '_').replace(/[\u0000-\u001F\u007F]/g, '').trim()
  return clean || fallback
}
