import type { DeloSummary, PageDetail } from '~/types/api'
import { translate } from '~/composables/useT'

/**
 * The parts of a шифр (Фонд / Опись / Дело / Лист). Numbers come straight from DeloSummary; payloads that only
 * carry the string form («Ф.1 Оп.1 Д.12», «Ф.1 Оп.1 Д.12 л.5») go through parseShifr().
 */
export interface ShifrParts {
  fond: DeloSummary['fond']
  opis: DeloSummary['opis']
  delo: DeloSummary['delo']
  leaf?: PageDetail['leaf'] | null
}

export type ShifrSegment = 'fond' | 'opis' | 'delo' | 'leaf'
export const SHIFR_SEGMENTS: readonly ShifrSegment[] = ['fond', 'opis', 'delo', 'leaf']

const SHIFR = /Ф\.\s*(\d+)\s+Оп\.\s*(\d+)\s+Д\.\s*(\d+)(?:\s*(?:·\s*)?л\.\s*(\d+))?/i

/** Reads «Ф.1 Оп.1 Д.12», «Ф.1 Оп.1 Д.12 л.5» or «… · л.5». Returns null for an empty or unknown string. */
export function parseShifr(value: string | null | undefined): ShifrParts | null {
  if (!value) return null
  const m = SHIFR.exec(value)
  if (!m) return null
  return { fond: Number(m[1]), opis: Number(m[2]), delo: Number(m[3]), leaf: m[4] === undefined ? null : Number(m[4]) }
}

/** The segments a шифр actually has: лист only when present. */
export function shifrSegments(parts: ShifrParts): ShifrSegment[] {
  return SHIFR_SEGMENTS.filter(s => s !== 'leaf' || (parts.leaf !== null && parts.leaf !== undefined))
}

/** Compact inline form: «Ф.1 Оп.1 Д.12 · л.3». */
export function formatShifr(parts: ShifrParts): string {
  const base = `${translate('plate.fond.short')}${parts.fond} ${translate('plate.opis.short')}${parts.opis} ${translate('plate.delo.short')}${parts.delo}`
  return parts.leaf === null || parts.leaf === undefined ? base : `${base} · ${translate('plate.leaf.short')}${parts.leaf}`
}

/** «Шифр: фонд 1, опись 1, дело 15, лист 3» (spec 2 §ShifrPlate). */
export function shifrAriaLabel(parts: ShifrParts): string {
  const params = { fond: parts.fond, opis: parts.opis, delo: parts.delo }
  return parts.leaf === null || parts.leaf === undefined
    ? translate('plate.ariaNoLeaf', params)
    : translate('plate.aria', { ...params, leaf: parts.leaf })
}
