/**
 * Runtime-config switches arrive as booleans, or as whatever the env override parsed to
 * (NUXT_PUBLIC_DEMO_ACCOUNTS=0 → 0, =false → false, ="" → ""). Off means any of those; everything else is on.
 */
export function isEnabled(value: unknown): boolean {
  if (value === false || value === 0 || value === null || value === undefined) return false
  if (typeof value === 'string') return !['', '0', 'false', 'off', 'no'].includes(value.trim().toLowerCase())
  return true
}
