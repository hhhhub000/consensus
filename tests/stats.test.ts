import { describe, expect, it } from 'vitest'
import {
  agreement1d,
  agreement2d,
  centroid,
  extent01,
  iqr,
  kde1d,
  median,
  sdEllipse,
} from '../src/lib/stats'

describe('median / iqr / extent', () => {
  it('median of odd list', () => {
    expect(median([0.1, 0.9, 0.5])).toBe(0.5)
  })
  it('median of even list interpolates', () => {
    expect(median([0.2, 0.4])).toBeCloseTo(0.3)
  })
  it('iqr of identical values is 0', () => {
    expect(iqr([0.5, 0.5, 0.5, 0.5])).toBe(0)
  })
  it('extent01', () => {
    expect(extent01([0.3, 0.1, 0.8])).toEqual([0.1, 0.8])
    expect(extent01([])).toEqual([0, 0])
  })
})

describe('agreement1d', () => {
  it('full agreement -> 1', () => {
    expect(agreement1d([0.7, 0.7, 0.7])).toBe(1)
  })
  it('uniform spread -> near 0', () => {
    const uniform = Array.from({ length: 101 }, (_, i) => i / 100)
    expect(agreement1d(uniform)).toBeLessThan(0.05)
  })
  it('single value -> 1', () => {
    expect(agreement1d([0.2])).toBe(1)
  })
  it('tight cluster scores higher than loose cluster', () => {
    const tight = [0.5, 0.52, 0.48, 0.51]
    const loose = [0.2, 0.8, 0.4, 0.6]
    expect(agreement1d(tight)).toBeGreaterThan(agreement1d(loose))
  })
})

describe('agreement2d / centroid', () => {
  it('identical points -> 1', () => {
    const p = { x: 0.3, y: 0.3 }
    expect(agreement2d([p, p, p])).toBe(1)
  })
  it('corner spread -> low', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]
    expect(agreement2d(corners)).toBeLessThan(0.1)
  })
  it('centroid is the mean', () => {
    expect(
      centroid([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('kde1d', () => {
  it('is normalized to max 1 and peaks near the cluster', () => {
    const k = kde1d([0.8, 0.82, 0.78], 64)
    expect(Math.max(...k)).toBeCloseTo(1)
    const peakIdx = k.indexOf(Math.max(...k))
    expect(peakIdx / 63).toBeGreaterThan(0.7)
    expect(peakIdx / 63).toBeLessThan(0.9)
  })
  it('empty input -> zeros', () => {
    expect(kde1d([], 8)).toEqual(new Array(8).fill(0))
  })
})

describe('sdEllipse', () => {
  it('returns null for fewer than 2 points', () => {
    expect(sdEllipse([{ x: 0.5, y: 0.5 }])).toBeNull()
  })
  it('2点のとき楕円が点の両端を大きくはみ出さない', () => {
    const a = { x: 0.2, y: 0.5 }
    const b = { x: 0.8, y: 0.5 }
    const e = sdEllipse([a, b])!
    const halfDist = 0.3 // 中心から各点までの距離
    // 主軸半径は「点までの距離 + 余白 (0.03)」以下
    expect(e.rx).toBeLessThanOrEqual(halfDist + 0.03 + 1e-9)
    expect(e.rx).toBeGreaterThan(halfDist * 0.8)
    // 直交方向はほぼ広がりゼロ → 最小半径に張り付く
    expect(e.ry).toBeLessThanOrEqual(0.05)
  })
  it('多人数でも楕円はデータの広がり + 余白に収まる', () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({
      x: 0.5 + 0.2 * Math.cos((i / 12) * Math.PI * 2),
      y: 0.5 + 0.1 * Math.sin((i / 12) * Math.PI * 2),
    }))
    const e = sdEllipse(pts)!
    expect(e.rx).toBeLessThanOrEqual(0.2 + 0.03 + 1e-9)
    expect(e.ry).toBeLessThanOrEqual(0.1 + 0.03 + 1e-9)
  })
  it('elongated data has rx > ry and near-zero angle', () => {
    const pts = [
      { x: 0.1, y: 0.5 },
      { x: 0.3, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.5 },
      { x: 0.9, y: 0.5 },
    ]
    const e = sdEllipse(pts)!
    expect(e).not.toBeNull()
    expect(e.rx).toBeGreaterThan(e.ry)
    expect(Math.abs(e.angle) % 180).toBeLessThan(1)
    expect(e.cx).toBeCloseTo(0.5)
    expect(e.cy).toBeCloseTo(0.5)
  })
  it('diagonal data rotates ~45deg', () => {
    const pts = Array.from({ length: 9 }, (_, i) => ({ x: i / 8, y: i / 8 }))
    const e = sdEllipse(pts)!
    expect(Math.abs(Math.abs(e.angle) - 45)).toBeLessThan(1)
  })
})
