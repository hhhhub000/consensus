import type { AxisType, CardDef, Placement, Pos } from '../types'

/**
 * ラウンド間の意見の変化の分析。
 * 「片寄せ」= 中心から遠い側 (少数派) だけが多数派へ動き、多数派がほぼ静止 → 同調の兆候
 * 「歩み寄り」= 両側から互いに寄っている → 相互の納得による収束
 */

export interface ShiftStats {
  /** 両ラウンドに配置があるカード×人の平均移動距離 (0..1) */
  avgDistance: number
  /** いずれかのカードをしきい値以上動かした人数 */
  movedCount: number
  /** 両ラウンドとも参加していた人数 */
  bothCount: number
  onesided: CardDef[]
  mutual: CardDef[]
}

const MOVE_EPS = 0.05

function dist(a: Pos, b: Pos, axisType: AxisType): number {
  return axisType === '1d' ? Math.abs(a.x - b.x) : Math.hypot(a.x - b.x, a.y - b.y)
}

export function computeShift(
  cards: CardDef[],
  prev: Placement[],
  curr: Placement[],
  axisType: AxisType,
): ShiftStats {
  const prevBy = new Map(prev.map((p) => [p.uid, p]))
  const currBy = new Map(curr.map((p) => [p.uid, p]))
  const commonUids = [...prevBy.keys()].filter((u) => currBy.has(u))

  let distSum = 0
  let distN = 0
  const maxMoveByUid = new Map<string, number>()
  const onesided: CardDef[] = []
  const mutual: CardDef[] = []

  for (const card of cards) {
    // 両ラウンドでこのカードを配置した人のペア
    const pairs = commonUids
      .map((u) => ({
        uid: u,
        prev: prevBy.get(u)!.positions[card.id],
        curr: currBy.get(u)!.positions[card.id],
      }))
      .filter((p) => p.prev && p.curr)
    if (!pairs.length) continue

    for (const p of pairs) {
      const d = dist(p.prev, p.curr, axisType)
      distSum += d
      distN++
      maxMoveByUid.set(p.uid, Math.max(maxMoveByUid.get(p.uid) ?? 0, d))
    }

    if (pairs.length < 2) continue

    // 前ラウンドの重心を基準に「どれだけ中心へ寄ったか (toward)」を人ごとに評価
    const cx = pairs.reduce((a, p) => a + p.prev.x, 0) / pairs.length
    const cy = pairs.reduce((a, p) => a + p.prev.y, 0) / pairs.length
    const prevCentroid: Pos = { x: cx, y: axisType === '1d' ? 0 : cy }
    const norm = (p: Pos): Pos => ({ x: p.x, y: axisType === '1d' ? 0 : p.y })
    const evald = pairs.map((p) => {
      const prevDist = dist(norm(p.prev), prevCentroid, axisType)
      return {
        ...p,
        prevDist,
        toward: prevDist - dist(norm(p.curr), prevCentroid, axisType),
        disp: dist(p.prev, p.curr, axisType),
        side: Math.sign(p.prev.x - cx),
      }
    })
    const meanPrevDist = evald.reduce((a, p) => a + p.prevDist, 0) / evald.length
    if (meanPrevDist < 0.02) continue // もともとほぼ一致

    const movers = evald.filter((p) => p.toward > 0.04)
    const others = evald.filter((p) => p.toward <= 0.04)

    if (movers.length >= 2 && (axisType !== '1d' || new Set(movers.map((m) => m.side)).size > 1)) {
      // 複数人が (1次元なら両側から) 中心へ寄った → 歩み寄り
      mutual.push(card)
    } else if (
      movers.length >= 1 &&
      movers.length <= others.length &&
      movers.some((m) => m.toward > 0.08) &&
      others.every((p) => p.disp < 0.03)
    ) {
      // 少数派だけが動き、残りは静止 → 片寄せの兆候
      onesided.push(card)
    }
  }

  return {
    avgDistance: distN ? distSum / distN : 0,
    movedCount: [...maxMoveByUid.values()].filter((d) => d > MOVE_EPS).length,
    bothCount: commonUids.length,
    onesided,
    mutual,
  }
}
