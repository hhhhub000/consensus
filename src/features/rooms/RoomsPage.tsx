import { getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Panel, Segmented } from '../../components/ui'
import { sessionRef } from '../../lib/db'
import { useAuthUid } from '../../lib/firebase'
import {
  listRoomHistory,
  removeRoomHistory,
  type RoomHistoryEntry,
} from '../../lib/sessionHistory'
import type { Phase } from '../../types'

const PHASE_LABEL: Record<Phase, string> = {
  lobby: '準備中',
  input: '入力中',
  reveal: '開示中',
  consensus: '合意中',
  closed: '終了',
}

type Tab = 'created' | 'joined'
type Status = { phase: Phase } | 'missing' | undefined

export default function RoomsPage() {
  const [params, setParams] = useSearchParams()
  const uid = useAuthUid()
  const tab: Tab = params.get('tab') === 'joined' ? 'joined' : 'created'
  const [history, setHistory] = useState<RoomHistoryEntry[]>(() => listRoomHistory())
  const [statuses, setStatuses] = useState<Record<string, Status>>({})

  // 現在のフェーズをまとめて取得 (履歴のタイトルは古い可能性があるため表示補助)
  useEffect(() => {
    if (!uid) return
    let alive = true
    ;(async () => {
      const results = await Promise.all(
        listRoomHistory().map(async (e) => {
          try {
            const snap = await getDoc(sessionRef(e.id))
            return [e.id, snap.exists() ? { phase: snap.data().phase as Phase } : 'missing'] as const
          } catch {
            return [e.id, 'missing'] as const
          }
        }),
      )
      if (alive) setStatuses(Object.fromEntries(results))
    })()
    return () => {
      alive = false
    }
  }, [uid])

  const created = history.filter((h) => h.role === 'creator')
  const joined = history.filter((h) => h.role === 'participant')
  const items = tab === 'created' ? created : joined

  const remove = (e: RoomHistoryEntry) => {
    removeRoomHistory(e.id)
    setHistory(listRoomHistory())
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold">
          ホンネセンサス
        </Link>
        <span className="text-sm text-ink-soft">過去のルーム</span>
      </header>

      <h1 className="font-display text-2xl font-bold">過去のルーム</h1>
      <p className="mt-1 text-sm text-ink-soft">
        このブラウザで作成・参加したルームの履歴です。URLを知っていれば履歴に無いルームにもアクセスできます。
      </p>

      <div className="mt-5">
        <Segmented
          options={[
            { value: 'created' as const, label: `作成したルーム (${created.length})` },
            { value: 'joined' as const, label: `参加したルーム (${joined.length})` },
          ]}
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
        />
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <Panel className="p-6 text-center text-sm text-ink-soft">
            {tab === 'created'
              ? 'このブラウザで作成したルームはまだありません。'
              : 'このブラウザで参加したルームはまだありません。'}
          </Panel>
        )}
        {items.map((e) => {
          const status = statuses[e.id]
          const missing = status === 'missing'
          return (
            <Panel key={e.id} className="flex items-center gap-3 p-4">
              <Link
                to={`/s/${e.id}`}
                className={`min-w-0 flex-1 ${missing ? 'pointer-events-none opacity-50' : ''}`}
              >
                <p className="truncate font-display text-base font-bold hover:text-accent-deep">
                  {e.title}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-soft">
                  最終アクセス:{' '}
                  {new Date(e.lastVisitedAt).toLocaleString('ja-JP', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </Link>
              {missing ? (
                <Badge>見つかりません</Badge>
              ) : status ? (
                <Badge
                  className={
                    status.phase === 'closed' ? '' : 'border-accent/40 text-accent-deep'
                  }
                >
                  {PHASE_LABEL[status.phase]}
                </Badge>
              ) : (
                <Badge>…</Badge>
              )}
              <button
                type="button"
                aria-label={`「${e.title}」を履歴から削除`}
                title="履歴から削除 (ルーム自体は消えません)"
                onClick={() => remove(e)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-accent-soft hover:text-accent-deep"
              >
                ✕
              </button>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
