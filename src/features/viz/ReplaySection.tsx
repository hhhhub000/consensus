import { useEffect, useMemo, useState } from 'react'
import { computeCardStats } from '../../lib/derive'
import { groupByRound } from '../../lib/hooks'
import { useReplay } from '../../lib/replay'
import type { Participant, Placement, Session } from '../../types'
import { Reveal1D } from './Reveal1D'
import { Reveal2D } from './Reveal2D'
import { ReplayButton, ReplayHud } from './ReplayControls'

/**
 * 終了画面 (サマリー / ゲーム結果) 用のリプレイ再生セクション。
 * 既定は畳んでおき、「動きを再生」で開示ボードを開いて R1 から順に再生する。
 * 2ラウンド未満、または視差効果の低減が有効なときは何も出さない。
 */
export function ReplaySection({
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
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(session.revealedUpTo)
  const replay = useReplay(session.revealedUpTo, setRound)

  // 再生が始まったらボードを開く (ボタンは ReplayButton が握っているため)
  useEffect(() => {
    if (replay.playing) setOpen(true)
  }, [replay.playing])

  const byRound = useMemo(() => groupByRound(placements), [placements])
  const stats = useMemo(
    () => computeCardStats(session.cards, byRound.get(round) ?? [], session.axisType),
    [session.cards, session.axisType, byRound, round],
  )
  const prevStats = useMemo(() => {
    if (round < 2) return undefined
    const prev = computeCardStats(session.cards, byRound.get(round - 1) ?? [], session.axisType)
    return new Map(prev.filter((s) => s.n > 0).map((s) => [s.card.id, s]))
  }, [round, session.cards, session.axisType, byRound])
  const allCardIds = useMemo(() => new Set(session.cards.map((c) => c.id)), [session.cards])

  if (!replay.enabled) return null

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ReplayButton replay={replay} label={open ? 'もう一度再生' : '動きを再生'} />
        <p className="text-[13px] text-ink-soft">
          R1 から R{session.revealedUpTo} まで、全員の配置の変化を通しで振り返れます。
        </p>
        {open && !replay.playing && (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setRound(session.revealedUpTo)
            }}
            className="text-[13px] font-medium text-ink-soft underline hover:text-ink"
          >
            閉じる
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3">
          <ReplayHud replay={replay} />
          {session.axisType === '1d' ? (
            <Reveal1D
              key={`${round}-${replay.runId}`}
              stats={stats}
              prevStats={prevStats}
              // 匿名表示中は開示画面と同じく個人の移動を追わせない
              trails={session.showNames}
              participants={participants}
              myUid={uid}
              showDots
              showNames={session.showNames}
              axisLabel={session.axes.x.label}
              axisMinLabel={session.axes.x.minLabel}
              axisMaxLabel={session.axes.x.maxLabel}
            />
          ) : (
            <Reveal2D
              key={`${round}-${replay.runId}`}
              stats={stats}
              prevStats={prevStats}
              participants={participants}
              myUid={uid}
              showNames={session.showNames}
              axes={session.axes}
              quadrants={session.quadrants}
              mode="all"
              selectedCardId={null}
              onSelectCard={() => {}}
              visibleCardIds={allCardIds}
            />
          )}
        </div>
      )}
    </section>
  )
}
