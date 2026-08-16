import { useMemo } from 'react'
import { computeShift } from '../../lib/shift'
import { formatPercent } from '../../lib/utils'
import type { AxisType, CardDef, Placement } from '../../types'

/** ラウンド間の「意見の変化」サマリー (平均移動・収束の質の判定) */
export function ShiftPanel({
  cards,
  prevPlacements,
  currPlacements,
  axisType,
  round,
}: {
  cards: CardDef[]
  prevPlacements: Placement[]
  currPlacements: Placement[]
  axisType: AxisType
  round: number
}) {
  const s = useMemo(
    () => computeShift(cards, prevPlacements, currPlacements, axisType),
    [cards, prevPlacements, currPlacements, axisType],
  )

  if (!s.bothCount) return null

  return (
    <div className="rounded-xl border border-ink/10 bg-surface shadow-card">
      <div className="flex items-baseline justify-between border-b border-ink/10 px-4 py-3">
        <h3 className="font-display text-base font-bold">意見の変化</h3>
        <span className="font-mono text-xs text-ink-soft">
          R{round - 1} → R{round}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-paper p-3">
            <p className="text-xs text-ink-soft">平均移動距離</p>
            <p className="mt-0.5 font-mono text-xl font-bold">{formatPercent(s.avgDistance)}</p>
          </div>
          <div className="rounded-lg bg-paper p-3">
            <p className="text-xs text-ink-soft">意見を動かした人</p>
            <p className="mt-0.5 font-mono text-xl font-bold">
              {s.movedCount}
              <span className="text-sm text-ink-soft"> / {s.bothCount}人</span>
            </p>
          </div>
        </div>

        {s.mutual.length > 0 && (
          <div className="rounded-lg border border-ok/30 bg-white/70 p-3">
            <p className="text-[13px] font-bold text-ink">歩み寄りの収束</p>
            <p className="mt-0.5 text-[13px] leading-6 text-ink-soft">
              {s.mutual.map((c) => c.label).join('、')} は両側から中央へ寄っています。
            </p>
          </div>
        )}

        {s.onesided.length > 0 && (
          <div className="rounded-lg border border-accent/40 bg-accent-soft/50 p-3">
            <p className="text-[13px] font-bold text-accent-deep">⚠ 片寄せの可能性</p>
            <p className="mt-0.5 text-[13px] leading-6 text-ink-soft">
              {s.onesided.map((c) => c.label).join('、')}{' '}
              は少数派側だけが多数派へ動きました。納得の上での移動か、一言確認してみましょう。
            </p>
          </div>
        )}

        {s.mutual.length === 0 && s.onesided.length === 0 && (
          <p className="text-[13px] leading-6 text-ink-soft">
            はっきりした収束パターンはまだ見られません。
          </p>
        )}
      </div>
    </div>
  )
}
