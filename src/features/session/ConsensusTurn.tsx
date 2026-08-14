import { useMemo, useRef, useState } from 'react'
import { moveConsensusCard, removeConsensusCard } from '../../lib/db'
import { computeCardStats } from '../../lib/derive'
import { useConsensusBoard } from '../../lib/hooks'
import type { Participant, Placement, Pos, Session } from '../../types'
import { PlacementBoard } from '../board/PlacementBoard'

export function ConsensusTurn({
  session,
  uid,
  participants,
  placements,
}: {
  session: Session
  uid: string
  participants: Participant[]
  placements: Placement[]
}) {
  const board = useConsensusBoard(session.id, true)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  // 最終開示ラウンドの分布 (ゴースト表示用)
  const finalStats = useMemo(() => {
    const latest = placements.filter((p) => p.round === session.revealedUpTo)
    return computeCardStats(session.cards, latest, session.axisType)
  }, [session.cards, session.axisType, session.revealedUpTo, placements])

  const nameOf = useMemo(() => {
    const m = new Map(participants.map((p) => [p.uid, p.name]))
    return (u: string) => m.get(u) ?? '?'
  }, [participants])

  // ドラッグ中のライブ同期はスロットリング (150ms)
  const lastLive = useRef(0)
  const onDragLive = (cardId: string, pos: Pos) => {
    const now = Date.now()
    if (now - lastLive.current < 150) return
    lastLive.current = now
    moveConsensusCard(session.id, cardId, pos, uid).catch(console.error)
  }

  const activeStat = activeCard ? finalStats.find((s) => s.card.id === activeCard) : undefined

  return (
    <div>
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold">合意ボード — 全員で1枚をつくる</h2>
        <p className="text-sm text-ink-soft">
          誰でもカードを動かせます。動かすと全員の画面に即時反映。カードを触ると、そのカードの開示時の分布が背景に表示されます
          — 分布から大きく外れた合意には立ち止まりましょう。
        </p>
      </div>

      <PlacementBoard
        axisType={session.axisType}
        axes={session.axes}
        cards={session.cards}
        positions={board?.positions ?? {}}
        onMove={(cardId, pos) => {
          if (pos) moveConsensusCard(session.id, cardId, pos, uid).catch(console.error)
          else removeConsensusCard(session.id, cardId, uid).catch(console.error)
        }}
        onDragLive={onDragLive}
        onActiveCard={setActiveCard}
        cardNote={
          session.showNames
            ? (cardId) => {
                const by = board?.lastMovedBy[cardId]
                return by && by !== uid ? nameOf(by) : undefined
              }
            : undefined
        }
        overlay={activeStat && <GhostDistribution stat={activeStat} axisType={session.axisType} />}
        trayHint="トレイのカードは「対象外」の扱いです。ボード外へドラッグで戻せます"
      />
    </div>
  )
}

/** 開示ラウンドの分布ゴースト (カードを触っているときだけ表示) */
function GhostDistribution({
  stat,
  axisType,
}: {
  stat: ReturnType<typeof computeCardStats>[number]
  axisType: Session['axisType']
}) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full">
      {axisType === '2d' && stat.ellipse && (
        <ellipse
          cx={stat.ellipse.cx * 100}
          cy={stat.ellipse.cy * 100}
          rx={stat.ellipse.rx * 100}
          ry={stat.ellipse.ry * 100}
          transform={`rotate(${stat.ellipse.angle} ${stat.ellipse.cx * 100} ${stat.ellipse.cy * 100})`}
          fill={stat.card.color}
          opacity={0.1}
          stroke={stat.card.color}
          strokeOpacity={0.4}
          strokeWidth={0.4}
        />
      )}
      {stat.points.map((pt) => (
        <circle
          key={pt.uid}
          cx={pt.pos.x * 100}
          cy={axisType === '1d' ? 50 : pt.pos.y * 100}
          r={1.6}
          fill={stat.card.color}
          opacity={0.5}
        />
      ))}
      {stat.centroidPos && (
        <circle
          cx={stat.centroidPos.x * 100}
          cy={axisType === '1d' ? 50 : stat.centroidPos.y * 100}
          r={2}
          fill="none"
          stroke={stat.card.color}
          strokeWidth={0.6}
          opacity={0.8}
        />
      )}
    </svg>
  )
}
