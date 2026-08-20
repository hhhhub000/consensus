import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CardStat } from '../../lib/derive'
import { hashString } from '../../lib/utils'
import type { Participant } from '../../types'
import { HArrow } from '../board/PlacementBoard'
import { DotTipOverlay, type DotTipState } from './DotTip'

const ROW_H = 48
const MID_Y = ROW_H / 2
const SEGMENTS = 48

/**
 * 行SVGは幅100%・x座標も % なので、CSS の translate に使える px 量が分からない。
 * 帯の実幅を測って `--band-w` としてコンテナに置き、各ドットは
 * `calc(var(--band-w) * dx)` でスライド量を求める。
 * state ではなく DOM に直接書くのは、初回ペイント前 (useLayoutEffect) に確定させて
 * スライドアニメーションを 0px から始めてしまわないため。
 */
function useBandWidth() {
  const rootRef = useRef<HTMLDivElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    const band = bandRef.current
    if (!root || !band) return
    const apply = () => root.style.setProperty('--band-w', `${band.getBoundingClientRect().width}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(band)
    return () => ro.disconnect()
  }, [])
  return { rootRef, bandRef }
}

interface Props {
  stats: CardStat[]
  prevStats?: Map<string, CardStat>
  /** 個人トレイル (前ラウンド位置 → 現在位置) を表示 */
  trails?: boolean
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
  trails,
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

  const [tip, setTip] = useState<DotTipState | null>(null)
  const { rootRef, bandRef } = useBandWidth()

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-xl border border-ink/15 bg-surface shadow-card"
      onClick={() => setTip(null)}
    >
      {/* 軸ヘッダー (入力ボードと同じ向き・同じ表現) */}
      <div className="grid grid-cols-[7rem_1fr] items-end gap-2 border-b border-ink/10 px-3 pb-1.5 pt-2 sm:grid-cols-[9rem_1fr]">
        <span className="text-[11px] font-bold text-ink-faint">カード</span>
        <div ref={bandRef}>
          <HArrow className="w-full" />
          <div className="flex items-baseline justify-between text-sm font-bold text-ink">
            <span>{axisMinLabel}</span>
            <span>{axisLabel}</span>
            <span>{axisMaxLabel}</span>
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
                            className="reveal-band"
                            style={{ animationDelay: `${rowIdx * 40}ms` }}
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
                      className="reveal-band"
                      style={{ animationDelay: `${rowIdx * 40 + 150}ms` }}
                      x1={pct(s.med)}
                      x2={pct(s.med)}
                      y1={MID_Y - 16}
                      y2={MID_Y + 16}
                      stroke="#21313a"
                      strokeWidth={2.5}
                    />
                    {/* 個人ドット */}
                    {showDots &&
                      s.points.map((pt, ptIdx) => {
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
                        const cy = MID_Y + jitter
                        const prevPt = trails
                          ? prevStats?.get(s.card.id)?.points.find((q) => q.uid === pt.uid)
                          : undefined
                        const showTip = (e: { clientX: number; clientY: number }) =>
                          setTip({
                            x: e.clientX,
                            y: e.clientY,
                            name: own
                              ? `${showNames ? nameOf(pt.uid) : '自分'} (自分)`
                              : showNames
                                ? nameOf(pt.uid)
                                : null,
                            note: pt.note,
                          })
                        return (
                          <g key={pt.uid}>
                            {/* 前ラウンドの目印と軌跡 (ドットのスライドとは独立に固定描画) */}
                            {prevPt && (
                              <>
                                <line
                                  x1={pct(prevPt.pos.x)}
                                  x2={pct(pt.pos.x)}
                                  y1={cy}
                                  y2={cy}
                                  stroke={colorOf(pt.uid)}
                                  strokeWidth={1.5}
                                  strokeDasharray="3 2"
                                  opacity={0.55}
                                />
                                <circle
                                  cx={pct(prevPt.pos.x)}
                                  cy={cy}
                                  r={3}
                                  fill="#ffffff"
                                  stroke={colorOf(pt.uid)}
                                  strokeWidth={1.3}
                                  opacity={0.8}
                                />
                              </>
                            )}
                            <g
                              className={`cursor-pointer ${prevPt ? 'trail-dot' : 'reveal-dot'}`}
                              style={
                                {
                                  animationDelay: `${rowIdx * 40 + ptIdx * 70}ms`,
                                  // 行SVGは % 座標なので、実測した帯幅から px のスライド量を作る
                                  '--sx': prevPt
                                    ? `calc(var(--band-w, 0px) * ${prevPt.pos.x - pt.pos.x})`
                                    : undefined,
                                } as React.CSSProperties
                              }
                              onMouseEnter={showTip}
                              onMouseLeave={() => setTip(null)}
                              onClick={(e) => {
                                e.stopPropagation()
                                showTip(e)
                              }}
                            >
                              <circle
                                cx={pct(pt.pos.x)}
                                cy={cy}
                                r={own ? 5 : 4}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={own && showNames ? 2 : 1.4}
                              />
                              {/* メモありマーク */}
                              {pt.note && (
                                <circle
                                  cx={pct(pt.pos.x)}
                                  cy={cy}
                                  transform="translate(4, -4)"
                                  r={2}
                                  fill="#21313a"
                                  stroke="#ffffff"
                                  strokeWidth={0.8}
                                />
                              )}
                            </g>
                          </g>
                        )
                      })}
                  </>
                )}
              </svg>
            </div>
          )
        })}
      </div>
      <DotTipOverlay tip={tip} />
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
