import { useMemo, useState } from 'react'
import type { CardStat } from '../../lib/derive'
import type { AxisDef, Participant } from '../../types'
import { AxisFrame } from '../board/PlacementBoard'
import { DotTipOverlay, type DotTipState } from './DotTip'
import { AgreementChip } from './Reveal1D'

export type Mode2D = 'all' | 'single' | 'grid'

interface Props {
  stats: CardStat[]
  prevStats?: Map<string, CardStat>
  participants: Participant[]
  myUid: string
  showNames: boolean
  axes: { x: AxisDef; y?: AxisDef }
  mode: Mode2D
  selectedCardId: string | null
  onSelectCard: (id: string) => void
  visibleCardIds: Set<string>
}

export function Reveal2D({
  stats,
  prevStats,
  participants,
  myUid,
  showNames,
  axes,
  mode,
  selectedCardId,
  onSelectCard,
  visibleCardIds,
}: Props) {
  const byUid = useMemo(
    () => new Map(participants.map((p) => [p.uid, p])),
    [participants],
  )
  const nameOf = (uid: string) => byUid.get(uid)?.name ?? '参加者'
  const colorOf = (uid: string) => byUid.get(uid)?.color ?? '#8b9aa0'
  const [tip, setTip] = useState<DotTipState | null>(null)

  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.card.id}
            type="button"
            onClick={() => onSelectCard(s.card.id)}
            className="rounded-xl border border-ink/10 bg-surface p-2 text-left shadow-card transition-shadow hover:shadow-lift"
            title="クリックで拡大 (1枚ずつモード)"
          >
            <div className="graph-paper relative aspect-square overflow-hidden rounded-lg border border-ink/10">
              <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
                <BoardCross />
                <CardCloud stat={s} myUid={myUid} mini />
              </svg>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
              <span className="truncate text-xs font-medium">
                <span
                  className="mr-1 inline-block size-2 rounded-full align-middle"
                  style={{ backgroundColor: s.card.color }}
                />
                {s.card.label}
              </span>
              {s.n >= 2 ? (
                <AgreementChip value={s.agreement} />
              ) : (
                <span className="shrink-0 text-[10px] text-ink-faint">{s.n}人</span>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  const selected = stats.find((s) => s.card.id === selectedCardId) ?? stats[0]

  return (
    <div onClick={() => setTip(null)}>
      {mode === 'single' && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {stats.map((s) => (
            <button
              key={s.card.id}
              type="button"
              onClick={() => onSelectCard(s.card.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                s.card.id === selected?.card.id
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink/15 bg-white/70 text-ink-soft hover:border-ink/40'
              }`}
            >
              <span
                className="mr-1 inline-block size-2 rounded-full"
                style={{ backgroundColor: s.card.color }}
              />
              {s.card.label}
            </button>
          ))}
        </div>
      )}

      <div className="graph-paper relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-xl border border-ink/15 shadow-card">
        <AxisFrame axisType="2d" axes={axes} />
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" role="img">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="#5c6e75" />
            </marker>
          </defs>
          {mode === 'all' &&
            stats
              .filter((s) => visibleCardIds.has(s.card.id))
              .map((s) => (
                <g key={s.card.id}>
                  <CardCloud stat={s} myUid={myUid} withLabel prev={prevStats?.get(s.card.id)} />
                </g>
              ))}
          {mode === 'single' && selected && (
            <CardCloud
              stat={selected}
              myUid={myUid}
              withDots
              nameOf={showNames ? nameOf : undefined}
              colorOf={showNames ? colorOf : undefined}
              prev={prevStats?.get(selected.card.id)}
              onDotTip={setTip}
            />
          )}
        </svg>
      </div>
      <DotTipOverlay tip={tip} />
    </div>
  )
}

function BoardCross() {
  return (
    <>
      <line x1={50} y1={0} x2={50} y2={100} stroke="#c9d3d0" strokeWidth={0.5} />
      <line x1={0} y1={50} x2={100} y2={50} stroke="#c9d3d0" strokeWidth={0.5} />
    </>
  )
}

/**
 * 1カード分の分布表現: 標準偏差楕円 + 重心 (+ ドット / ラベル / 前回比較矢印)
 */
function CardCloud({
  stat,
  myUid,
  withDots,
  withLabel,
  mini,
  nameOf,
  colorOf,
  prev,
  onDotTip,
}: {
  stat: CardStat
  myUid: string
  withDots?: boolean
  withLabel?: boolean
  mini?: boolean
  nameOf?: (uid: string) => string
  /** 指定時 (名前表示中) はドットを人物ごとの色で塗り分け */
  colorOf?: (uid: string) => string
  prev?: CardStat
  onDotTip?: (tip: DotTipState | null) => void
}) {
  const color = stat.card.color
  const c = stat.centroidPos
  if (!c) return null
  const cx = c.x * 100
  const cy = c.y * 100
  const e = stat.ellipse

  return (
    <g>
      {e && (
        <ellipse
          cx={e.cx * 100}
          cy={e.cy * 100}
          rx={e.rx * 100}
          ry={e.ry * 100}
          transform={`rotate(${e.angle} ${e.cx * 100} ${e.cy * 100})`}
          fill={color}
          opacity={0.13}
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={mini ? 0.8 : 0.5}
        />
      )}
      {/* 前ラウンド重心 → 今回重心の収束矢印 */}
      {prev?.centroidPos && (
        <>
          <circle
            cx={prev.centroidPos.x * 100}
            cy={prev.centroidPos.y * 100}
            r={1.6}
            fill="none"
            stroke="#8b9aa0"
            strokeWidth={0.5}
          />
          <line
            x1={prev.centroidPos.x * 100}
            y1={prev.centroidPos.y * 100}
            x2={cx}
            y2={cy}
            stroke="#5c6e75"
            strokeWidth={0.5}
            strokeDasharray="1.5 1"
            markerEnd="url(#arrowhead)"
          />
        </>
      )}
      {withDots &&
        stat.points.map((pt) => {
          const own = pt.uid === myUid
          const fill = colorOf ? colorOf(pt.uid) : own ? '#d8492b' : '#ffffff'
          const stroke = colorOf ? (own ? '#21313a' : '#ffffff') : own ? '#ffffff' : '#21313a'
          const showTip = (e: { clientX: number; clientY: number }) =>
            onDotTip?.({
              x: e.clientX,
              y: e.clientY,
              name: own
                ? `${nameOf ? nameOf(pt.uid) : '自分'} (自分)`
                : nameOf
                  ? nameOf(pt.uid)
                  : null,
              note: pt.note,
            })
          return (
            <g
              key={pt.uid}
              className="cursor-pointer"
              onMouseEnter={showTip}
              onMouseLeave={() => onDotTip?.(null)}
              onClick={(e) => {
                e.stopPropagation()
                showTip(e)
              }}
            >
              <circle
                cx={pt.pos.x * 100}
                cy={pt.pos.y * 100}
                r={own ? 2.4 : 2}
                fill={fill}
                stroke={stroke}
                strokeWidth={own && colorOf ? 0.9 : 0.6}
              />
              {/* メモありマーク */}
              {pt.note && (
                <circle
                  cx={pt.pos.x * 100 + 1.8}
                  cy={pt.pos.y * 100 - 1.8}
                  r={0.9}
                  fill="#21313a"
                  stroke="#ffffff"
                  strokeWidth={0.35}
                />
              )}
              {nameOf && !own && (
                <text
                  x={pt.pos.x * 100}
                  y={pt.pos.y * 100 + 4.6}
                  fontSize={3}
                  textAnchor="middle"
                  fill="#5c6e75"
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  paintOrder="stroke"
                >
                  {nameOf(pt.uid)}
                </text>
              )}
            </g>
          )
        })}
      <circle
        cx={cx}
        cy={cy}
        r={mini ? 2.2 : 1.8}
        fill={color}
        stroke="#ffffff"
        strokeWidth={0.6}
      />
      {withLabel && (
        <text
          x={cx}
          y={cy - 3}
          fontSize={3.2}
          fontWeight={600}
          textAnchor="middle"
          fill="#21313a"
          stroke="#ffffff"
          strokeWidth={0.7}
          paintOrder="stroke"
        >
          {stat.card.label}
        </text>
      )}
    </g>
  )
}
