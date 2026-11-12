import type { DeloPage, DeloSummary, ExportFormat, Lang, OcrLang } from '~/types/api'
import { translate } from '~/composables/useT'

// Stage 8 helpers for /dela and /dela/[id]. Pure functions, so the gap and polling rules are unit-tested.

export const REOCR_LANGS: readonly OcrLang[] = ['auto', 'ru', 'ru-old', 'kk-cyrl', 'kk-latn', 'kk-arab']
export const EXPORT_FORMATS: readonly ExportFormat[] = ['txt', 'json', 'hocr', 'alto', 'pdf']
/** How often the case card re-reads the case while OCR runs (re-OCR or an upload in progress). */
export const DELO_POLL_MS = 3000

/** A slot in the thumbnail grid: a page, or a placeholder for a missing leaf (handoff §5.3 `gaps`). */
export type LeafSlot
  = | { kind: 'page', leaf: number, page: DeloPage }
    | { kind: 'gap', leaf: number }

/** Pages and gaps in leaf order, so a missing leaf sits where it belongs. */
export function leafSlots(pages: readonly DeloPage[], gaps: readonly number[]): LeafSlot[] {
  const slots: LeafSlot[] = [
    ...pages.map(page => ({ kind: 'page' as const, leaf: page.leaf, page })),
    ...gaps.map(leaf => ({ kind: 'gap' as const, leaf })),
  ]
  // Same leaf twice (a page and a gap) cannot happen on the backend; pages win if it ever does.
  return slots.sort((a, b) => a.leaf - b.leaf || (a.kind === 'page' ? -1 : 1))
}

/** «пропущены л. 4, 7», or null when nothing is missing. */
export function gapsLabel(gaps: readonly number[] | null | undefined): string | null {
  if (!gaps || gaps.length === 0) return null
  return translate('dela.gaps', { leaves: [...gaps].sort((a, b) => a - b).join(', ') })
}

/** OCR still has work on this case: keep polling. */
export function isOcrBusy(pages: readonly Pick<DeloPage, 'status'>[]): boolean {
  return pages.some(p => p.status === 'pending' || p.status === 'running')
}

/** «96 %» with a Russian decimal comma; null confidence stays null. */
export function delaConf(conf: number | null | undefined): string | null {
  if (conf === null || conf === undefined || Number.isNaN(conf)) return null
  return `${Number.isInteger(conf) ? conf : conf.toFixed(1).replace('.', ',')}`
}

/**
 * Languages of a case for the list: `langs` from /api/dela; a backend without it falls back to `lang_override`.
 */
export function deloLangs(delo: DeloSummary): Lang[] {
  if (delo.langs && delo.langs.length > 0) return delo.langs
  return delo.lang_override ? [delo.lang_override] : []
}

/** Distinct page languages on the case card, in a stable order. */
export function pageLangs(pages: readonly Pick<DeloPage, 'lang'>[]): Lang[] {
  const order: Lang[] = ['ru', 'ru-old', 'kk-cyrl', 'kk-latn', 'kk-arab']
  const seen = new Set(pages.map(p => p.lang).filter((l): l is Lang => !!l))
  return order.filter(l => seen.has(l))
}
