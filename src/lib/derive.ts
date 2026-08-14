import type { AxisType, CardDef, Placement, Pos } from '../types'
import {
  agreement1d,
  agreement2d,
  centroid,
  extent01,
  kde1d,
  median,
  sdEllipse,
  type Ellipse,
} from './stats'

export interface CardStat {
  card: CardDef
  n: number
  points: { uid: string; pos: Pos }[]
  /** 1軸のときの値 (= x 座標) */
  values: number[]
  agreement: number
  med: number
  min: number
  max: number
  kde: number[]
  centroidPos: Pos | null
  ellipse: Ellipse | null
}

export function computeCardStats(
  cards: CardDef[],
  placements: Placement[],
  axisType: AxisType,
): CardStat[] {
  return cards.map((card) => {
    const points = placements
      .filter((p) => p.positions[card.id])
      .map((p) => ({ uid: p.uid, pos: p.positions[card.id] }))
    const values = points.map((pt) => pt.pos.x)
    const [min, max] = extent01(values)
    const pts = points.map((p) => p.pos)
    return {
      card,
      n: points.length,
      points,
      values,
      agreement: axisType === '1d' ? agreement1d(values) : agreement2d(pts),
      med: values.length ? median(values) : 0.5,
      min,
      max,
      kde: axisType === '1d' ? kde1d(values) : [],
      centroidPos: points.length ? centroid(pts) : null,
      ellipse: axisType === '2d' ? sdEllipse(pts) : null,
    }
  })
}

/** n>=2 のカードの平均合意度。対象がなければ null */
export function overallAgreement(stats: CardStat[]): number | null {
  const target = stats.filter((s) => s.n >= 2)
  if (!target.length) return null
  return target.reduce((a, s) => a + s.agreement, 0) / target.length
}

/** 合意ボードの初期配置 = 最終ラウンドの各カード重心 */
export function centroidPositions(stats: CardStat[], axisType: AxisType): Record<string, Pos> {
  const out: Record<string, Pos> = {}
  for (const s of stats) {
    if (!s.centroidPos) continue
    out[s.card.id] =
      axisType === '1d' ? { x: s.centroidPos.x, y: 0.5 } : { ...s.centroidPos }
  }
  return out
}

/**
 * 自分と全体のズレ (0..1)。1軸: |自分 - 中央値|、2軸: 重心との距離。
 * 自分が未配置のカードは undefined。
 */
export function myGap(stat: CardStat, uid: string, axisType: AxisType): number | undefined {
  const mine = stat.points.find((p) => p.uid === uid)
  if (!mine || stat.n < 2) return undefined
  if (axisType === '1d') return Math.abs(mine.pos.x - stat.med)
  const c = stat.centroidPos
  if (!c) return undefined
  return Math.hypot(mine.pos.x - c.x, mine.pos.y - c.y)
}
