import { useMemo } from 'react'
import type { CardStat } from '../../lib/derive'
import { hashString } from '../../lib/utils'
import type { Participant } from '../../types'

const COL_W = 88
const BAND_W = 34
const PLOT_H = 380
const PAD_TOP = 14
const PAD_BOTTOM = 14
const GUTTER = 44
const SEGMENTS = 48

interface Props {
  stats: CardStat[]
  prevStats?: Map<string, CardStat>
  participants: Participant[]
  myUid: string
  showDots: boolean
  showNames: boolean
  axisMinLabel: string
  axisMaxLabel: string
}

/**
 * 1軸テーマの俯瞰ボード。
 * X = カード、Y = 軸の値。カードごとに min〜max の帯を描き、
 * 帯の中は KDE (集中度) の濃淡、中央値に太いティックを打つ。
 */
export function Reveal1D({
  stats,
  prevStats,
  participants,
  myUid,
  showDots,
  showNames,
  axisMinLabel,
  axisMaxLabel,
}: Props) {
  const nameOf = useMemo(() => {
    const m = new Map(participants.map((p) => [p.uid, p.name]))
    return (uid: string) => m.get(uid) ?? '参加者'
  }, [participants])

  const totalW = GUTTER + stats.length * COL_W
  const totalH = PAD_TOP + PLOT_H + PAD_BOTTOM
  const y = (v: number) => PAD_TOP + (1 - v) * PLOT_H

  return (
    <div className="overflow-x-auto rounded-xl border border-ink/15 bg-surface shadow-card">
      <div style={{ width: totalW, minWidth: '100%' }}>
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          width="100%"
          style={{ display: 'block' }}
          role="img"
          aria-label="カードごとの意見分布"
        >
          {/* Y軸 目盛り */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line
                x1={GUTTER - 6}
                x2={totalW - 8}
                y1={y(v)}
                y2={y(v)}
                stroke="#dde4e2"
                strokeWidth={v === 0.5 ? 1.2 : 0.7}
              />
            </g>
          ))}
          <text x={8} y={y(1) + 4} fontSize={11} fill="#5c6e75">
            {axisMaxLabel}
          </text>
          <text x={8} y={y(0) + 4} fontSize={11} fill="#5c6e75">
            {axisMinLabel}
          </text>

          {stats.map((s, i) => {
            const cx = GUTTER + i * COL_W + COL_W / 2
            if (s.n === 0) {
              return (
                <text key={s.card.id} x={cx} y={y(0.5)} fontSize={10} fill="#8b9aa0" textAnchor="middle">
                  未配置
                </text>
              )
            }
            const prev = prevStats?.get(s.card.id)
            return (
              <g key={s.card.id}>
                {/* バラツキ帯: min〜max、KDE 濃淡 */}
                {s.n >= 2 &&
                  Array.from({ length: SEGMENTS }, (_, k) => {
                    const v0 = s.min + ((s.max - s.min) * k) / SEGMENTS
                    const v1 = s.min + ((s.max - s.min) * (k + 1)) / SEGMENTS
                    const mid = (v0 + v1) / 2
                    const gi = Math.min(
                      s.kde.length - 1,
                      Math.max(0, Math.round(mid * (s.kde.length - 1))),
                    )
                    const density = s.kde[gi] ?? 0
                    return (
                      <rect
                        key={k}
                        x={cx - BAND_W / 2}
                        y={y(v1)}
                        width={BAND_W}
                        height={Math.max(0.5, y(v0) - y(v1))}
                        fill={s.card.color}
                        opacity={0.08 + density * 0.72}
                      />
                    )
                  })}
                {/* 帯の端 (最小・最大) */}
                {s.n >= 2 && (
                  <>
                    <line
                      x1={cx - BAND_W / 2}
                      x2={cx + BAND_W / 2}
                      y1={y(s.max)}
                      y2={y(s.max)}
                      stroke={s.card.color}
                      strokeWidth={1.2}
                    />
                    <line
                      x1={cx - BAND_W / 2}
                      x2={cx + BAND_W / 2}
                      y1={y(s.min)}
                      y2={y(s.min)}
                      stroke={s.card.color}
                      strokeWidth={1.2}
                    />
                  </>
                )}
                {/* 前ラウンド中央値 (比較) */}
                {prev && prev.n > 0 && (
                  <line
                    x1={cx - BAND_W / 2 - 3}
                    x2={cx + BAND_W / 2 + 3}
                    y1={y(prev.med)}
                    y2={y(prev.med)}
                    stroke="#8b9aa0"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                )}
                {/* 中央値 */}
                <line
                  x1={cx - BAND_W / 2 - 4}
                  x2={cx + BAND_W / 2 + 4}
                  y1={y(s.med)}
                  y2={y(s.med)}
                  stroke="#21313a"
                  strokeWidth={2.5}
                />
                {/* 個人ドット */}
                {showDots &&
                  s.points.map((pt) => {
                    const jitter =
                      ((hashString(pt.uid + s.card.id) % 1000) / 1000 - 0.5) * BAND_W * 0.8
                    const own = pt.uid === myUid
                    return (
                      <circle
                        key={pt.uid}
                        cx={cx + jitter}
                        cy={y(pt.pos.x)}
                        r={own ? 5 : 4}
                        fill={own ? '#d8492b' : '#ffffff'}
                        stroke={own ? '#ffffff' : '#21313a'}
                        strokeWidth={1.4}
                      >
                        <title>
                          {own ? `${nameOf(pt.uid)} (自分)` : showNames ? nameOf(pt.uid) : '参加者'}
                        </title>
                      </circle>
                    )
                  })}
              </g>
            )
          })}
        </svg>

        {/* カードラベル行 */}
        <div className="flex border-t border-ink/10" style={{ paddingLeft: GUTTER }}>
          {stats.map((s) => (
            <div
              key={s.card.id}
              className="flex flex-col items-center gap-1 px-1 py-2 text-center"
              style={{ width: COL_W }}
            >
              <span
                className="line-clamp-2 text-[11px] font-medium leading-4"
                style={{ color: '#21313a' }}
              >
                <span
                  className="mr-1 inline-block size-2 rounded-full align-middle"
                  style={{ backgroundColor: s.card.color }}
                />
                {s.card.label}
              </span>
              {s.n >= 2 ? (
                <AgreementChip value={s.agreement} />
              ) : (
                <span className="text-[10px] text-ink-faint">{s.n}人</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AgreementChip({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-soft"
      title="合意度 (バラツキが小さいほど高い)"
    >
      <span
        className="inline-block h-1.5 w-8 overflow-hidden rounded-full bg-ink/10"
        aria-hidden
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 70 ? '#21313a' : '#d8492b',
          }}
        />
      </span>
      {pct}
    </span>
  )
}
