import type { DriveStep } from 'driver.js'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NoteEditor } from '../../components/NoteEditor'
import { Button, Input, Panel, Spinner } from '../../components/ui'
import {
  addCardToSession,
  fetchPlacement,
  savePlacement,
  setReady,
  type PlacementData,
} from '../../lib/db'
import { isTourDone, startTour, useTour } from '../../lib/tour'
import { colorAt, debounce, randomId } from '../../lib/utils'
import type { Participant, Session } from '../../types'
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
        'カードをドラッグして軸の上に置きます。位置は何度でも動かせて、自動保存されます。ボードの外へドラッグすると置き場に戻せます。配置済みカードをクリックするとメモ (理由や補足) を書けます。',
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

/** 初めてカードを配置した直後に出す1ステップの案内 */
const NOTE_TOUR: DriveStep[] = [
  {
    element: '[data-tour="input-board"] .graph-paper button[aria-label^="カード:"]',
    popover: {
      title: 'カードにメモを書けます',
      description:
        '配置したカードをクリックすると、そこに置いた理由や補足をメモできます。メモは開示のとき、あなたのドットにカーソルを合わせると表示されます。',
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
  const [data, setData] = useState<PlacementData | null>(null)
  const [noteCardId, setNoteCardId] = useState<string | null>(null)
  const [addingCard, setAddingCard] = useState(false)
  const me = participants.find((p) => p.uid === uid)
  const isReady = (me?.readyRound ?? 0) >= session.round

  // 初期ロード: 今ラウンドの自分の配置 → 無ければ前ラウンドを引き継ぐ
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let d = await fetchPlacement(session.id, session.round, uid)
        if (!d && session.round > 1) {
          d = await fetchPlacement(session.id, session.round - 1, uid)
          if (d && alive) {
            // 引き継ぎを保存しておく (触らなくても「前回と同じ意見」として扱う)
            await savePlacement(session.id, uid, session.round, d)
          }
        }
        if (alive) setData(d ?? { positions: {}, notes: {} })
      } catch (e) {
        console.error(e)
        if (alive) setData({ positions: {}, notes: {} })
      }
    })()
    return () => {
      alive = false
    }
  }, [session.id, session.round, uid])

  useTour('input', () => INPUT_TOUR, data !== null)

  const debouncedSave = useMemo(
    () =>
      debounce((d: PlacementData) => {
        savePlacement(session.id, uid, session.round, d).catch(console.error)
      }, 400),
    [session.id, session.round, uid],
  )
  useEffect(() => () => debouncedSave.flush(), [debouncedSave])

  if (data === null) return <Spinner label="前回の配置を読み込み中..." />

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
          <p className="text-sm text-ink-soft">
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
        <p className="mb-3 rounded-lg border border-ok/30 bg-white/70 px-3 py-2 text-sm text-ink-soft">
          配置完了を宣言しました ({readyCount}/{participants.length}人)。開示までこのまま待つか、まだ動かして調整もできます。
        </p>
      )}

      <div data-tour="input-board">
      <PlacementBoard
        axisType={session.axisType}
        axes={session.axes}
        quadrants={session.quadrants}
        cards={session.cards}
        positions={data.positions}
        hasNote={(cardId) => !!data.notes[cardId]}
        onCardClick={setNoteCardId}
        onMove={(cardId, pos) => {
          setData((prev) => {
            const next: PlacementData = {
              positions: { ...(prev?.positions ?? {}) },
              notes: { ...(prev?.notes ?? {}) },
            }
            if (pos) next.positions[cardId] = pos
            else delete next.positions[cardId]
            debouncedSave(next)
            return next
          })
          // 初めてカードを置いたタイミングでメモ機能を1ステップ案内
          if (pos && !isTourDone('note')) {
            setTimeout(() => startTour('note', NOTE_TOUR), 450)
          }
        }}
        trayHint="ドラッグでボードへ。配置済みカードをクリックするとメモを書けます"
      />
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={() => setAddingCard(true)}>
          + カードを追加
        </Button>
        <span className="ml-2 text-xs text-ink-soft">
          追加したカードは全員のカード置き場に即時反映されます
        </span>
      </div>

      {addingCard && (
        <AddCardDialog
          onAdd={(label) => {
            addCardToSession(session.id, {
              id: randomId(8),
              label,
              color: colorAt(session.cards.length),
            }).catch(console.error)
          }}
          onClose={() => setAddingCard(false)}
        />
      )}

      {noteCardId && (
        <NoteEditor
          cardLabel={session.cards.find((c) => c.id === noteCardId)?.label ?? ''}
          cardColor={session.cards.find((c) => c.id === noteCardId)?.color ?? '#888'}
          initial={data.notes[noteCardId] ?? ''}
          hint="開示時に、あなたのドットと一緒に表示されます"
          onSave={(note) => {
            setData((prev) => {
              const next: PlacementData = {
                positions: { ...(prev?.positions ?? {}) },
                notes: { ...(prev?.notes ?? {}) },
              }
              if (note) next.notes[noteCardId] = note
              else delete next.notes[noteCardId]
              debouncedSave(next)
              return next
            })
          }}
          onClose={() => setNoteCardId(null)}
        />
      )}
    </div>
  )
}

/** 議論中に気づいた要素をその場でカード化する小さなダイアログ */
function AddCardDialog({
  onAdd,
  onClose,
}: {
  onAdd: (label: string) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState('')
  const submit = () => {
    if (!label.trim()) return
    onAdd(label.trim())
    onClose()
  }
  // body 直下に描画 (祖先の transform で fixed の基準がズレるのを防ぐ)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-label="カードを追加"
    >
      <Panel className="animate-fade-up w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-base font-bold">カードを追加</p>
        <p className="mt-1 text-[13px] text-ink-soft">
          追加したカードは、参加者全員のカード置き場にすぐ表示されます。
        </p>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例: 追加で議論したい要素"
          maxLength={30}
          autoFocus
          className="mt-3"
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="accent" size="sm" disabled={!label.trim()} onClick={submit}>
            追加
          </Button>
        </div>
      </Panel>
    </div>,
    document.body,
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
