import { useMemo, useState } from 'react'
import { Button } from '../../components/ui'
import {
  closeSession,
  nextRound,
  reveal,
  setShowNames,
  startInput,
  toConsensus,
} from '../../lib/db'
import { centroidPositions, computeCardStats } from '../../lib/derive'
import type { Participant, Placement, Session } from '../../types'

const HINTS: Record<Session['phase'], string> = {
  lobby: 'ファシリテーターが開始するのを待っています',
  input: '全員の配置が終わると、ファシリテーターが一斉開示します',
  reveal: '分布を見ながら話しましょう。割れているカードが議論の出発点です',
  consensus: '全員でカードを動かして、1枚の合意ボードを作ります',
  closed: 'このセッションは終了しました。URLがそのまま記録になります',
}

export function FacilitatorBar({
  session,
  isCreator,
  participants,
  placements,
}: {
  session: Session
  isCreator: boolean
  participants: Participant[]
  placements: Placement[]
}) {
  const [busy, setBusy] = useState(false)
  const readyCount = participants.filter((p) => p.readyRound >= session.round).length

  // 合意ボードの初期値 = 最新開示ラウンドの重心
  const initialConsensus = useMemo(() => {
    if (session.phase !== 'reveal') return {}
    const latest = placements.filter((p) => p.round === session.revealedUpTo)
    return centroidPositions(
      computeCardStats(session.cards, latest, session.axisType),
      session.axisType,
    )
  }, [session, placements])

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      alert('操作に失敗しました。もう一度お試しください。')
    } finally {
      setBusy(false)
    }
  }

  if (!isCreator) {
    return (
      <p className="mt-3 rounded-lg border border-ink/10 bg-white/60 px-4 py-2.5 text-xs text-ink-soft">
        {HINTS[session.phase]}
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-accent/30 bg-accent-soft/60 px-4 py-2.5">
      <span className="text-[11px] font-bold tracking-wide text-accent-deep">
        ファシリテーター
      </span>

      {session.phase === 'lobby' && (
        <>
          <span className="text-xs text-ink-soft">参加 {participants.length}人</span>
          <Button
            variant="accent"
            size="sm"
            disabled={busy}
            onClick={run(() => startInput(session.id))}
          >
            入力を開始する
          </Button>
        </>
      )}

      {session.phase === 'input' && (
        <>
          <span className="text-xs text-ink-soft">
            配置完了 {readyCount}/{participants.length}人
          </span>
          <Button
            variant="accent"
            size="sm"
            disabled={busy}
            onClick={run(async () => {
              if (
                readyCount < participants.length &&
                !confirm(`まだ配置完了していない人がいます (${readyCount}/${participants.length})。開示しますか?`)
              )
                return
              await reveal(session.id, session.round)
            })}
          >
            一斉開示する
          </Button>
        </>
      )}

      {session.phase === 'reveal' && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={run(async () => {
              if (!confirm(`ラウンド${session.round + 1}を開始しますか? 各自がもう一度配置し直します。`)) return
              await nextRound(session.id, session.round)
            })}
          >
            もう1ラウンド入力する
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={busy}
            onClick={run(async () => {
              if (!confirm('合意フェーズへ進みますか? 全員で1枚のボードを編集します。')) return
              await toConsensus(session.id, initialConsensus)
            })}
          >
            合意フェーズへ
          </Button>
        </>
      )}

      {session.phase === 'consensus' && (
        <Button
          variant="accent"
          size="sm"
          disabled={busy}
          onClick={run(async () => {
            if (!confirm('セッションを終了して結果を確定しますか?')) return
            await closeSession(session.id)
          })}
        >
          結果を確定して終了
        </Button>
      )}

      {(session.phase === 'reveal' || session.phase === 'consensus') && (
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={session.showNames}
            onChange={(e) => setShowNames(session.id, e.target.checked).catch(console.error)}
            className="size-3.5 accent-accent"
          />
          名前を表示する
        </label>
      )}
    </div>
  )
}
