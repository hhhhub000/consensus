/** dataviz 検証済みカテゴリカルパレット (light) — カード・アバターの色に使用 */
export const CATEGORICAL_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
] as const

export function colorAt(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1)
}

export function randomId(len = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  for (const b of bytes) out += chars[b % chars.length]
  return out
}

/** 文字列から安定したハッシュ値 (ジッターや色割り当てに使用) */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Debounced<A extends unknown[]> {
  (...args: A): void
  flush(): void
  cancel(): void
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): Debounced<A> {
  let t: ReturnType<typeof setTimeout> | undefined
  let pending: A | null = null
  const invoke = () => {
    t = undefined
    if (pending) {
      const args = pending
      pending = null
      fn(...args)
    }
  }
  const wrapped = ((...args: A) => {
    pending = args
    clearTimeout(t)
    t = setTimeout(invoke, ms)
  }) as Debounced<A>
  wrapped.flush = () => {
    clearTimeout(t)
    invoke()
  }
  wrapped.cancel = () => {
    clearTimeout(t)
    pending = null
  }
  return wrapped
}

export function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`
}
