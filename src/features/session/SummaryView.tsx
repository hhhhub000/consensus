import { useMemo } from 'react'
import { Link } from 'react-router'
import { computeCardStats, overallAgreement } from '../../lib/derive'
import { groupByRound, useConsensusBoard } from '../../lib/hooks'
import { formatPercent } from '../../lib/utils'
import type { Participant, Placement, Session } from '../../types'
import { PlacementBoard } from '../board/PlacementBoard'
import { AgreementPanel } from '../viz/AgreementPanel'

export function SummaryView({
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
  const byRound = useMemo(() => groupByRound(placements), [placements])

  const finalStats = useMemo(
    () =>
      computeCardStats(
        session.cards,
        byRound.get(session.revealedUpTo) ?? [],
        session.axisType,
      ),
    [session.cards, session.axisType, byRound, session.revealedUpTo],
  )

  const trend = useMemo(
    () =>
      Array.from({ length: session.revealedUpTo }, (_, i) => i + 1).map((r) => ({
        round: r,
        agreement: overallAgreement(
          computeCardStats(session.cards, byRound.get(r) ?? [], session.axisType),
        ),
      })),
    [session.cards, session.axisType, byRound, session.revealedUpTo],
  )

  const placedCount = board ? Object.keys(board.positions).length : 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">結果 — 合意ボード</h2>
          <p className="mt-1 text-xs text-ink-soft">
            参加{participants.length}人 ・ {session.revealedUpTo}ラウンド ・ 合意配置 {placedCount}/
            {session.cards.length}枚。このページのURLがそのまま記録になります。
          </p>
        </div>
        <p className="font-mono text-xs text-ink-soft">
          {trend
            .filter((t) => t.agreement !== null)
            .map((t) => `R${t.round} ${formatPercent(t.agreement!)}`)
            .join(' → ')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PlacementBoard
          axisType={session.axisType}
          axes={session.axes}
          cards={session.cards}
          positions={board?.positions ?? {}}
          disabled
        />
        <div className="space-y-4">
          <AgreementPanel stats={finalStats} myUid={uid} axisType={session.axisType} />
          <Link
            to="/"
            className="block rounded-lg border border-ink/15 bg-white/70 px-4 py-2.5 text-center text-sm font-medium hover:border-ink/40"
          >
            新しいテーマを作る
          </Link>
        </div>
      </div>
    </div>
  )
}
