import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { setActivePinia } from 'pinia'
import OpsShifrFields from '~/components/ops/OpsShifrFields.vue'
import OpsNewCaseModal from '~/components/ops/OpsNewCaseModal.vue'
import { USelectMenu } from '#components'
import type { ShifrInput } from '~/composables/useOps'
import type { PickerItem } from '~/composables/useOpsCases'
import { rankByNumber, yearsText } from '~/composables/useOpsCases'
import { useAuthStore } from '~/stores/auth'
import type { CaseDeloRow, Role, User } from '~/types/api'

// Stage 11a: the Фонд → Опись → Дело picker on /upload and in «Исправить шифр» (handoff §5.2 GET/POST /api/m1/cases).

const user = (role: Role): User => ({ id: 1, username: role, full_name: `${role} Демо`, role, role_ru: role })

function signIn(role: Role) {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  const auth = useAuthStore()
  auth.clear()
  auth.setUser(user(role))
}

// registerEndpoint runs on test-utils' own h3 (v1); its helpers come from the same alias.
async function h3() {
  // @ts-expect-error the alias is resolved by the test environment and has no type declaration
  return await import('#nuxt-test-utils/h3') as {
    getQuery: (e: unknown) => Record<string, string>
    readBody: (e: unknown) => Promise<unknown>
    setResponseStatus: (e: unknown, code: number) => void
  }
}

const FONDS = [
  { fond: 1, fond_creator: 'Акмолинский городской исполнительный комитет', n_opisi: 1, n_dela: 3 },
  { fond: 7, fond_creator: 'Акмолинский отдел народного образования', n_opisi: 1, n_dela: 4 },
]
const DELA_7_2: CaseDeloRow[] = [
  { delo: 3, title: 'Сведения о школах', year_from: 1935, year_to: 1935, access: 'open', leaves: 1 },
  { delo: 9, title: 'Отчёты школ Целинограда', year_from: 1962, year_to: 1962, access: 'open', leaves: 2 },
  { delo: 19, title: 'Списки учителей', year_from: 1936, year_to: 1937, access: 'open', leaves: 0 },
]
/** What the backend sends an operator for Ф.1 Оп.1: the restricted case is listed with `title: null`. */
const DELA_1_1_OPERATOR: CaseDeloRow[] = [
  { delo: 12, title: 'Протоколы заседаний горисполкома', year_from: 1954, year_to: 1954, access: 'open', leaves: 4 },
  { delo: 21, title: null, year_from: 1960, year_to: 1960, access: 'restricted', leaves: 1 },
]
const DELA_1_1_EDITOR: CaseDeloRow[] = [
  DELA_1_1_OPERATOR[0]!,
  { delo: 21, title: 'Личные дела сотрудников', year_from: 1960, year_to: 1960, access: 'restricted', leaves: 1 },
]

function casesEndpoint(dela11: CaseDeloRow[] = DELA_1_1_OPERATOR) {
  registerEndpoint('/api/m1/cases', async (event: unknown) => {
    const { getQuery } = await h3()
    const q = getQuery(event)
    if (!q.fond) return FONDS
    if (!q.opis) return q.fond === '7' ? [{ opis: 2, n_dela: 3 }] : [{ opis: 1, n_dela: 2 }]
    return q.fond === '7' ? DELA_7_2 : dela11
  })
  registerEndpoint('/api/m1/check-case', () => ({ found: true, title: 'Отчёты школ Целинограда' }))
}

async function mountFields(model: ShifrInput, props: Record<string, unknown> = {}) {
  const w: VueWrapper = await mountSuspended(OpsShifrFields, {
    props: {
      'modelValue': model,
      'onUpdate:modelValue': (v: ShifrInput) => w.setProps({ modelValue: v }),
      ...props,
    },
  })
  await flushPromises()
  return w
}

/** The three USelectMenu instances in cascade order: фонд, опись, дело. */
function selects(w: VueWrapper) {
  return w.findAllComponents(USelectMenu) as unknown as VueWrapper[]
}

function lastModel(w: VueWrapper): ShifrInput {
  const events = w.emitted('update:modelValue') ?? []
  return events[events.length - 1]![0] as ShifrInput
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('number-first search', () => {
  const items = [
    { num: 3, label: 'Д.3 — Сведения о школах, 1935', text: 'Сведения о школах' },
    { num: 9, label: 'Д.9 — Отчёты школ Целинограда, 1962', text: 'Отчёты школ Целинограда' },
    { num: 19, label: 'Д.19 — Списки учителей, 1936–1937', text: 'Списки учителей' },
    { num: 90, label: 'Д.90 — Протоколы', text: 'Протоколы' },
    { num: 4, label: 'Д.4 — Приказы 1929 года', text: 'Приказы 1929 года' },
  ]

  it('typing «9» puts Д.9 first, then numbers starting with 9, then titles containing 9 (years in the label do not match)', () => {
    expect(rankByNumber(items, '9').map(i => i.num)).toEqual([9, 90, 4])
  })

  it('a typed prefix is ignored and an empty term keeps the order', () => {
    expect(rankByNumber(items, 'Д.9')[0]!.num).toBe(9)
    expect(rankByNumber(items, '  ').map(i => i.num)).toEqual([3, 9, 19, 90, 4])
    expect(rankByNumber(items, 'учител').map(i => i.num)).toEqual([19])
  })

  it('years read as one year or a range', () => {
    expect(yearsText(1962, 1962)).toBe('1962')
    expect(yearsText(1936, 1937)).toBe('1936–1937')
    expect(yearsText(null, null)).toBe('')
  })
})

describe('the cascade', () => {
  it('loads the levels and labels them in plain words', async () => {
    signIn('operator')
    casesEndpoint()
    const w = await mountFields({ fond: '7', opis: '2', delo: '9' })
    await vi.waitFor(() => expect((selects(w)[2]!.props('items') as PickerItem[]).length).toBe(3))
    const [fond, opis, delo] = selects(w).map(s => s.props('items') as PickerItem[])
    expect(fond!.map(i => i.label)).toContain('Ф.7 — Акмолинский отдел народного образования')
    expect(opis!.map(i => i.label)).toEqual(['Оп.2 · 3 дела'])
    expect(delo!.map(i => i.label)).toContain('Д.9 — Отчёты школ Целинограда, 1962 · уже 2 листа')
    w.unmount()
  })

  it('picking a фонд clears опись and дело; picking an опись clears дело', async () => {
    signIn('operator')
    casesEndpoint()
    const w = await mountFields({ fond: '7', opis: '2', delo: '9' })
    await vi.waitFor(() => expect((selects(w)[2]!.props('items') as PickerItem[]).length).toBe(3))

    selects(w)[0]!.vm.$emit('update:modelValue', 1)
    await flushPromises()
    expect(lastModel(w)).toMatchObject({ fond: '1', opis: '', delo: '' })

    // Ф.1 has a single опись: it is selected for the user, дело stays empty.
    await vi.waitFor(() => expect(lastModel(w)).toMatchObject({ fond: '1', opis: '1', delo: '' }))

    selects(w)[2]!.vm.$emit('update:modelValue', 12)
    await flushPromises()
    expect(lastModel(w)).toMatchObject({ fond: '1', opis: '1', delo: '12' })

    selects(w)[1]!.vm.$emit('update:modelValue', 1)
    await flushPromises()
    expect(lastModel(w)).toMatchObject({ fond: '1', opis: '1', delo: '' })
    w.unmount()
  })

  it('a prefilled case missing from ЕАИС still shows in the cascade («Исправить шифр»)', async () => {
    signIn('operator')
    casesEndpoint()
    const w = await mountFields({ fond: '7', opis: '2', delo: '99', leaf: '3' }, { withLeaf: true, required: true })
    await vi.waitFor(() => expect((selects(w)[2]!.props('items') as PickerItem[]).length).toBe(4))
    expect(selects(w)[2]!.props('modelValue')).toBe(99)
    expect((selects(w)[2]!.props('items') as PickerItem[])[0]!.label).toBe('Д.99 — нет в списке ЕАИС')
    expect(selects(w)[0]!.props('modelValue')).toBe(7)
    w.unmount()
  })
})

describe('roles', () => {
  it('the operator gets the hint, never the create button, and a restricted case as a bare number without a lock', async () => {
    signIn('operator')
    casesEndpoint(DELA_1_1_OPERATOR)
    const w = await mountFields({ fond: '1', opis: '1', delo: '' })
    await vi.waitFor(() => expect((selects(w)[2]!.props('items') as PickerItem[]).length).toBe(2))
    expect(w.find('[data-testid="new-case"]').exists()).toBe(false)
    expect(w.findComponent(OpsNewCaseModal).exists()).toBe(false)
    expect(w.find('[data-testid="operator-hint"]').text()).toBe('Нет нужного дела? Попросите архивиста создать его в ЕАИС')
    const d21 = (selects(w)[2]!.props('items') as PickerItem[]).find(i => i.num === 21)!
    expect(d21.label).toBe('Д.21 · уже 1 лист')
    expect(d21.restricted).toBe(false)
    expect(w.html()).not.toContain('Личные дела')
    w.unmount()
  })

  it('an editor gets «Новое дело», no hint, and the restricted case with its title and lock', async () => {
    for (const role of ['archivist', 'admin'] as Role[]) {
      signIn(role)
      casesEndpoint(DELA_1_1_EDITOR)
      const w = await mountFields({ fond: '1', opis: '1', delo: '' })
      await vi.waitFor(() => expect((selects(w)[2]!.props('items') as PickerItem[]).length).toBe(2))
      expect(w.find('[data-testid="new-case"]').exists(), role).toBe(true)
      expect(w.find('[data-testid="operator-hint"]').exists(), role).toBe(false)
      const d21 = (selects(w)[2]!.props('items') as PickerItem[]).find(i => i.num === 21)!
      expect(d21.label, role).toBe('Д.21 — Личные дела сотрудников, 1960 · уже 1 лист')
      expect(d21.restricted, role).toBe(true)
      w.unmount()
    }
  })
})

describe('ЕАИС down', () => {
  it('a 503 shows the detail and falls back to the three number inputs', async () => {
    signIn('operator')
    registerEndpoint('/api/m1/cases', async (event: unknown) => {
      const { setResponseStatus } = await h3()
      setResponseStatus(event, 503)
      return { detail: 'ЕАИС недоступна (тест)' }
    })
    registerEndpoint('/api/m1/check-case', () => ({ found: null, detail: 'ЕАИС недоступна (тест)' }))
    const w = await mountFields({ fond: '', opis: '', delo: '' })
    await vi.waitFor(() => expect(w.find('[data-testid="shifr-manual"]').exists()).toBe(true))
    expect(w.find('[data-testid="shifr-manual"]').text()).toContain('ЕАИС недоступна (тест)')
    expect(selects(w)).toHaveLength(0)
    const inputs = w.findAll('input[inputmode="numeric"]')
    expect(inputs).toHaveLength(3)
    await inputs[0]!.setValue('7')
    await inputs[1]!.setValue('2')
    await inputs[2]!.setValue('9')
    expect(lastModel(w)).toMatchObject({ fond: '7', opis: '2', delo: '9' })
    w.unmount()
  })
})

describe('«Новое дело»', () => {
  async function mountModal() {
    signIn('archivist')
    const w: VueWrapper = await mountSuspended(OpsNewCaseModal, {
      props: {
        'open': true,
        'onUpdate:open': (v: boolean) => w.setProps({ open: v }),
        'fond': '7',
        'opis': '2',
        'suggestedDelo': 20,
      },
      attachTo: document.body,
    })
    await flushPromises()
    return w
  }
  const dialog = () => document.body.querySelector('[role="dialog"]')!
  const button = (label: string) => Array.from(dialog().querySelectorAll('button')).find(b => b.textContent?.trim() === label)!
  function fill(index: number, value: string) {
    const input = dialog().querySelectorAll('input')[index]!
    input.value = value
    input.dispatchEvent(new Event('input'))
  }

  it('prefills фонд, опись and the next free дело', async () => {
    const w = await mountModal()
    const values = Array.from(dialog().querySelectorAll('input')).map(i => i.value)
    expect(values.slice(0, 3)).toEqual(['7', '2', '20'])
    w.unmount()
  })

  it('a 409 offers the existing case and «Выбрать это дело» selects it', async () => {
    const posts: unknown[] = []
    registerEndpoint('/api/m1/cases', {
      method: 'POST',
      handler: async (event: unknown) => {
        const { readBody, setResponseStatus } = await h3()
        posts.push(await readBody(event))
        setResponseStatus(event, 409)
        return { detail: 'Такой шифр уже есть в ЕАИС' }
      },
    })
    const w = await mountModal()
    fill(2, '9')
    fill(3, 'Повтор')
    await flushPromises()
    button('Создать дело').click()
    await vi.waitFor(() => expect(dialog().querySelector('[data-testid="new-case-exists"]')).not.toBeNull())
    expect(posts).toEqual([{ fond: 7, opis: 2, delo: 9, title: 'Повтор', year_from: null, year_to: null }])
    expect(dialog().textContent).toContain('Такой шифр уже есть в ЕАИС')
    expect(dialog().textContent).toContain('Дело Ф.7 Оп.2 Д.9 уже есть в ЕАИС')
    // One primary at a time: the create button gives way to the pick.
    expect(button('Создать дело')).toBeUndefined()
    button('Выбрать это дело').click()
    await flushPromises()
    expect(w.emitted('pick')).toEqual([[{ fond: '7', opis: '2', delo: '9' }]])
    expect(w.emitted('created')).toBeUndefined()
    expect(w.props('open')).toBe(false)
    w.unmount()
  })

  it('a 201 emits the created case; a 400 shows the detail and keeps the modal open', async () => {
    let status = 400
    registerEndpoint('/api/m1/cases', {
      method: 'POST',
      handler: async (event: unknown) => {
        const { readBody, setResponseStatus } = await h3()
        const body = await readBody(event) as Record<string, unknown>
        setResponseStatus(event, status)
        return status === 400
          ? { detail: 'Год — четыре цифры (тест)' }
          : { ...body, year_from: body.year_from ?? null, year_to: body.year_to ?? null, access: 'open' }
      },
    })
    const w = await mountModal()
    fill(3, 'Новое дело')
    await flushPromises()
    button('Создать дело').click()
    await vi.waitFor(() => expect(dialog().textContent).toContain('Год — четыре цифры (тест)'))
    expect(w.emitted('created')).toBeUndefined()

    status = 201
    button('Создать дело').click()
    await vi.waitFor(() => expect(w.emitted('created')).toBeDefined())
    expect(w.emitted('created')![0]![0]).toMatchObject({ fond: 7, opis: 2, delo: 20, title: 'Новое дело' })
    w.unmount()
  })

  it('a title is required before anything is sent', async () => {
    const posts: unknown[] = []
    registerEndpoint('/api/m1/cases', { method: 'POST', handler: () => {
      posts.push(1)
      return {}
    } })
    const w = await mountModal()
    button('Создать дело').click()
    await flushPromises()
    expect(posts).toHaveLength(0)
    expect(dialog().textContent).toContain('Заполните поле')
    w.unmount()
  })
})
