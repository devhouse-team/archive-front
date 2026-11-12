<script setup lang="ts">
import type { CreatedCase } from '~/types/api'
import type { CaseCheckState, ShifrField, ShifrFieldErrors, ShifrInput } from '~/composables/useOps'
import { isDigits, shifrErrors, useCaseCheck } from '~/composables/useOps'
import type { PickerItem } from '~/composables/useOpsCases'
import { rankByNumber, useShifrCascade, yearsText } from '~/composables/useOpsCases'
import { useAuthStore } from '~/stores/auth'
import { plural } from '~/utils/format'

// Шифр for the upload form (optional) and the «Исправить шифр» modal (required): Фонд → Опись → Дело picked from
// ЕАИС (handoff §5.2 GET /api/m1/cases), the live «Дело в ЕАИС: …» check under them, and «Новое дело» for editors.
// When the list cannot load (ЕАИС down → 503, 400, network) the fields fall back to number inputs.
const props = withDefaults(defineProps<{
  withLeaf?: boolean
  /** fond/opis/delo must be filled. */
  required?: boolean
  /** Show "required" errors (after a submit attempt). Digit errors show while typing. */
  showRequired?: boolean
}>(), { withLeaf: false, required: false, showRequired: false })

const model = defineModel<ShifrInput>({ required: true })
// The parent (the upload form) asks before sending to a case ЕАИС does not know.
const emit = defineEmits<{ check: [state: CaseCheckState] }>()
const { t } = useT()
const { notify } = useNotify()
const auth = useAuthStore()
const isEditor = computed(() => auth.isEditor)
const uid = useId()

const errors = computed<ShifrFieldErrors>(() => shifrErrors(model.value, props.required))
const { result: check } = useCaseCheck(model)
watch(check, c => emit('check', c), { immediate: true })

const cascade = useShifrCascade(model)
const { fonds, opisi, dela, loading, unavailable } = cascade
const manual = computed(() => unavailable.value !== null)

function errorFor(id: ShifrField): string | undefined {
  const e = errors.value[id]
  if (e === 'digits') return t('upload.digitsOnly')
  if (e === 'required' && props.showRequired) return props.required ? t('upload.required') : t('upload.shifrIncomplete')
  return undefined
}

function update(id: ShifrField, value: string | number | null | undefined) {
  model.value = { ...model.value, [id]: value == null ? '' : String(value) }
}

// ---------- picker ----------
const asNum = (v: string) => (isDigits(v.trim()) ? Number(v.trim()) : undefined)

/** A prefilled value missing from the ЕАИС list (the «Исправить шифр» row) still shows, marked as not listed. */
function withCurrent(items: PickerItem[], current: number | undefined, label: string): PickerItem[] {
  if (current === undefined || items.some(i => i.value === current)) return items
  return [{ value: current, num: current, label: t('upload.picker.notListed', { label }) }, ...items]
}

const fondItems = computed<PickerItem[]>(() => withCurrent(
  (fonds.value ?? []).map(r => ({
    value: r.fond,
    num: r.fond,
    text: r.fond_creator,
    label: r.fond_creator ? t('upload.picker.fond', { fond: r.fond, creator: r.fond_creator }) : t('upload.picker.fondBare', { fond: r.fond }),
  })),
  asNum(model.value.fond),
  t('upload.picker.fondBare', { fond: model.value.fond.trim() }),
))

const opisItems = computed<PickerItem[]>(() => withCurrent(
  (opisi.value ?? []).map(r => ({
    value: r.opis,
    num: r.opis,
    text: '',
    label: t('upload.picker.opis', { opis: r.opis, count: plural('upload.picker.plural.delo', r.n_dela) }),
  })),
  opisi.value ? asNum(model.value.opis) : undefined,
  `${t('upload.opis')} ${model.value.opis.trim()}`,
))

/** «Д.9 — Отчёты школ Целинограда, 1962 · уже 2 листа». A restricted case without a title (operator) is «Д.21». */
const deloItems = computed<PickerItem[]>(() => withCurrent(
  (dela.value ?? []).map((r) => {
    const restricted = r.access === 'restricted'
    let label = r.title
      ? t('upload.picker.deloTitle', { delo: r.delo, title: r.title })
      : t('upload.picker.delo', { delo: r.delo })
    const years = r.title ? yearsText(r.year_from, r.year_to) : ''
    if (years) label += `, ${years}`
    if (r.leaves > 0) label += ` · ${t('upload.picker.leaves', { count: plural('plural.leaf', r.leaves) })}`
    // The lock is for editors only (handoff §2); the operator's row is the bare number.
    return { value: r.delo, num: r.delo, label, text: r.title ?? '', restricted: restricted && isEditor.value }
  }),
  dela.value ? asNum(model.value.delo) : undefined,
  t('upload.picker.delo', { delo: model.value.delo.trim() }),
))

const search = ref({ fond: '', opis: '', delo: '' })
const shown = computed(() => ({
  fond: rankByNumber(fondItems.value, search.value.fond),
  opis: rankByNumber(opisItems.value, search.value.opis),
  delo: rankByNumber(deloItems.value, search.value.delo),
}))

// Picking a фонд clears опись and дело; picking an опись clears дело.
function pickFond(v: number | null | undefined) {
  model.value = { ...model.value, fond: v == null ? '' : String(v), opis: '', delo: '' }
}
function pickOpis(v: number | null | undefined) {
  model.value = { ...model.value, opis: v == null ? '' : String(v), delo: '' }
}
function pickDelo(v: number | null | undefined) {
  update('delo', v)
}

// A фонд with a single опись: select it, one click fewer.
watch(opisi, (rows) => {
  if (rows?.length === 1 && model.value.opis.trim() === '' && model.value.fond.trim() !== '') pickOpis(rows[0]!.opis)
})

const fondChosen = computed(() => asNum(model.value.fond) !== undefined)
const opisChosen = computed(() => fondChosen.value && asNum(model.value.opis) !== undefined)

function placeholder(level: 'fond' | 'opis' | 'delo'): string {
  if (level === 'opis' && !fondChosen.value) return t('upload.picker.opisFirst')
  if (level === 'delo' && !opisChosen.value) return t('upload.picker.deloFirst')
  if (loading.value[level === 'fond' ? 'fonds' : level === 'opis' ? 'opisi' : 'dela']) return t('upload.picker.loading')
  const rows = level === 'fond' ? fonds.value : level === 'opis' ? opisi.value : dela.value
  if (rows && rows.length === 0) {
    return t(level === 'fond' ? 'upload.picker.noFonds' : level === 'opis' ? 'upload.picker.noOpisi' : 'upload.picker.noDela')
  }
  return t(level === 'fond' ? 'upload.picker.fondPlaceholder' : level === 'opis' ? 'upload.picker.opisPlaceholder' : 'upload.picker.deloPlaceholder')
}

const levels = computed(() => [
  {
    id: 'fond' as const,
    label: t('upload.fond'),
    items: shown.value.fond,
    value: asNum(model.value.fond),
    disabled: false,
    loading: loading.value.fonds,
    pick: pickFond,
  },
  {
    id: 'opis' as const,
    label: t('upload.opis'),
    items: shown.value.opis,
    value: asNum(model.value.opis),
    disabled: !fondChosen.value || (!loading.value.opisi && !opisItems.value.length),
    loading: loading.value.opisi,
    pick: pickOpis,
  },
  {
    id: 'delo' as const,
    label: t('upload.delo'),
    items: shown.value.delo,
    value: asNum(model.value.delo),
    disabled: !opisChosen.value || (!loading.value.dela && !deloItems.value.length),
    loading: loading.value.dela,
    pick: pickDelo,
  },
])

const anyChosen = computed(() => [model.value.fond, model.value.opis, model.value.delo].some(v => v.trim() !== ''))
function clearAll() {
  model.value = { ...model.value, fond: '', opis: '', delo: '' }
}

// ---------- «Новое дело» (editors) ----------
const newCaseOpen = ref(false)
const suggestedDelo = computed(() => {
  if (!opisChosen.value || !dela.value) return null
  return dela.value.reduce((m, r) => Math.max(m, r.delo), 0) + 1
})

async function selectCase(fond: string, opis: string, delo: string) {
  model.value = { ...model.value, fond, opis, delo }
  await cascade.refresh()
}

async function onCreated(c: CreatedCase) {
  notify(t('upload.newCase.created', { shifr: `Ф.${c.fond} Оп.${c.opis} Д.${c.delo}` }), 'success')
  await selectCase(String(c.fond), String(c.opis), String(c.delo))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- ЕАИС down or the list failed: the server's detail, a retry, and the plain number inputs. -->
    <template v-if="manual">
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-cloud-off"
        :title="unavailable ?? undefined"
        :description="t('upload.picker.manualHint')"
        :actions="[{ label: t('upload.picker.retry'), color: 'error', variant: 'outline', onClick: () => cascade.refresh() }]"
        data-testid="shifr-manual"
      />
      <div
        class="grid gap-3"
        :class="withLeaf ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'"
      >
        <UFormField
          v-for="f in (withLeaf ? ['fond', 'opis', 'delo', 'leaf'] as const : ['fond', 'opis', 'delo'] as const)"
          :key="f"
          :label="t(`upload.${f}`)"
          :error="errorFor(f)"
          :name="f"
          :required="required && f !== 'leaf'"
          :ui="{ error: 'text-xs' }"
        >
          <UInput
            :model-value="model[f] ?? ''"
            inputmode="numeric"
            autocomplete="off"
            maxlength="9"
            class="w-full"
            :ui="{ base: 'tabular-nums' }"
            @update:model-value="update(f, $event)"
          />
        </UFormField>
      </div>
    </template>

    <template v-else>
      <UFormField
        v-for="lvl in levels"
        :key="lvl.id"
        :label="lvl.label"
        :error="errorFor(lvl.id)"
        :name="lvl.id"
        :required="required"
        :ui="{ error: 'text-xs' }"
      >
        <div class="flex items-start gap-2">
          <USelectMenu
            :id="`${uid}-${lvl.id}`"
            v-model:search-term="search[lvl.id]"
            :model-value="lvl.value"
            :items="lvl.items"
            value-key="value"
            label-key="label"
            ignore-filter
            :disabled="lvl.disabled"
            :loading="lvl.loading"
            :placeholder="placeholder(lvl.id)"
            :search-input="{ placeholder: t('upload.picker.search'), icon: 'i-lucide-search' }"
            :data-testid="`pick-${lvl.id}`"
            class="min-w-0 flex-1"
            :ui="{ base: 'tabular-nums', content: 'min-w-(--reka-combobox-trigger-width) max-w-[min(42rem,90vw)]', item: 'min-h-9', itemLabel: 'whitespace-normal tabular-nums' }"
            @update:model-value="lvl.pick($event as number | null | undefined)"
          >
            <template #item-label="{ item }">
              <span dir="auto">{{ (item as PickerItem).label }}</span>
            </template>
            <template #item-trailing="{ item }">
              <UBadge
                v-if="(item as PickerItem).restricted"
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-lock"
                :label="t('access.restricted')"
              />
            </template>
            <template #empty>
              {{ t('upload.picker.noMatch') }}
            </template>
          </USelectMenu>
          <UButton
            v-if="lvl.id === 'delo' && isEditor"
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            :label="t('upload.picker.newCase')"
            data-testid="new-case"
            @click="newCaseOpen = true"
          />
        </div>
        <template
          v-if="lvl.id === 'delo' && !isEditor"
          #help
        >
          <span
            class="flex items-start gap-1.5 text-muted"
            data-testid="operator-hint"
          >
            <UIcon
              name="i-lucide-info"
              class="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {{ t('upload.picker.operatorHint') }}
          </span>
        </template>
      </UFormField>

      <UFormField
        v-if="withLeaf"
        :label="t('upload.leaf')"
        :error="errorFor('leaf')"
        name="leaf"
        :ui="{ error: 'text-xs' }"
        class="max-w-40"
      >
        <UInput
          :model-value="model.leaf ?? ''"
          inputmode="numeric"
          autocomplete="off"
          maxlength="9"
          class="w-full"
          :ui="{ base: 'tabular-nums' }"
          @update:model-value="update('leaf', $event)"
        />
      </UFormField>
    </template>

    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <OpsCaseCheck
        :check="check"
        class="self-center"
      />
      <UButton
        v-if="!required && !manual && anyChosen"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        :label="t('upload.picker.clear')"
        data-testid="shifr-clear"
        @click="clearAll"
      />
    </div>

    <OpsNewCaseModal
      v-if="isEditor"
      v-model:open="newCaseOpen"
      :fond="model.fond"
      :opis="model.opis"
      :suggested-delo="suggestedDelo"
      @created="onCreated"
      @pick="selectCase($event.fond, $event.opis, $event.delo)"
    />
  </div>
</template>
