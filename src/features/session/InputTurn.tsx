import type { DriveStep } from 'driver.js'
import { useEffect, useMemo, useState } from 'react'
import { Button, Spinner } from '../../components/ui'
import { fetchPlacement, savePlacement, setReady } from '../../lib/db'
import { startTour, useTour } from '../../lib/tour'
import { debounce } from '../../lib/utils'
import type { Participant, Pos, Session } from '../../types'
import { PlacementBoard } from '../board/PlacementBoard'

const INPUT_TOUR: DriveStep[] = [
  {
    popover: {
      title: '自分の考えで配置するターン',
      description:
        'このターンでは他の人の配置は一切見えません。周りを気にせず、まず自分の意見を固めましょう。',
    },
  },
  {
    element: '[data-tour="input-board"] .graph-paper',
    popover: {
      title: 'ボードに配置',
      description:
        'カードをドラッグして軸の上に置きます。位置は何度でも動かせて、自動保存されます。ボードの外へドラッグすると置き場に戻せます。',
    },
  },
  {
    element: '[data-tour="input-board"] .border-dashed',
    popover: {
      title: 'カード置き場',
      description:
        'まだ置いていないカードはここにあります。全部置かなくてもOK — 「対象外」という意思表示になります。',
    },
  },
  {
    element: '[data-tour="input-ready"]',
    popover: {
      title: '置き終わったら宣言',
      description:
        '「配置完了」を押すと進み具合が共有されます (配置の中身は見えません)。全員が揃うとファシリテーターが一斉開示します。',
    },
  },
]

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

  useTour('input', () => INPUT_TOUR, positions !== null)

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
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            ラウンド{session.round}: 自分の考えで配置する
            <button
              type="button"
              onClick={() => startTour('input', INPUT_TOUR, true)}
              className="rounded-md border border-ink/15 bg-white/70 px-2 py-0.5 font-sans text-[11px] font-medium text-ink-soft hover:border-ink/40"
            >
              ? 使い方
            </button>
          </h2>
          <p className="text-xs text-ink-soft">
            他の人の配置は開示まで見えません。直感で置いてOK。あとから何度でも動かせます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReadyDots participants={participants} round={session.round} myUid={uid} />
          <Button
            variant={isReady ? 'outline' : 'accent'}
            data-tour="input-ready"
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

      <div data-tour="input-board">
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
