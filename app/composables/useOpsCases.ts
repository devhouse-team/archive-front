import { onScopeDispose, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { CaseDeloRow, CaseFondRow, CaseOpisRow } from '~/types/api'
import type { ShifrInput } from '~/composables/useOps'
import { isDigits } from '~/composables/useOps'
import { isApiError } from '~/utils/api-error'
import { translate } from '~/composables/useT'

// Stage 11a: the Фонд → Опись → Дело cascade for /upload and «Исправить шифр» (handoff §5.2 GET /api/m1/cases).

/** One option in a picker select. `num` is the фонд/опись/дело number the search ranks first. */
export interface PickerItem {
  value: number
  num: number
  label: string
  /** Text the search matches after the number: the title or the фондообразователь, never years or counts. */
  text?: string
  restricted?: boolean
}

/**
 * Search inside a level: the number wins. «9» puts Д.9 first, then numbers starting with 9 (Д.90…), then titles
 * containing «9». A typed prefix («д.9», «оп 2», «ф7») is ignored. An empty term keeps the list order.
 */
export function rankByNumber<T extends Pick<PickerItem, 'num' | 'label' | 'text'>>(items: readonly T[], term: string): T[] {
  const s = term.trim().toLowerCase().replace(/^(?:ф|оп|д)\.?\s*/u, '').trim()
  if (!s) return [...items]
  const scored: { item: T, score: number }[] = []
  for (const item of items) {
    const n = String(item.num)
    let score = -1
    if (n === s) score = 0
    else if (n.startsWith(s)) score = 1
    else if ((item.text ?? item.label).toLowerCase().includes(s)) score = 2
    if (score >= 0) scored.push({ item, score })
  }
  return scored.sort((a, b) => a.score - b.score || a.item.num - b.item.num).map(x => x.item)
}

/** «1962», «1936–1937» or '' when the case has no years. */
export function yearsText(from: number | null, to: number | null): string {
  if (from == null && to == null) return ''
  if (from == null || to == null || from === to) return String(from ?? to)
  return `${from}–${to}`
}

export interface PickerLevel<T> {
  rows: Ref<T[] | null>
  loading: Ref<boolean>
}

/**
 * Loads the three levels as the шифр changes. Any failed level (503 «ЕАИС недоступна», 400, network) sets
 * `unavailable` to the message, and the fields fall back to number inputs; `retry()` tries the list again.
 * A 401 is handled by the shared client (background mode).
 */
export function useShifrCascade(model: Ref<ShifrInput>) {
  const api = useApi()
  const fonds = ref<CaseFondRow[] | null>(null)
  const opisi = ref<CaseOpisRow[] | null>(null)
  const dela = ref<CaseDeloRow[] | null>(null)
  const loading = ref({ fonds: false, opisi: false, dela: false })
  const unavailable = ref<string | null>(null)
  const seq = { fonds: 0, opisi: 0, dela: 0 }
  let disposed = false

  function fail(e: unknown) {
    if (isApiError(e) && e.kind === 'unauthorized') return
    unavailable.value = isApiError(e) ? e.message : translate('errors.network')
  }

  async function load<K extends keyof typeof seq, T>(level: K, target: Ref<T[] | null>, fetch: (() => Promise<T[]>) | null) {
    const mine = ++seq[level]
    if (!fetch) {
      target.value = null
      loading.value[level] = false
      return
    }
    loading.value[level] = true
    try {
      const rows = await fetch()
      if (disposed || mine !== seq[level]) return
      target.value = rows
    }
    catch (e) {
      if (disposed || mine !== seq[level]) return
      target.value = null
      fail(e)
    }
    finally {
      if (!disposed && mine === seq[level]) loading.value[level] = false
    }
  }

  const num = (v: string) => (isDigits(v.trim()) ? Number(v.trim()) : null)

  function loadFonds() {
    return load('fonds', fonds, () => api.m1.fonds())
  }
  function loadOpisi() {
    const f = num(model.value.fond)
    return load('opisi', opisi, f === null ? null : () => api.m1.opisi(f))
  }
  function loadDela() {
    const f = num(model.value.fond)
    const o = num(model.value.opis)
    return load('dela', dela, f === null || o === null ? null : () => api.m1.cases(f, o))
  }

  watch(() => model.value.fond.trim(), () => void loadOpisi())
  watch(() => `${model.value.fond.trim()}/${model.value.opis.trim()}`, () => void loadDela())

  /** All three levels again (after «Повторить» or a new case). */
  async function refresh() {
    unavailable.value = null
    await Promise.all([loadFonds(), loadOpisi(), loadDela()])
  }

  void refresh()
  onScopeDispose(() => {
    disposed = true
  })

  return { fonds, opisi, dela, loading, unavailable, refresh }
}
