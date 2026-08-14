import { useMemo } from 'react'
import type { CardStat } from '../../lib/derive'
import { hashString } from '../../lib/utils'
import type { Participant } from '../../types'

const ROW_H = 48
const MID_Y = ROW_H / 2
const SEGMENTS = 48

interface Props {
  stats: CardStat[]
  prevStats?: Map<string, CardStat>
  participants: Participant[]
  myUid: string
  showDots: boolean
  showNames: boolean
  axisLabel: string
  axisMinLabel: string
  axisMaxLabel: string
}

/**
 * 1軸テーマの俯瞰ボード。
 * 入力ボードと同じ「横 = 軸の値」の向きで、カードごとに1行の横帯を描く。
 * 帯 = min〜max、帯内の濃淡 = KDE (集中度)、太い縦線 = 中央値。
 */
export function Reveal1D({
  stats,
  prevStats,
  participants,
  myUid,
  showDots,
  showNames,
  axisLabel,
  axisMinLabel,
  axisMaxLabel,
}: Props) {
  const byUid = useMemo(
    () => new Map(participants.map((p) => [p.uid, p])),
    [participants],
  )
  const nameOf = (uid: string) => byUid.get(uid)?.name ?? '参加者'
  const colorOf = (uid: string) => byUid.get(uid)?.color ?? '#8b9aa0'

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`

  return (
    <div className="overflow-hidden rounded-xl border border-ink/15 bg-surface shadow-card">
      {/* 軸ヘッダー (入力ボードと同じ向き・同じ表現) */}
      <div className="grid grid-cols-[7rem_1fr] items-end gap-2 border-b border-ink/10 px-3 pb-1.5 pt-2 sm:grid-cols-[9rem_1fr]">
        <span className="text-[11px] font-bold text-ink-faint">カード</span>
        <div>
          <svg className="block h-3.5 w-full" preserveAspectRatio="none" viewBox="0 0 100 14" aria-hidden>
            <polygon points="0,12 100,12 100,1" fill="#21313a" opacity="0.09" />
            <line x1="0" y1="13" x2="100" y2="13" stroke="#c9d3d0" strokeWidth="1.5" />
          </svg>
          <div className="flex items-baseline justify-between text-xs text-ink-soft">
            <span>← {axisMinLabel}</span>
            <span className="font-bold text-ink">{axisLabel}</span>
            <span className="text-[13px] font-bold text-ink">{axisMaxLabel} →</span>
          </div>
        </div>
      </div>

      <div>
        {stats.map((s, rowIdx) => {
          const prev = prevStats?.get(s.card.id)
          return (
            <div
              key={s.card.id}
              className={`grid grid-cols-[7rem_1fr] items-center gap-2 px-3 sm:grid-cols-[9rem_1fr] ${
                rowIdx > 0 ? 'border-t border-ink/5' : ''
              }`}
            >
              {/* 左: カード情報 */}
              <div className="py-1.5">
                <p className="line-clamp-2 text-xs font-medium leading-4 text-ink">
                  <span
                    className="mr-1 inline-block size-2 rounded-full align-middle"
                    style={{ backgroundColor: s.card.color }}
                  />
                  {s.card.label}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                  {s.n}人
                  {s.n >= 2 && <AgreementChip value={s.agreement} />}
                </p>
              </div>

              {/* 右: 分布の横帯 */}
              <svg width="100%" height={ROW_H} role="img" aria-label={`${s.card.label} の分布`}>
                {/* 目盛り (0/25/50/75/100%) */}
                {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                  <line
                    key={v}
                    x1={pct(v)}
                    x2={pct(v)}
                    y1={4}
                    y2={ROW_H - 4}
                    stroke="#dde4e2"
                    strokeWidth={v === 0.5 ? 1.2 : 0.7}
                  />
                ))}
                {s.n === 0 ? (
                  <text x="50%" y={MID_Y + 3} fontSize={10} fill="#8b9aa0" textAnchor="middle">
                    未配置
                  </text>
                ) : (
                  <>
                    {/* バラツキ帯: min〜max、KDE 濃淡 */}
                    {s.n >= 2 &&
                      Array.from({ length: SEGMENTS }, (_, k) => {
                        const v0 = s.min + ((s.max - s.min) * k) / SEGMENTS
                        const w = (s.max - s.min) / SEGMENTS
                        const gi = Math.min(
                          s.kde.length - 1,
                          Math.max(0, Math.round((v0 + w / 2) * (s.kde.length - 1))),
                        )
                        const density = s.kde[gi] ?? 0
                        return (
                          <rect
                            key={k}
                            x={pct(v0)}
                            y={MID_Y - 11}
                            width={pct(Math.max(w, 0.0005))}
                            height={22}
                            fill={s.card.color}
                            opacity={0.08 + density * 0.72}
                          />
                        )
                      })}
                    {/* 帯の端 (最小・最大) */}
                    {s.n >= 2 &&
                      [s.min, s.max].map((v, i) => (
                        <line
                          key={i}
                          x1={pct(v)}
                          x2={pct(v)}
                          y1={MID_Y - 13}
                          y2={MID_Y + 13}
                          stroke={s.card.color}
                          strokeWidth={1.4}
                        />
                      ))}
                    {/* 前ラウンドの中央値 (比較) */}
                    {prev && prev.n > 0 && (
                      <line
                        x1={pct(prev.med)}
                        x2={pct(prev.med)}
                        y1={MID_Y - 15}
                        y2={MID_Y + 15}
                        stroke="#8b9aa0"
                        strokeWidth={1.5}
                        strokeDasharray="3 2"
                      />
                    )}
                    {/* 中央値 */}
                    <line
                      x1={pct(s.med)}
                      x2={pct(s.med)}
                      y1={MID_Y - 16}
                      y2={MID_Y + 16}
                      stroke="#21313a"
                      strokeWidth={2.5}
                    />
                    {/* 個人ドット */}
                    {showDots &&
                      s.points.map((pt) => {
                        const jitter =
                          ((hashString(pt.uid + s.card.id) % 1000) / 1000 - 0.5) * 22
                        const own = pt.uid === myUid
                        // 名前表示中は人物ごとの色で塗り分け (自分は濃い縁取り)
                        const fill = showNames
                          ? colorOf(pt.uid)
                          : own
                            ? '#d8492b'
                            : '#ffffff'
                        const stroke = showNames
                          ? own
                            ? '#21313a'
                            : '#ffffff'
                          : own
                            ? '#ffffff'
                            : '#21313a'
                        return (
                          <circle
                            key={pt.uid}
                            cx={pct(pt.pos.x)}
                            cy={MID_Y + jitter}
                            r={own ? 5 : 4}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={own && showNames ? 2 : 1.4}
                          >
                            <title>
                              {own
                                ? `${nameOf(pt.uid)} (自分)`
                                : showNames
                                  ? nameOf(pt.uid)
                                  : '参加者'}
                            </title>
                          </circle>
                        )
                      })}
                  </>
                )}
              </svg>
            </div>
          )
        })}
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
      <span className="inline-block h-1.5 w-8 overflow-hidden rounded-full bg-ink/10" aria-hidden>
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
