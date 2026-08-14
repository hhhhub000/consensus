import { useState } from 'react'
import { Button, Field, Input, Panel } from '../../components/ui'
import { joinSession } from '../../lib/db'
import { colorAt, hashString } from '../../lib/utils'
import type { Participant, Session } from '../../types'

export function JoinGate({
  session,
  uid,
  participants,
}: {
  session: Session
  uid: string
  participants: Participant[]
}) {
  const [name, setName] = useState(() => localStorage.getItem('consensus:name') ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const join = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      localStorage.setItem('consensus:name', name.trim())
      await joinSession(session.id, uid, name.trim(), colorAt(hashString(uid)))
    } catch (e) {
      console.error(e)
      setError('参加に失敗しました。もう一度お試しください。')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <p className="font-display text-sm font-bold text-ink-soft">Consensus</p>
      <h1 className="mt-1 font-display text-2xl font-bold leading-snug">{session.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {session.axisType === '1d' ? '1軸' : '2軸'}ボード ・ カード{session.cards.length}枚 ・
        現在{participants.length}人参加
      </p>

      <Panel className="mt-6 space-y-4 p-5">
        <Field label="あなたの表示名" hint="ログインは不要です。名前だけで参加できます">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: たろう"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            autoFocus
          />
        </Field>
        {error && <p className="text-xs font-medium text-accent-deep">{error}</p>}
        <Button variant="accent" size="lg" className="w-full" disabled={!name.trim() || busy} onClick={join}>
          {busy ? '参加中...' : '参加する'}
        </Button>
      </Panel>

      <p className="mt-4 text-center text-xs leading-5 text-ink-faint">
        まず一人で考えてカードを配置し、全員の配置が揃ったら一斉に開示されます。
        <br />
        開示までお互いの意見は見えません。
      </p>
    </div>
  )
}
