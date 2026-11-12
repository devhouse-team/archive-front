import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { Lang } from '~/types/api'

export type TextDir = 'rtl' | 'ltr' | 'auto'
/** 'mixed' marks a list whose items can be in any script (search snippets, collection titles). */
export type LangOrMixed = Lang | 'mixed'

const LTR: readonly string[] = ['ru', 'kk-cyrl', 'kk-latn']

/**
 * Handoff §4: kk-arab is right-to-left; mixed or unknown content gets dir="auto"
 * so the browser picks the direction from the first strong character.
 */
export function langDir(lang: LangOrMixed | string | null | undefined): TextDir {
  if (lang === 'kk-arab') return 'rtl'
  if (lang && LTR.includes(lang)) return 'ltr'
  return 'auto'
}

export function useLangDir(lang: MaybeRefOrGetter<LangOrMixed | string | null | undefined>): ComputedRef<TextDir> {
  return computed(() => langDir(toValue(lang)))
}
