import {
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { ConsensusBoard, Participant, Placement, Session } from '../types'
import { consensusRef, participantsRef, placementsRef, sessionRef } from './db'

function toMillis(v: unknown): number | undefined {
  return v && typeof (v as Timestamp).toMillis === 'function'
    ? (v as Timestamp).toMillis()
    : undefined
}

export type Loadable<T> = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; data: T }

export function useSession(id: string | undefined): Loadable<Session> {
  const [state, setState] = useState<Loadable<Session>>({ status: 'loading' })
  useEffect(() => {
    if (!id) return
    setState({ status: 'loading' })
    return onSnapshot(
      sessionRef(id),
      (snap) => {
        if (!snap.exists()) {
          setState({ status: 'missing' })
          return
        }
        const d = snap.data() as DocumentData
        setState({
          status: 'ready',
          data: {
            id: snap.id,
            title: d.title,
            axisType: d.axisType,
            axes: d.axes,
            quadrants: d.quadrants ?? undefined,
            cards: d.cards,
            createdBy: d.createdBy,
            phase: d.phase,
            round: d.round,
            revealedUpTo: d.revealedUpTo,
            showNames: d.showNames,
            templateId: d.templateId ?? undefined,
            createdAt: toMillis(d.createdAt),
          },
        })
      },
      (err) => {
        console.error('session subscribe error', err)
        setState({ status: 'missing' })
      },
    )
  }, [id])
  return state
}

export function useParticipants(
  id: string | undefined,
): { participants: Participant[]; loaded: boolean } {
  const [items, setItems] = useState<Participant[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!id) return
    return onSnapshot(participantsRef(id), (snap) => {
      const list: Participant[] = snap.docs.map((d) => {
        const v = d.data()
        return {
          uid: d.id,
          name: v.name,
          color: v.color,
          readyRound: v.readyRound ?? 0,
          joinedAt: toMillis(v.joinedAt),
        }
      })
      list.sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0))
      setItems(list)
      setLoaded(true)
    })
  }, [id])
  return { participants: items, loaded }
}

/**
 * 開示済みラウンドの全参加者 placement。
 * セキュリティルール上 `round <= revealedUpTo` の絞り込みが必須。
 */
export function useRevealedPlacements(id: string | undefined, revealedUpTo: number): Placement[] {
  const [items, setItems] = useState<Placement[]>([])
  useEffect(() => {
    if (!id || revealedUpTo < 1) {
      setItems([])
      return
    }
    const q = query(placementsRef(id), where('round', '<=', revealedUpTo))
    return onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => {
            const v = d.data()
            return {
              uid: v.uid,
              round: v.round,
              positions: v.positions ?? {},
              notes: v.notes ?? {},
              updatedAt: toMillis(v.updatedAt),
            }
          }),
        )
      },
      (err) => console.error('placements subscribe error', err),
    )
  }, [id, revealedUpTo])
  return items
}

export function useConsensusBoard(
  id: string | undefined,
  enabled: boolean,
): ConsensusBoard | null {
  const [board, setBoard] = useState<ConsensusBoard | null>(null)
  useEffect(() => {
    if (!id || !enabled) return
    return onSnapshot(
      consensusRef(id),
      (snap) => {
        if (!snap.exists()) {
          setBoard(null)
          return
        }
        const v = snap.data()
        setBoard({
          positions: v.positions ?? {},
          lastMovedBy: v.lastMovedBy ?? {},
          notes: v.notes ?? {},
        })
      },
      (err) => console.error('consensus subscribe error', err),
    )
  }, [id, enabled])
  return board
}

/** placements をラウンド番号ごとにまとめる */
export function groupByRound(placements: Placement[]): Map<number, Placement[]> {
  const map = new Map<number, Placement[]>()
  for (const p of placements) {
    const list = map.get(p.round) ?? []
    list.push(p)
    map.set(p.round, list)
  }
  return map
}
