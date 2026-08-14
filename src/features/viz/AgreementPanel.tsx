import { myGap, type CardStat } from '../../lib/derive'
import { formatPercent } from '../../lib/utils'
import type { AxisType } from '../../types'

/**
 * カード別の合意度 + 自分と全体のズレの一覧。
 * 合意度が低い (=意見が割れている) カードから並べ、議論の出発点を示す。
 */
export function AgreementPanel({
  stats,
  myUid,
  axisType,
}: {
  stats: CardStat[]
  myUid: string
  axisType: AxisType
}) {
  const rows = stats
    .filter((s) => s.n >= 2)
    .map((s) => ({ stat: s, gap: myGap(s, myUid, axisType) }))
    .sort((a, b) => a.stat.agreement - b.stat.agreement)

  if (!rows.length) {
    return (
      <p className="rounded-lg border border-ink/10 bg-white/60 p-4 text-sm text-ink-soft">
        2人以上が配置したカードがまだありません。
      </p>
    )
  }

  const maxGap = axisType === '1d' ? 1 : Math.SQRT2

  return (
    <div className="rounded-xl border border-ink/10 bg-surface shadow-card">
      <div className="flex items-baseline justify-between border-b border-ink/10 px-4 py-3">
        <h3 className="font-display text-base font-bold">議論ポイント</h3>
        <span className="text-xs text-ink-soft">意見が割れている順</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-0 px-4 py-2 text-[13px]">
        <span className="py-1 text-[11px] font-bold text-ink-faint">カード</span>
        <span className="py-1 text-right text-[11px] font-bold text-ink-faint">合意度</span>
        <span className="py-1 text-right text-[11px] font-bold text-ink-faint">自分のズレ</span>
        {rows.map(({ stat, gap }) => (
          <Row key={stat.card.id} stat={stat} gap={gap} maxGap={maxGap} />
        ))}
      </div>
    </div>
  )
}

function Row({
  stat,
  gap,
  maxGap,
}: {
  stat: CardStat
  gap: number | undefined
  maxGap: number
}) {
  const pct = Math.round(stat.agreement * 100)
  const gapRatio = gap !== undefined ? Math.min(1, gap / (maxGap * 0.5)) : null
  return (
    <>
      <span className="flex items-center gap-1.5 truncate border-t border-ink/5 py-2 font-medium">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: stat.card.color }}
        />
        <span className="truncate">{stat.card.label}</span>
        <span className="shrink-0 text-[11px] text-ink-faint">({stat.n}人)</span>
      </span>
      <span className="border-t border-ink/5 py-2 text-right">
        <span
          className={`font-mono ${pct < 50 ? 'font-bold text-accent-deep' : 'text-ink-soft'}`}
        >
          {formatPercent(stat.agreement)}
        </span>
      </span>
      <span className="border-t border-ink/5 py-2 text-right">
        {gapRatio === null ? (
          <span className="text-ink-faint">—</span>
        ) : (
          <span
            className={`font-mono ${gapRatio > 0.5 ? 'font-bold text-accent-deep' : 'text-ink-soft'}`}
            title="自分の配置と全体の中心の距離"
          >
            {gapRatio > 0.66 ? '大' : gapRatio > 0.33 ? '中' : '小'}
          </span>
        )}
      </span>
    </>
  )
}
