import ru from '~/locales/ru'

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

/** Every dot-path in ru.ts that ends in a string. */
export type MessageKey = Leaves<typeof ru>
export type MessageParams = Record<string, string | number>

function lookup(key: string): string | undefined {
  let node: unknown = ru
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** Fills {name} placeholders. Unknown placeholders stay as written so a missing param is visible. */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match)
}

/** Translate outside components (stores, utils). Returns the key itself if it is missing. */
export function translate(key: MessageKey, params?: MessageParams): string {
  return interpolate(lookup(key) ?? key, params)
}

export function useT() {
  return { t: translate }
}
