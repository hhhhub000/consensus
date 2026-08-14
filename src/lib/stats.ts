import { quantileSorted } from 'd3-array'
import type { Pos } from '../types'
import { clamp01 } from './utils'

/* 座標はすべて 0..1 に正規化されている前提の統計関数群 */

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return quantileSorted(s, 0.5) ?? 0
}

export function iqr(values: number[]): number {
  if (values.length < 2) return 0
  const s = [...values].sort((a, b) => a - b)
  return (quantileSorted(s, 0.75) ?? 0) - (quantileSorted(s, 0.25) ?? 0)
}

export function extent01(values: number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return values.length ? [min, max] : [0, 0]
}

/**
 * 1次元の合意度スコア (0..1)。
 * IQR=0 (全員一致) → 1、IQR>=0.5 (全域に散らばる uniform 相当) → 0
 */
export function agreement1d(values: number[]): number {
  if (values.length < 2) return 1
  return clamp01(1 - iqr(values) / 0.5)
}

/**
 * 2次元の合意度スコア (0..1)。重心からの平均距離で評価。
 * 0.38 ≒ 単位正方形上の一様分布での平均距離 (=バラバラ) を 0 とする
 */
export function agreement2d(points: Pos[]): number {
  if (points.length < 2) return 1
  const c = centroid(points)
  let sum = 0
  for (const p of points) sum += Math.hypot(p.x - c.x, p.y - c.y)
  const meanDist = sum / points.length
  return clamp01(1 - meanDist / 0.38)
}

export function centroid(points: Pos[]): Pos {
  if (!points.length) return { x: 0.5, y: 0.5 }
  let sx = 0
  let sy = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
  }
  return { x: sx / points.length, y: sy / points.length }
}

/**
 * ガウスカーネル密度推定。grid 個の等間隔点 (0..1) 上の密度を返す。
 * 戻り値は最大値が 1 になるよう正規化。
 */
export function kde1d(values: number[], grid = 64, bandwidth?: number): number[] {
  const out = new Array<number>(grid).fill(0)
  if (!values.length) return out
  // Silverman's rule (正規化座標なので下限を設ける)
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1))
  const h = bandwidth ?? Math.max(0.035, 1.06 * (sd || 0.05) * Math.pow(n, -0.2))
  let max = 0
  for (let i = 0; i < grid; i++) {
    const x = i / (grid - 1)
    let sum = 0
    for (const v of values) {
      const u = (x - v) / h
      sum += Math.exp(-0.5 * u * u)
    }
    out[i] = sum
    if (sum > max) max = sum
  }
  if (max > 0) for (let i = 0; i < grid; i++) out[i] /= max
  return out
}

export interface Ellipse {
  cx: number
  cy: number
  rx: number
  ry: number
  /** 度数 (deg)。SVG の rotate 用 */
  angle: number
}

/**
 * 標準偏差楕円 (k=1.5σ)。点が2つ未満なら null。
 */
export function sdEllipse(points: Pos[], k = 1.5): Ellipse | null {
  const n = points.length
  if (n < 2) return null
  const c = centroid(points)
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const p of points) {
    const dx = p.x - c.x
    const dy = p.y - c.y
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  const d = n - 1
  sxx /= d
  syy /= d
  sxy /= d
  const tr2 = (sxx + syy) / 2
  const det = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy)
  const l1 = Math.max(tr2 + det, 0)
  const l2 = Math.max(tr2 - det, 0)
  const angle = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI
  const MIN_R = 0.02
  return {
    cx: c.x,
    cy: c.y,
    rx: Math.max(k * Math.sqrt(l1), MIN_R),
    ry: Math.max(k * Math.sqrt(l2), MIN_R),
    angle,
  }
}
