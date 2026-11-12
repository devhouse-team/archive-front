import { DEFAULT_LOW_WORD_CONF } from '~/types/api'
import type { PageDetail, Word, WordEdit } from '~/types/api'

// Pure logic for the page viewer (Stage 5): confidence, line grouping, box scaling, the keyboard model and the
// PATCH payload. Kept free of Vue so the tests can pin each rule from handoff §4 and spec 2.

/** The page's low-confidence threshold (live contract: 60 for Tesseract, 96.5 for vlm). */
export function lowThreshold(page: Pick<PageDetail, 'low_word_conf'> | null | undefined): number {
  const value = page?.low_word_conf
  return typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_LOW_WORD_CONF
}

/** A word is shown as low confidence when conf < threshold and nobody has corrected it (spec 2 §Confidence). */
export function isLowWord(word: Pick<Word, 'conf' | 'corrected'>, threshold: number, edited = false): boolean {
  return word.corrected === 0 && !edited && word.conf < threshold
}

export interface ViewerLine {
  line: number
  words: Word[]
  /** Mean word confidence of the line, 0–100. */
  mean: number
  /** Words in the line that are below the threshold (corrected words excluded). */
  lowCount: number
}

/** Words in reading order: by idx. */
export function readingOrder(words: readonly Word[]): Word[] {
  return [...words].sort((a, b) => a.idx - b.idx)
}

/** Group words into lines by `line`, each line ordered by `idx`; lines follow the reading order of their first word. */
export function groupLines(words: readonly Word[], threshold: number = DEFAULT_LOW_WORD_CONF): ViewerLine[] {
  const byLine = new Map<number, Word[]>()
  for (const w of readingOrder(words)) {
    const list = byLine.get(w.line)
    if (list) list.push(w)
    else byLine.set(w.line, [w])
  }
  return [...byLine.entries()].map(([line, list]) => ({
    line,
    words: list,
    mean: list.reduce((s, w) => s + w.conf, 0) / list.length,
    lowCount: list.filter(w => isLowWord(w, threshold)).length,
  }))
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Handoff §4: coordinates are full-image pixels; scale = displayedWidth / width. */
export function displayScale(displayedWidth: number, naturalWidth: number): number {
  if (!(naturalWidth > 0) || !(displayedWidth > 0)) return 0
  return displayedWidth / naturalWidth
}

export function scaleBox(word: Pick<Word, 'x' | 'y' | 'w' | 'h'>, scale: number): Box {
  return { left: word.x * scale, top: word.y * scale, width: word.w * scale, height: word.h * scale }
}

export const ZOOM_STEPS: readonly number[] = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2]

/** Next zoom step up or down from the current scale (which may be a fit-to-width value between steps). */
export function stepZoom(current: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find(s => s > current + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]!
  return [...ZOOM_STEPS].reverse().find(s => s < current - 0.001) ?? ZOOM_STEPS[0]!
}

export type NavKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'
export const NAV_KEYS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']

/**
 * The text pane's keyboard model (spec 2 §LocatorPin):
 * - ←/→ move to the previous/next word in **visual** order, so in RTL → goes back in reading order;
 * - ↑/↓ move to the previous/next low-confidence word in reading order;
 * - Home/End go to the first/last word.
 * Returns the id to select, or null when there is nowhere to go (the selection stays).
 */
export function navigateWords(
  order: readonly Word[],
  currentId: number | null,
  key: NavKey,
  dir: 'ltr' | 'rtl' | 'auto',
  isLow: (w: Word) => boolean,
): number | null {
  if (order.length === 0) return null
  const i = currentId === null ? -1 : order.findIndex(w => w.id === currentId)
  const rtl = dir === 'rtl'
  switch (key) {
    case 'Home': return order[0]!.id
    case 'End': return order[order.length - 1]!.id
    case 'ArrowLeft':
    case 'ArrowRight': {
      const forward = (key === 'ArrowRight') !== rtl
      if (i === -1) return forward ? order[0]!.id : order[order.length - 1]!.id
      const j = i + (forward ? 1 : -1)
      return j >= 0 && j < order.length ? order[j]!.id : null
    }
    case 'ArrowDown': {
      for (let j = i + 1; j < order.length; j++) if (isLow(order[j]!)) return order[j]!.id
      return null
    }
    case 'ArrowUp': {
      const from = i === -1 ? order.length : i
      for (let j = from - 1; j >= 0; j--) if (isLow(order[j]!)) return order[j]!.id
      return null
    }
  }
  return null
}

/** The PATCH body: only words whose draft differs from the current text (handoff §5.3). Blank drafts are dropped. */
export function changedEdits(words: readonly Word[], drafts: ReadonlyMap<number, string>): WordEdit[] {
  const out: WordEdit[] = []
  for (const w of readingOrder(words)) {
    const draft = drafts.get(w.id)
    if (draft === undefined) continue
    const text = draft.trim()
    if (text !== '' && text !== w.text) out.push({ id: w.id, text })
  }
  return out
}

/** Whether a page is still being recognised (long vlm runs, handoff §8). */
export function isRecognising(status: PageDetail['status'] | null | undefined): boolean {
  return status === 'pending' || status === 'running'
}

/** «1:05» from seconds. */
export function elapsedClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Percent with a comma decimal, as Russian copy expects («70,7»). */
export function confPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

/** Leader line geometry in work-area coordinates (ViewerLeader). */
export interface LeaderGeometry {
  /** Pin centre, in work-area coordinates. */
  x1: number
  y1: number
  /** Just under the word box on the scan. */
  yUnder: number
  /** Gutter x between the panes. */
  gx: number
  /** Text pane left edge and the word's row centre. */
  x2: number
  y2: number
}
