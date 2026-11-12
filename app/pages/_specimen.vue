<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { ACCESS } from '~/utils/access'
import { headerButtonClass, headerInputUi, railNavUi } from '~/utils/civic-ui'
import { formatDuration } from '~/utils/format'
import { navForRole } from '~/utils/nav'
import { FILE_STATUS, LANGS, PAGE_STATUS, REVIEW_STATUS } from '~/utils/status'
import type { StatusView } from '~/utils/status'
import type { Lang } from '~/types/api'

// Dev-only token specimen (removed from production builds in nuxt.config.ts). Proves the Stage 2 theme:
// colours, lg controls, status badges, type, and the civic rail/header states.
definePageMeta({ roles: ACCESS.specimen, title: 'pages.specimen' })

const { t } = useT()
const arabicDir = useLangDir('kk-arab')
const { notify } = useNotify()
const readyToIssue = ref(false)

// ShifrPlate samples (brief 4 §5), including the long values the plate must survive.
const shifrPage = { fond: 1, opis: 1, delo: 15, leaf: 3 }
const shifrLong = { fond: 1234, opis: 12, delo: 10345, leaf: 999 }
const shifrNoLeaf = { fond: 7, opis: 2, delo: 4 }

const semantic = [
  { name: 'specimen.swatch.primary', token: 'primary · action-600', cls: 'bg-primary' },
  { name: 'specimen.swatch.secondary', token: 'secondary · civic-800', cls: 'bg-secondary' },
  { name: 'specimen.swatch.success', token: 'success · green-800', cls: 'bg-success' },
  { name: 'specimen.swatch.warning', token: 'warning · amber-800', cls: 'bg-warning' },
  { name: 'specimen.swatch.error', token: 'error · red-800', cls: 'bg-error' },
  { name: 'specimen.swatch.info', token: 'info · slate-700', cls: 'bg-info' },
  { name: 'specimen.swatch.neutral', token: 'bg-inverted · slate-700', cls: 'bg-inverted' },
] as const

const aliases = [
  { name: 'specimen.swatch.rail', token: 'bg-rail', cls: 'bg-rail' },
  { name: 'specimen.swatch.railActive', token: 'bg-rail-active', cls: 'bg-rail-active' },
  { name: 'specimen.swatch.railMuted', token: 'bg-rail-muted', cls: 'bg-rail-muted' },
  { name: 'specimen.swatch.railField', token: 'bg-rail-field', cls: 'bg-rail-field' },
  { name: 'specimen.swatch.locator', token: 'bg-locator', cls: 'bg-locator' },
  { name: 'specimen.swatch.ink', token: 'bg-ink', cls: 'bg-ink' },
  { name: 'specimen.swatch.hit', token: 'bg-hit', cls: 'bg-hit' },
  { name: 'specimen.swatch.scanPane', token: 'bg-scan-pane', cls: 'bg-scan-pane' },
  { name: 'specimen.swatch.meter', token: 'bg-meter', cls: 'bg-meter' },
  { name: 'specimen.swatch.meterTrack', token: 'bg-meter-track', cls: 'bg-meter-track' },
  { name: 'specimen.swatch.lowconfFill', token: 'bg-lowconf-fill', cls: 'bg-lowconf-fill' },
  { name: 'specimen.swatch.eaisOk', token: 'bg-eais-ok', cls: 'bg-eais-ok' },
] as const

const surfaces = [
  { name: 'specimen.swatch.ground', token: 'bg-muted · slate-50', cls: 'bg-muted' },
  { name: 'specimen.swatch.panel', token: 'bg-default · white', cls: 'bg-default' },
  { name: 'specimen.swatch.elevated', token: 'bg-elevated · slate-100', cls: 'bg-elevated' },
] as const

const textTones = [
  { name: 'specimen.text.default', cls: 'text-default' },
  { name: 'specimen.text.toned', cls: 'text-toned' },
  { name: 'specimen.text.muted', cls: 'text-muted' },
  { name: 'specimen.text.dimmed', cls: 'text-dimmed' },
] as const

const typeScale = [
  { size: 12, cls: 'text-[12px]' },
  { size: 13, cls: 'text-[13px]' },
  { size: 14, cls: 'text-[14px]' },
  { size: 16, cls: 'text-[16px]' },
  { size: 18, cls: 'text-[18px]' },
  { size: 22, cls: 'text-[22px] font-semibold' },
  { size: 28, cls: 'text-[28px] font-bold' },
] as const

const statusGroups: Array<{ title: Parameters<typeof t>[0], items: StatusView[] }> = [
  { title: 'specimen.statusGroups.file', items: Object.values(FILE_STATUS) },
  { title: 'specimen.statusGroups.page', items: Object.values(PAGE_STATUS) },
  { title: 'specimen.statusGroups.review', items: Object.values(REVIEW_STATUS) },
]

const langItems = LANGS.map(l => ({ label: t(`langsFull.${l}`), value: l }))
const lang = ref<Lang>('kk-cyrl')
const onlyUnreviewed = ref(true)
const wordBoxes = ref(false)
const fuzzy = ref<'0' | '1' | '2'>('0')
const fuzzyItems = [
  { label: t('specimen.controls.fuzzy0'), value: '0' },
  { label: t('specimen.controls.fuzzy1'), value: '1' },
  { label: t('specimen.controls.fuzzy2'), value: '2' },
]

/** Group label parts for the bilingual «Қор · Фонд» label (the Kazakh half carries lang="kk"). */
function groupParts(item: unknown): { kk: string, ru: string } {
  const g = item as { kk?: string, ru?: string }
  return { kk: g.kk ?? '', ru: g.ru ?? '' }
}

const railItems = computed<NavigationMenuItem[]>(() => navForRole('admin').flatMap(group => [
  { type: 'label' as const, slot: 'group', label: `${t(group.labelKk)} · ${t(group.labelRu)}`, kk: t(group.labelKk), ru: t(group.labelRu) },
  ...group.items.map(item => ({
    label: t(item.label),
    icon: item.icon,
    to: item.to,
    // The specimen marks «Поиск» as the current item so the active state is visible.
    active: item.id === 'search',
    badge: item.counter === 'errors'
      ? { label: '4', color: 'error' as const, variant: 'solid' as const, size: 'sm' as const, class: 'tabular-nums' }
      : item.counter === 'review'
        ? { label: '1', color: 'neutral' as const, variant: 'solid' as const, size: 'sm' as const, class: 'tabular-nums' }
        : undefined,
  })),
]))
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <header class="flex flex-col gap-2">
      <h1 class="text-[28px] font-bold text-highlighted">
        {{ t('pages.specimen') }}
      </h1>
      <p class="max-w-[70ch] text-sm text-muted">
        {{ t('specimen.intro') }}
      </p>
    </header>

    <!-- Colours -->
    <section
      class="flex flex-col gap-5 rounded-lg bg-default p-6"
      aria-labelledby="sp-colors"
    >
      <h2
        id="sp-colors"
        class="text-[18px] font-semibold text-highlighted"
      >
        {{ t('specimen.sections.colors') }}
      </h2>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-3 gap-y-4">
        <li
          v-for="s in semantic"
          :key="s.token"
          class="flex flex-col gap-1.5"
        >
          <span
            :class="[s.cls, 'h-12 rounded-md']"
            aria-hidden="true"
          />
          <span class="text-[13px] font-medium text-highlighted">{{ t(s.name) }}</span>
          <span class="font-plate text-[12px] text-muted">{{ s.token }}</span>
        </li>
      </ul>

      <h3 class="pt-2 text-[14px] font-semibold text-highlighted">
        {{ t('specimen.sections.aliases') }}
      </h3>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-3 gap-y-4">
        <li
          v-for="s in aliases"
          :key="s.token"
          class="flex flex-col gap-1.5"
        >
          <span
            :class="[s.cls, 'h-12 rounded-md ring-1 ring-inset ring-default']"
            aria-hidden="true"
          />
          <span class="text-[13px] font-medium text-highlighted">{{ t(s.name) }}</span>
          <span class="font-plate text-[12px] text-muted">{{ s.token }}</span>
        </li>
      </ul>

      <h3 class="pt-2 text-[14px] font-semibold text-highlighted">
        {{ t('specimen.sections.surfaces') }}
      </h3>
      <div class="grid gap-3 md:grid-cols-3">
        <div
          v-for="s in surfaces"
          :key="s.token"
          :class="[s.cls, 'flex flex-col gap-1 rounded-md p-4 ring-1 ring-inset ring-default']"
        >
          <span class="text-[13px] font-medium text-highlighted">{{ t(s.name) }} · <span class="font-plate font-normal text-muted">{{ s.token }}</span></span>
          <span
            v-for="tone in textTones"
            :key="tone.cls"
            :class="[tone.cls, 'text-[14px]']"
          >
            {{ t(tone.name) }}
          </span>
          <ULink
            to="/_specimen"
            class="text-[14px] text-primary underline underline-offset-3"
          >
            {{ t('specimen.text.link') }}
          </ULink>
        </div>
      </div>
    </section>

    <!-- Controls -->
    <section
      class="flex flex-col gap-5 rounded-lg bg-default p-6"
      aria-labelledby="sp-controls"
    >
      <h2
        id="sp-controls"
        class="text-[18px] font-semibold text-highlighted"
      >
        {{ t('specimen.sections.controls') }}
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          id="sp-btn-primary"
          icon="i-lucide-check"
          :label="t('specimen.controls.primary')"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          :label="t('specimen.controls.outline')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('specimen.controls.ghost')"
        />
        <UButton
          id="sp-btn-error"
          color="error"
          icon="i-lucide-trash-2"
          :label="t('specimen.controls.danger')"
        />
        <UButton
          disabled
          :label="t('specimen.controls.disabled')"
        />
        <UButton
          loading
          :label="t('specimen.controls.loading')"
        />
        <UButton
          id="sp-toast"
          color="neutral"
          variant="outline"
          icon="i-lucide-bell-ring"
          :label="t('specimen.controls.toast')"
          @click="notify(t('specimen.controls.toastMessage'), 'error')"
        />
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <UFormField :label="t('specimen.controls.inputLabel')">
          <UInput
            :placeholder="t('specimen.controls.inputPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('specimen.controls.selectLabel')">
          <USelect
            v-model="lang"
            :items="langItems"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('specimen.controls.textareaLabel')">
          <UTextarea
            :rows="1"
            autoresize
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="flex flex-wrap items-start gap-x-8 gap-y-4">
        <UCheckbox
          id="sp-checkbox"
          v-model="onlyUnreviewed"
          :label="t('specimen.controls.checkbox')"
        />
        <USwitch
          id="sp-switch"
          v-model="wordBoxes"
          :label="t('specimen.controls.switch')"
        />
        <URadioGroup
          id="sp-radio"
          v-model="fuzzy"
          :legend="t('specimen.controls.radioLabel')"
          :items="fuzzyItems"
        />
        <UCheckbox
          id="sp-checkbox-required"
          v-model="readyToIssue"
          required
          :label="t('specimen.controls.checkboxRequired')"
        >
          <template #description>
            {{ t('specimen.controls.checkboxRequiredHint') }}
            <ULink
              id="sp-checkbox-link"
              to="#sp-shifr"
              class="text-primary underline underline-offset-2"
            >{{ t('specimen.controls.checkboxRequiredLink') }}</ULink>
          </template>
        </UCheckbox>
      </div>
    </section>

    <!-- Statuses -->
    <section
      class="flex flex-col gap-4 rounded-lg bg-default p-6"
      aria-labelledby="sp-statuses"
    >
      <h2
        id="sp-statuses"
        class="text-[18px] font-semibold text-highlighted"
      >
        {{ t('specimen.sections.statuses') }}
      </h2>
      <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
        <template
          v-for="group in statusGroups"
          :key="group.title"
        >
          <dt class="text-[13px] text-muted">
            {{ t(group.title) }}
          </dt>
          <dd class="flex flex-wrap gap-2">
            <UBadge
              v-for="s in group.items"
              :key="s.label"
              :color="s.color"
              variant="soft"
              :icon="s.icon"
              :label="t(s.label)"
              :ui="s.icon ? { leadingIcon: 'animate-spin motion-reduce:animate-none' } : undefined"
            />
          </dd>
        </template>
        <dt class="text-[13px] text-muted">
          {{ t('specimen.statusGroups.lang') }}
        </dt>
        <dd class="flex flex-wrap gap-2">
          <UBadge
            v-for="l in LANGS"
            :key="l"
            color="neutral"
            variant="outline"
            :label="t(`langs.${l}`)"
            :title="t(`langsFull.${l}`)"
          />
        </dd>
        <dt class="text-[13px] text-muted">
          {{ t('specimen.statusGroups.counts') }}
        </dt>
        <dd class="flex flex-wrap items-center gap-2">
          <UBadge
            color="neutral"
            variant="solid"
            label="12"
            class="tabular-nums"
          />
          <UBadge
            color="error"
            variant="solid"
            label="4"
            class="tabular-nums"
          />
          <UBadge
            color="warning"
            variant="soft"
            icon="i-lucide-timer"
            :label="t('status.retryIn', { time: formatDuration(42) })"
            class="tabular-nums"
          />
          <UBadge
            color="neutral"
            variant="soft"
            icon="i-lucide-lock"
            :label="t('access.restricted')"
          />
        </dd>
      </dl>
    </section>

    <!-- Type -->
    <section
      class="flex flex-col gap-5 rounded-lg bg-default p-6"
      aria-labelledby="sp-type"
    >
      <h2
        id="sp-type"
        class="text-[18px] font-semibold text-highlighted"
      >
        {{ t('specimen.sections.type') }}
      </h2>
      <p class="text-[13px] text-muted">
        {{ t('specimen.typeScale') }}
      </p>
      <ul class="flex flex-col gap-2">
        <li
          v-for="step in typeScale"
          :key="step.size"
          class="grid grid-cols-[4rem_1fr] items-baseline gap-4"
        >
          <span class="font-plate text-[12px] text-muted tabular-nums">{{ t('specimen.sizeLabel', { size: step.size }) }}</span>
          <span :class="[step.cls, 'text-highlighted']">{{ t('specimen.samples.title') }}</span>
        </li>
      </ul>
      <div class="grid gap-4 border-t border-default pt-5 md:grid-cols-2">
        <p
          lang="ru"
          class="text-[16px] text-default"
        >
          {{ t('specimen.samples.ru') }}
        </p>
        <p
          lang="kk"
          class="text-[16px] text-default"
        >
          {{ t('specimen.samples.kk') }}
        </p>
        <p
          lang="kk-Latn"
          class="text-[16px] text-default"
        >
          {{ t('specimen.samples.yanalif') }}
        </p>
        <figure class="flex flex-col gap-1">
          <p
            lang="kk-Arab"
            :dir="arabicDir"
            class="font-arabic text-[18px] leading-[1.9] text-default"
          >
            {{ t('specimen.samples.arabic') }}
          </p>
          <figcaption class="text-[12px] text-muted">
            {{ t('specimen.samples.arabicCaption') }}
          </figcaption>
        </figure>
        <p class="flex items-baseline gap-3">
          <span class="font-plate text-[10px] font-medium uppercase tracking-[0.06em] text-secondary">
            <span lang="kk">{{ t('plate.fond.kk') }}</span> · {{ t('plate.fond.ru') }}
          </span>
          <span class="text-[12px] text-muted">{{ t('specimen.samples.plate') }}</span>
        </p>
        <p class="text-[14px] text-secondary tabular-nums">
          {{ t('specimen.samples.numbers') }}
        </p>
      </div>
    </section>

    <!-- Civic rail and header -->
    <section
      class="flex flex-col gap-4 rounded-lg bg-default p-6"
      aria-labelledby="sp-civic"
    >
      <h2
        id="sp-civic"
        class="text-[18px] font-semibold text-highlighted"
      >
        {{ t('specimen.sections.civic') }}
      </h2>
      <p class="text-[13px] text-muted">
        {{ t('specimen.civic.hint') }}
      </p>
      <div
        id="civic-preview"
        class="grid grid-cols-[220px_1fr] overflow-hidden rounded-lg ring-1 ring-default"
      >
        <nav
          class="bg-rail pb-4"
          :aria-label="t('nav.label')"
        >
          <UNavigationMenu
            orientation="vertical"
            :items="railItems"
            :ui="railNavUi"
          >
            <template #group-label="{ item }">
              <span lang="kk">{{ groupParts(item).kk }}</span> · {{ groupParts(item).ru }}
            </template>
          </UNavigationMenu>
        </nav>
        <div class="flex min-w-0 flex-col">
          <header
            id="civic-header-online"
            class="flex h-14 items-center gap-3 bg-rail px-4"
          >
            <UInput
              icon="i-lucide-search"
              :placeholder="t('specimen.civic.searchPlaceholder')"
              :aria-label="t('specimen.civic.searchLabel')"
              :ui="headerInputUi"
              class="w-72"
            />
            <div class="ms-auto flex items-center gap-2">
              <span class="flex items-center gap-2 px-2 text-[13px] text-white">
                <span
                  class="size-2.5 rounded-full bg-eais-ok ring-[1.5px] ring-white"
                  aria-hidden="true"
                />
                {{ t('eais.online') }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-bell"
                :aria-label="t('notifications.open', { count: 4 })"
                :class="headerButtonClass"
              >
                <template #trailing>
                  <UBadge
                    color="neutral"
                    variant="solid"
                    size="sm"
                    label="4"
                    class="tabular-nums"
                  />
                </template>
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-chevron-down"
                :label="t('specimen.civic.user')"
                :aria-label="t('auth.userMenu')"
                :class="headerButtonClass"
              />
            </div>
          </header>
          <header
            id="civic-header-down"
            class="flex h-14 items-center gap-3 border-t border-rail-active bg-rail px-4"
          >
            <UInput
              icon="i-lucide-search"
              :placeholder="t('specimen.civic.searchPlaceholder')"
              :aria-label="t('specimen.civic.searchLabel')"
              :ui="headerInputUi"
              class="w-72"
            />
            <div class="ms-auto flex items-center gap-2">
              <span
                class="flex items-center gap-2 px-2 text-[13px] text-white tabular-nums"
                :title="t('eais.downHint')"
              >
                <UBadge
                  color="error"
                  variant="solid"
                  icon="i-lucide-cloud-off"
                  :label="t('eais.down')"
                />
                {{ t('eais.retryIn', { time: formatDuration(42) }) }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-bell"
                :aria-label="t('notifications.open', { count: 0 })"
                :class="headerButtonClass"
              />
            </div>
          </header>
          <div class="flex-1 bg-muted p-6" />
        </div>
      </div>
    </section>

    <!-- ShifrPlate -->
    <section
      class="flex flex-col gap-5 rounded-lg bg-default p-6"
      aria-labelledby="sp-shifr"
    >
      <h2
        id="sp-shifr"
        class="text-[18px] font-semibold text-highlighted"
      >
        {{ t('specimen.sections.shifr') }}
      </h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="flex flex-col gap-2">
          <p class="text-[13px] text-muted">
            {{ t('specimen.shifr.page') }}
          </p>
          <ShifrPlate
            id="sp-plate-page"
            :shifr="shifrPage"
            current="leaf"
            :delo-id="1"
          />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-[13px] text-muted">
            {{ t('specimen.shifr.long') }}
          </p>
          <ShifrPlate
            id="sp-plate-long"
            :shifr="shifrLong"
            current="leaf"
            :delo-id="1"
          />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-[13px] text-muted">
            {{ t('specimen.shifr.noLeaf') }}
          </p>
          <ShifrPlate
            id="sp-plate-noleaf"
            :shifr="shifrNoLeaf"
            current="delo"
          />
        </div>
        <div class="flex w-80 flex-col gap-2">
          <p class="text-[13px] text-muted">
            {{ t('specimen.shifr.narrow') }}
          </p>
          <ShifrPlate
            id="sp-plate-narrow"
            :shifr="shifrLong"
            current="leaf"
            :delo-id="1"
          />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-[13px] text-muted">
            {{ t('specimen.shifr.compact') }}
          </p>
          <ul class="flex flex-col gap-1 text-sm">
            <li>
              <ShifrPlate
                :shifr="shifrPage"
                variant="compact"
              />
            </li>
            <li>
              <ShifrPlate
                :shifr="shifrLong"
                variant="compact"
              />
            </li>
            <li>
              <ShifrPlate
                :shifr="shifrNoLeaf"
                variant="compact"
              />
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
