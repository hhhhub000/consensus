import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { Spinner } from '../../components/ui'
import { useAuthUid } from '../../lib/firebase'
import { useParticipants, useRevealedPlacements, useSession } from '../../lib/hooks'
import { recordRoomVisit } from '../../lib/sessionHistory'
import type { Participant, Placement, Session } from '../../types'
import { ConsensusTurn } from './ConsensusTurn'
import { FacilitatorBar } from './FacilitatorBar'
import { InputTurn } from './InputTurn'
import { JoinGate } from './JoinGate'
import { Lobby } from './Lobby'
import { RevealTurn } from './RevealTurn'
import { SessionHeader } from './SessionHeader'
import { SummaryView } from './SummaryView'

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const uid = useAuthUid()
  const s = useSession(sessionId)

  if (s.status === 'missing') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-display text-xl font-bold">テーマが見つかりません</p>
        <p className="text-sm text-ink-soft">URLが正しいか確認してください。</p>
        <Link to="/" className="text-sm font-medium text-accent-deep underline">
          トップへ戻る
        </Link>
      </div>
    )
  }
  if (s.status === 'loading' || !uid) return <Spinner label="接続中..." />
  return <SessionInner session={s.data} uid={uid} />
}

function SessionInner({ session, uid }: { session: Session; uid: string }) {
  const { participants, loaded } = useParticipants(session.id)
  const placements = useRevealedPlacements(session.id, session.revealedUpTo)
  const me = participants.find((p) => p.uid === uid)
  const isCreator = session.createdBy === uid

  // 参加済みのルームを履歴に記録 (トップの「過去のルーム」用)
  useEffect(() => {
    if (!me) return
    recordRoomVisit({
      id: session.id,
      title: session.title,
      role: isCreator ? 'creator' : 'participant',
    })
  }, [session.id, session.title, isCreator, me])

  if (!loaded) return <Spinner label="読み込み中..." />
  if (!me) return <JoinGate session={session} uid={uid} participants={participants} />

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4">
      <SessionHeader session={session} />
      <FacilitatorBar
        session={session}
        isCreator={isCreator}
        participants={participants}
        placements={placements}
      />
      {/* key でフェーズ切替のたびにフェードインさせる */}
      <main key={session.phase} className="animate-fade-up mt-4">
        <PhaseContent
          session={session}
          uid={uid}
          participants={participants}
          placements={placements}
        />
      </main>
    </div>
  )
}

function PhaseContent({
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
  switch (session.phase) {
    case 'lobby':
      return <Lobby session={session} participants={participants} />
    case 'input':
      return (
        <InputTurn
          key={session.round}
          session={session}
          uid={uid}
          participants={participants}
        />
      )
    case 'reveal':
      return (
        <RevealTurn
          session={session}
          uid={uid}
          participants={participants}
          placements={placements}
        />
      )
    case 'consensus':
      return (
        <ConsensusTurn
          session={session}
          uid={uid}
          participants={participants}
          placements={placements}
        />
      )
    case 'closed':
      return (
        <SummaryView
          session={session}
          uid={uid}
          participants={participants}
          placements={placements}
        />
      )
  }
}
