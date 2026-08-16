import { describe, expect, it } from 'vitest'
import { computeShift } from '../src/lib/shift'
import type { CardDef, Placement } from '../src/types'

const card: CardDef = { id: 'c1', label: 'カード', color: '#2a78d6' }

function placement(uid: string, round: number, x: number): Placement {
  return { uid, round, positions: { c1: { x, y: 0.5 } }, notes: {} }
}

describe('computeShift', () => {
  it('少数派だけが多数派へ寄ると「片寄せ」判定', () => {
    const prev = [placement('a', 1, 0.9), placement('b', 1, 0.45), placement('c', 1, 0.5)]
    const curr = [placement('a', 2, 0.55), placement('b', 2, 0.45), placement('c', 2, 0.5)]
    const s = computeShift([card], prev, curr, '1d')
    expect(s.onesided.map((c) => c.id)).toEqual(['c1'])
    expect(s.mutual).toEqual([])
    expect(s.movedCount).toBe(1)
    expect(s.bothCount).toBe(3)
  })

  it('両側から寄ると「歩み寄り」判定', () => {
    const prev = [placement('a', 1, 0.9), placement('b', 1, 0.2)]
    const curr = [placement('a', 2, 0.7), placement('b', 2, 0.4)]
    const s = computeShift([card], prev, curr, '1d')
    expect(s.mutual.map((c) => c.id)).toEqual(['c1'])
    expect(s.onesided).toEqual([])
    expect(s.movedCount).toBe(2)
  })

  it('誰も動かなければどちらでもない', () => {
    const prev = [placement('a', 1, 0.8), placement('b', 1, 0.3)]
    const curr = [placement('a', 2, 0.8), placement('b', 2, 0.3)]
    const s = computeShift([card], prev, curr, '1d')
    expect(s.onesided).toEqual([])
    expect(s.mutual).toEqual([])
    expect(s.avgDistance).toBe(0)
    expect(s.movedCount).toBe(0)
  })

  it('平均移動距離を返す', () => {
    const prev = [placement('a', 1, 0.2), placement('b', 1, 0.6)]
    const curr = [placement('a', 2, 0.4), placement('b', 2, 0.6)]
    const s = computeShift([card], prev, curr, '1d')
    expect(s.avgDistance).toBeCloseTo(0.1)
  })

  it('片方のラウンドにしかいない人・カードは無視する', () => {
    const prev = [placement('a', 1, 0.2)]
    const curr = [placement('a', 2, 0.3), placement('b', 2, 0.9)]
    const s = computeShift([card], prev, curr, '1d')
    expect(s.bothCount).toBe(1)
    expect(s.avgDistance).toBeCloseTo(0.1)
  })
})
