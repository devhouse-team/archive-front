import { describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import PagePage from '~/pages/page/[id].vue'
import ViewerTextPane from '~/components/viewer/ViewerTextPane.vue'
import ViewerContext from '~/components/viewer/ViewerContext.vue'
import { useAuthStore } from '~/stores/auth'
import type { PageDetail, Role, User, Word } from '~/types/api'
import {
  changedEdits, displayScale, groupLines, isLowWord, lowThreshold, navigateWords, readingOrder, retryConfirmKey, scaleBox,
} from '~/composables/useViewer'

const word = (over: Partial<Word> & Pick<Word, 'id' | 'idx' | 'line'>): Word => ({
  block: 1, text: `w${over.id}`, ocr_text: `w${over.id}`, conf: 95, x: 0, y: 0, w: 10, h: 10, corrected: 0, ...over,
})

// Two lines, deliberately out of order in the payload.
const WORDS: Word[] = [
  word({ id: 13, idx: 3, line: 1, conf: 40 }),
  word({ id: 10, idx: 0, line: 0 }),
  word({ id: 12, idx: 2, line: 0, conf: 55 }),
  word({ id: 11, idx: 1, line: 0 }),
  word({ id: 14, idx: 4, line: 1 }),
]

describe('box scaling (handoff §4)', () => {
  it('scales by displayedWidth / width', () => {
    const s = displayScale(875, 1750)
    expect(s).toBe(0.5)
    expect(scaleBox({ x: 601, y: 194, w: 365, h: 50 }, s)).toEqual({ left: 300.5, top: 97, width: 182.5, height: 25 })
  })
  it('recomputes for any displayed width and guards a zero size', () => {
    expect(scaleBox({ x: 100, y: 100, w: 100, h: 50 }, displayScale(3500, 1750))).toEqual({ left: 200, top: 200, width: 200, height: 100 })
    expect(displayScale(0, 1750)).toBe(0)
    expect(displayScale(800, 0)).toBe(0)
  })
})

describe('lines and order', () => {
  it('groups by line and orders by idx', () => {
    const lines = groupLines(WORDS)
    expect(lines.map(l => l.line)).toEqual([0, 1])
    expect(lines[0]!.words.map(w => w.id)).toEqual([10, 11, 12])
    expect(lines[1]!.words.map(w => w.id)).toEqual([13, 14])
    expect(readingOrder(WORDS).map(w => w.idx)).toEqual([0, 1, 2, 3, 4])
  })
  it('counts low words per line with the page threshold', () => {
    expect(groupLines(WORDS, 60).map(l => l.lowCount)).toEqual([1, 1])
    expect(groupLines(WORDS, 96.5).map(l => l.lowCount)).toEqual([3, 2])
  })
})

describe('low-confidence threshold (live contract low_word_conf)', () => {
  it('uses low_word_conf when present, else 60', () => {
    expect(lowThreshold({ low_word_conf: 96.5 })).toBe(96.5)
    expect(lowThreshold({})).toBe(60)
    expect(lowThreshold(null)).toBe(60)
  })
  it('a word is low below the threshold unless corrected', () => {
    expect(isLowWord({ conf: 90, corrected: 0 }, 96.5)).toBe(true)
    expect(isLowWord({ conf: 90, corrected: 0 }, 60)).toBe(false)
    expect(isLowWord({ conf: 59.9, corrected: 0 }, 60)).toBe(true)
    expect(isLowWord({ conf: 60, corrected: 0 }, 60)).toBe(false)
    expect(isLowWord({ conf: 10, corrected: 1 }, 60)).toBe(false)
  })
})

describe('keyboard model', () => {
  const order = readingOrder(WORDS)
  const low = (w: Word) => isLowWord(w, 60)
  it('←/→ move in reading order for LTR', () => {
    expect(navigateWords(order, 11, 'ArrowRight', 'ltr', low)).toBe(12)
    expect(navigateWords(order, 11, 'ArrowLeft', 'ltr', low)).toBe(10)
    expect(navigateWords(order, 14, 'ArrowRight', 'ltr', low)).toBeNull()
  })
  it('←/→ are mirrored in RTL (visual order)', () => {
    expect(navigateWords(order, 11, 'ArrowRight', 'rtl', low)).toBe(10)
    expect(navigateWords(order, 11, 'ArrowLeft', 'rtl', low)).toBe(12)
    expect(navigateWords(order, 10, 'ArrowRight', 'rtl', low)).toBeNull()
  })
  it('↑/↓ jump between low-confidence words', () => {
    expect(navigateWords(order, 10, 'ArrowDown', 'ltr', low)).toBe(12)
    expect(navigateWords(order, 12, 'ArrowDown', 'ltr', low)).toBe(13)
    expect(navigateWords(order, 13, 'ArrowDown', 'ltr', low)).toBeNull()
    expect(navigateWords(order, 14, 'ArrowUp', 'ltr', low)).toBe(13)
    expect(navigateWords(order, null, 'ArrowDown', 'ltr', low)).toBe(12)
  })
  it('Home/End go to the first and last word', () => {
    expect(navigateWords(order, 12, 'Home', 'rtl', low)).toBe(10)
    expect(navigateWords(order, 12, 'End', 'ltr', low)).toBe(14)
  })
})

describe('PATCH payload', () => {
  it('contains only the changed words', () => {
    const drafts = new Map<number, string>([
      [12, 'исправлено'], // changed
      [11, 'w11'], // same as current text
      [13, '   '], // blank: dropped
      [14, ' пробел '], // trimmed
    ])
    expect(changedEdits(WORDS, drafts)).toEqual([{ id: 12, text: 'исправлено' }, { id: 14, text: 'пробел' }])
    expect(changedEdits(WORDS, new Map())).toEqual([])
  })
})

describe('text pane keyboard in the DOM', () => {
  const lines = groupLines(WORDS)
  const order = readingOrder(WORDS)
  const props = { lines, order, selectedId: 11, hits: new Set<number>(), drafts: new Map<number, string>(), threshold: 60, lang: 'kk-arab' as const, editable: false }

  it('is a single tab stop and mirrors ←/→ for kk-arab', async () => {
    const w = await mountSuspended(ViewerTextPane, { props })
    const tabbable = w.findAll('button.viewer-word').filter(b => b.attributes('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(w.find('[role="group"]').attributes('dir')).toBe('rtl')
    await w.find('[data-word-id="11"]').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('select')?.at(-1)).toEqual([10])
    await w.find('[data-word-id="11"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(w.emitted('select')?.at(-1)).toEqual([12])
  })

  it('Enter opens no editor in view mode', async () => {
    const w = await mountSuspended(ViewerTextPane, { props: { ...props, lang: 'ru' } })
    await w.find('[data-word-id="11"]').trigger('keydown', { key: 'Enter' })
    expect(w.find('input').exists()).toBe(false)
  })

  it('Enter opens the editor in edit mode, Enter commits', async () => {
    const w = await mountSuspended(ViewerTextPane, { props: { ...props, lang: 'ru', editable: true } })
    await w.find('[data-word-id="11"]').trigger('keydown', { key: 'Enter' })
    const input = w.find('input')
    expect(input.exists()).toBe(true)
    await input.setValue('новое')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('edit')?.at(-1)).toEqual([11, 'новое'])
  })
})

const user = (role: Role): User => ({ id: 1, username: role, full_name: `${role} Демо`, role, role_ru: role })

const PAGE: PageDetail = {
  id: 3, delo_id: 1, file_id: 3, leaf: 3, width: 1750, height: 2480, script: 'Cyrillic', lang: 'kk-cyrl', engine: 'tesseract',
  mean_conf: 70.7, low_conf: 1, reviewed: 0, cer: null, status: 'done', updated_at: '2026-11-12 00:00:00', low_word_conf: 60,
  delo: { id: 1, shifr: 'Ф.1 Оп.1 Д.15', title: 'Приказы', years: '1936', access: 'open', eais_case_id: 1 },
  words: WORDS, highlight_word_ids: [], prev_id: 2, next_id: null, position: 3, count: 3, max_leaf: 3, job: null,
}

describe('edit affordances by role (handoff §2)', () => {
  registerEndpoint('/api/pages/3', () => PAGE)

  async function mountAs(role: Role) {
    setActivePinia(useNuxtApp().$pinia as Pinia)
    useAuthStore().setUser(user(role))
    const w = await mountSuspended(PagePage, { route: '/page/3?mode=edit' })
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()
    return w
  }

  it.each(['operator', 'reader'] as Role[])('%s gets view mode with no edit affordances', async (role) => {
    const w = await mountAs(role)
    expect(w.text()).toContain('Распознанный текст')
    expect(w.text()).not.toContain('Правка')
    expect(w.text()).not.toContain('Сохранить правки')
    expect(w.text()).not.toContain('Отметить проверенной')
    await w.find('[data-word-id="11"]').trigger('keydown', { key: 'Enter' })
    expect(w.find('input[type="text"]').exists()).toBe(false)
  })

  it('archivist gets the edit mode', async () => {
    const w = await mountAs('archivist')
    expect(w.text()).toContain('Правка')
    expect(w.text()).toContain('Сохранить правки')
    expect(w.text()).toContain('Отметить проверенной')
  })
})

describe('«Распознать заново» never drops edits silently (review round 1, major)', () => {
  it('asks whenever there are unsaved edits or saved corrections', () => {
    expect(retryConfirmKey(false, false)).toBeNull()
    expect(retryConfirmKey(true, false)).toBe('viewer.retry.confirmDrafts')
    expect(retryConfirmKey(false, true)).toBe('viewer.retry.confirm')
    expect(retryConfirmKey(true, true)).toBe('viewer.retry.confirmBoth')
  })

  it('with only unsaved edits: confirms naming them, and cancelling keeps the edits and sends nothing', async () => {
    let retries = 0
    registerEndpoint('/api/pages/3', () => PAGE)
    registerEndpoint('/api/pages/3/retry', { method: 'POST', handler: () => {
      retries++
      return { ok: true }
    } })
    setActivePinia(useNuxtApp().$pinia as Pinia)
    useAuthStore().setUser(user('archivist'))
    // UApp provides the tooltip context the corrected word needs.
    const Shell = defineComponent({ render: () => h(UApp, null, { default: () => h(PagePage) }) })
    const w = await mountSuspended(Shell, { route: '/page/3?mode=edit' })
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()

    await w.find('[data-word-id="11"]').trigger('keydown', { key: 'Enter' })
    const input = w.find('input[type="text"]')
    await input.setValue('правка')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.text()).toContain('Изменено слов: 1')

    const original = window.confirm
    const confirm = vi.fn(() => false)
    window.confirm = confirm
    // Stage 11c: «Распознать заново» lives in the «Ещё ⋯» menu; the menu item emits retry on the context band.
    w.findComponent(ViewerContext).vm.$emit('retry')
    await flushPromises()
    expect(confirm).toHaveBeenCalledWith('Распознать страницу заново? Несохранённые правки будут потеряны.')
    expect(retries).toBe(0)
    expect(w.text()).toContain('Изменено слов: 1')
    window.confirm = original
  })
})

describe('confidence shown against the threshold', () => {
  it('floors to whole numbers for 60 and to one decimal for a fractional threshold', async () => {
    const { confShown } = await import('~/composables/useViewer')
    expect(confShown(59.9, 60)).toBe('59')
    expect(confShown(96.49, 96.5)).toBe('96,4')
    expect(confShown(97, 96.5)).toBe('97')
  })
})

describe('calm viewer (Stage 11c): details hidden in Просмотр, shown in Правка', () => {
  async function mountPage(role: Role, route: string) {
    registerEndpoint('/api/pages/3', () => PAGE)
    setActivePinia(useNuxtApp().$pinia as Pinia)
    useAuthStore().setUser(user(role))
    const Shell = defineComponent({ render: () => h(UApp, null, { default: () => h(PagePage) }) })
    const w = await mountSuspended(Shell, { route })
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()
    return w
  }

  it.each(['archivist', 'reader'] as Role[])('%s in Просмотр: one sentence, no language, status, engine, mean, legend, per-line % or «Рамки слов»', async (role) => {
    const w = await mountPage(role, '/page/3')
    const text = w.text()
    expect(text).toContain('Слов для проверки: 2')
    expect(text).toContain('Подробнее')
    for (const hidden of ['KK', 'распознано', 'Движок', 'Tesseract', 'Средняя уверенность', 'порог', 'Обозначения', 'исправлено', 'выбранное слово', 'Рамки слов', 'по словам']) {
      expect(text).not.toContain(hidden)
    }
    expect(w.find('[data-testid="viewer-confidence-strip"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="viewer-line-meta"]')).toHaveLength(0)
    expect(w.find('[data-testid="viewer-low-nav"]').exists()).toBe(false)
    expect(w.find('[data-testid="viewer-hints"]').exists()).toBe(true)
    // The шифр is the compact plate, without micro-labels, linking to the дело.
    // (The OCR text itself is kk-cyrl and keeps lang="kk"; the header must not carry a Kazakh micro-label.)
    expect(w.findComponent(ViewerContext).find('[lang="kk"]').exists()).toBe(false)
    expect(w.find('a[href="/dela/1"]').text()).toContain('Ф.1 Оп.1 Д.15 · л.3')
  })

  it('archivist in Правка: mean, threshold, legend, per-line % and «Рамки слов» are shown', async () => {
    const w = await mountPage('archivist', '/page/3?mode=edit')
    const strip = w.get('[data-testid="viewer-confidence-strip"]')
    expect(strip.text()).toContain('Средняя уверенность')
    expect(strip.text()).toContain('70,7 %')
    expect(strip.text()).toContain('порог 60 %')
    expect(strip.text()).toContain('выбранное слово')
    expect(w.findAll('[data-testid="viewer-line-meta"]')).toHaveLength(2)
    expect(w.text()).toContain('Рамки слов')
    expect(w.find('[data-testid="viewer-low-nav"]').exists()).toBe(true)
    // Still folded away in Правка: language, status, engine.
    expect(w.text()).not.toContain('Движок')
  })

  it('«Подробнее» opens language, status and engine', async () => {
    const w = await mountSuspended(ViewerContext, {
      props: { page: PAGE, threshold: 60, lowCount: 2, canReview: true, canRetry: true, reviewing: false, retrying: false, navQuery: {} },
      attachTo: document.body,
    })
    await w.get('[data-testid="viewer-details"]').trigger('click')
    await flushPromises()
    const panel = document.querySelector('[data-testid="viewer-details-panel"]')
    expect(panel).not.toBeNull()
    expect(panel!.textContent).toContain('Казахский, кириллица')
    expect(panel!.textContent).toContain('распознано')
    expect(panel!.textContent).toContain('на проверке')
    expect(panel!.textContent).toContain('Tesseract')
    w.unmount()
  })
})

describe('«Ещё ⋯» holds Экспорт and «Распознать заново» with role gating (Stage 11c)', () => {
  const base = { page: PAGE, threshold: 60, lowCount: 2, reviewing: false, retrying: false, navQuery: {} }
  const labels = (w: Awaited<ReturnType<typeof mountSuspended>>) => {
    const menu = w.findComponent({ name: 'UDropdownMenu' })
    if (!menu.exists()) return null
    return (menu.props('items') as { label?: string }[][]).flat().map(i => i.label)
  }

  it('STAFF editor: export formats and re-OCR in the menu, one primary «Отметить проверенной» outside it', async () => {
    const w = await mountSuspended(ViewerContext, { props: { ...base, canReview: true, canRetry: true } })
    expect(labels(w)).toEqual(['Скачать страницу', 'Текст (TXT)', 'Данные (JSON)', 'hOCR', 'ALTO XML', 'PDF с текстом', 'Распознать заново'])
    const buttons = w.findAll('button').map(b => b.text())
    expect(buttons.some(t => t.includes('Распознать заново'))).toBe(false)
    expect(buttons.some(t => t.includes('Экспорт'))).toBe(false)
    expect(buttons.filter(t => t.includes('Отметить проверенной'))).toHaveLength(1)
  })

  it('operator (STAFF, not editor): export and re-OCR, no «Отметить проверенной»', async () => {
    const w = await mountSuspended(ViewerContext, { props: { ...base, canReview: false, canRetry: true } })
    expect(labels(w)).toContain('Распознать заново')
    expect(w.text()).not.toContain('Отметить проверенной')
  })

  it('reader: export only', async () => {
    const w = await mountSuspended(ViewerContext, { props: { ...base, canReview: false, canRetry: false } })
    expect(labels(w)).toEqual(['Скачать страницу', 'Текст (TXT)', 'Данные (JSON)', 'hOCR', 'ALTO XML', 'PDF с текстом'])
  })

  it('a page still recognising has no «Ещё ⋯» menu', async () => {
    const w = await mountSuspended(ViewerContext, { props: { ...base, page: { ...PAGE, status: 'running' }, canReview: true, canRetry: true } })
    expect(labels(w)).toBeNull()
  })
})
