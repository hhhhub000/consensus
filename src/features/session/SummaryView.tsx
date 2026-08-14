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
          <p className="mt-1 text-sm text-ink-soft">
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
          hasNote={(cardId) => !!board?.notes[cardId]}
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

      <NotesList
        session={session}
        finalStats={finalStats}
        groupNotes={board?.notes ?? {}}
        participants={participants}
      />
    </div>
  )
}

/** カードごとのメモ一覧 (合意の「全員」メモ + 各参加者のメモ) */
function NotesList({
  session,
  finalStats,
  groupNotes,
  participants,
}: {
  session: Session
  finalStats: ReturnType<typeof computeCardStats>
  groupNotes: Record<string, string>
  participants: Participant[]
}) {
  const nameOf = useMemo(() => {
    const m = new Map(participants.map((p) => [p.uid, p.name]))
    return (uid: string) => m.get(uid) ?? '参加者'
  }, [participants])

  const rows = session.cards
    .map((card) => {
      const stat = finalStats.find((s) => s.card.id === card.id)
      return {
        card,
        groupNote: groupNotes[card.id],
        memberNotes: stat?.points.filter((p) => p.note) ?? [],
      }
    })
    .filter((r) => r.groupNote || r.memberNotes.length > 0)

  if (!rows.length) return null

  return (
    <section className="mt-6 rounded-xl border border-ink/10 bg-surface shadow-card">
      <div className="border-b border-ink/10 px-4 py-3">
        <h3 className="font-display text-base font-bold">メモ一覧</h3>
      </div>
      <ul className="divide-y divide-ink/5 px-4">
        {rows.map((r) => (
          <li key={r.card.id} className="py-3">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.card.color }}
              />
              {r.card.label}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {r.groupNote && (
                <li className="flex gap-2 text-sm leading-6">
                  <span className="mt-0.5 shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                    全員
                  </span>
                  <span className="whitespace-pre-wrap text-ink">{r.groupNote}</span>
                </li>
              )}
              {r.memberNotes.map((p) => (
                <li key={p.uid} className="flex gap-2 text-sm leading-6">
                  <span className="mt-0.5 shrink-0 rounded-full border border-ink/15 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                    {session.showNames ? nameOf(p.uid) : '匿名'}
                  </span>
                  <span className="whitespace-pre-wrap text-ink-soft">{p.note}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
