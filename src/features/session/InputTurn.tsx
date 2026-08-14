import { useEffect, useMemo, useState } from 'react'
import { Button, Spinner } from '../../components/ui'
import { fetchPlacement, savePlacement, setReady } from '../../lib/db'
import { debounce } from '../../lib/utils'
import type { Participant, Pos, Session } from '../../types'
import { PlacementBoard } from '../board/PlacementBoard'

export function InputTurn({
  session,
  uid,
  participants,
}: {
  session: Session
  uid: string
  participants: Participant[]
}) {
  const [positions, setPositions] = useState<Record<string, Pos> | null>(null)
  const me = participants.find((p) => p.uid === uid)
  const isReady = (me?.readyRound ?? 0) >= session.round

  // 初期ロード: 今ラウンドの自分の配置 → 無ければ前ラウンドを引き継ぐ
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let pos = await fetchPlacement(session.id, session.round, uid)
        if (!pos && session.round > 1) {
          pos = await fetchPlacement(session.id, session.round - 1, uid)
          if (pos && alive) {
            // 引き継ぎを保存しておく (触らなくても「前回と同じ意見」として扱う)
            await savePlacement(session.id, uid, session.round, pos)
          }
        }
        if (alive) setPositions(pos ?? {})
      } catch (e) {
        console.error(e)
        if (alive) setPositions({})
      }
    })()
    return () => {
      alive = false
    }
  }, [session.id, session.round, uid])

  const debouncedSave = useMemo(
    () =>
      debounce((p: Record<string, Pos>) => {
        savePlacement(session.id, uid, session.round, p).catch(console.error)
      }, 400),
    [session.id, session.round, uid],
  )
  useEffect(() => () => debouncedSave.flush(), [debouncedSave])

  if (positions === null) return <Spinner label="前回の配置を読み込み中..." />

  const readyCount = participants.filter((p) => p.readyRound >= session.round).length

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">
            ラウンド{session.round}: 自分の考えで配置する
          </h2>
          <p className="text-xs text-ink-soft">
            他の人の配置は開示まで見えません。直感で置いてOK。あとから何度でも動かせます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReadyDots participants={participants} round={session.round} myUid={uid} />
          <Button
            variant={isReady ? 'outline' : 'accent'}
            onClick={() =>
              setReady(session.id, uid, isReady ? session.round - 1 : session.round).catch(
                console.error,
              )
            }
          >
            {isReady ? '配置完了を取り消す' : '配置完了'}
          </Button>
        </div>
      </div>

      {isReady && (
        <p className="mb-3 rounded-lg border border-ok/30 bg-white/70 px-3 py-2 text-xs text-ink-soft">
          配置完了を宣言しました ({readyCount}/{participants.length}人)。開示までこのまま待つか、まだ動かして調整もできます。
        </p>
      )}

      <PlacementBoard
        axisType={session.axisType}
        axes={session.axes}
        cards={session.cards}
        positions={positions}
        onMove={(cardId, pos) => {
          setPositions((prev) => {
            const next = { ...(prev ?? {}) }
            if (pos) next[cardId] = pos
            else delete next[cardId]
            debouncedSave(next)
            return next
          })
        }}
      />
    </div>
  )
}

function ReadyDots({
  participants,
  round,
  myUid,
}: {
  participants: Participant[]
  round: number
  myUid: string
}) {
  return (
    <div className="flex items-center -space-x-1.5" title="配置完了した人">
      {participants.map((p) => {
        const ready = p.readyRound >= round
        return (
          <span
            key={p.uid}
            title={`${p.name}${p.uid === myUid ? ' (自分)' : ''}: ${ready ? '完了' : '入力中'}`}
            className={`flex size-7 items-center justify-center rounded-full border-2 border-paper text-[10px] font-bold text-white ${
              ready ? '' : 'opacity-35'
            }`}
            style={{ backgroundColor: p.color }}
          >
            {ready ? '✓' : p.name.slice(0, 1)}
          </span>
        )
      })}
    </div>
  )
}
