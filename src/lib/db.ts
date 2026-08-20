import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import type { AxisDef, AxisType, CardDef, Pos, Quadrants } from '../types'
import { db } from './firebase'
import { randomId } from './utils'

export const sessionRef = (id: string) => doc(db, 'sessions', id)
export const participantsRef = (id: string) => collection(db, 'sessions', id, 'participants')
export const participantRef = (id: string, uid: string) =>
  doc(db, 'sessions', id, 'participants', uid)
export const placementsRef = (id: string) => collection(db, 'sessions', id, 'placements')
export const placementRef = (id: string, round: number, uid: string) =>
  doc(db, 'sessions', id, 'placements', `${round}_${uid}`)
export const consensusRef = (id: string) => doc(db, 'sessions', id, 'consensus', 'board')

export interface CreateSessionInput {
  title: string
  description?: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  quadrants?: Quadrants
  gameMode?: boolean
  cards: CardDef[]
  templateId?: string
}

export async function createSession(
  input: CreateSessionInput,
  uid: string,
  creatorName: string,
  creatorColor: string,
): Promise<string> {
  const id = randomId(12)
  const axes: { x: AxisDef; y?: AxisDef } =
    input.axisType === '2d' && input.axes.y
      ? { x: input.axes.x, y: input.axes.y }
      : { x: input.axes.x }
  await setDoc(sessionRef(id), {
    title: input.title,
    description: input.description ?? '',
    axisType: input.axisType,
    axes,
    quadrants: input.quadrants ?? null,
    gameMode: input.gameMode ?? false,
    cards: input.cards,
    templateId: input.templateId ?? null,
    createdBy: uid,
    phase: 'lobby',
    round: 1,
    revealedUpTo: 0,
    showNames: false,
    createdAt: serverTimestamp(),
  })
  await joinSession(id, uid, creatorName, creatorColor)
  return id
}

export async function joinSession(id: string, uid: string, name: string, color: string) {
  await setDoc(
    participantRef(id, uid),
    { uid, name, color, readyRound: 0, joinedAt: serverTimestamp() },
    { merge: true },
  )
}

export interface PlacementData {
  positions: Record<string, Pos>
  notes: Record<string, string>
}

/** 入力フェーズ中のカード追加 (参加者なら誰でも可。全員にリアルタイム反映される) */
export async function addCardToSession(id: string, card: CardDef) {
  await updateDoc(sessionRef(id), { cards: arrayUnion(card) })
}

export async function savePlacement(
  id: string,
  uid: string,
  round: number,
  data: PlacementData,
) {
  await setDoc(placementRef(id, round, uid), {
    uid,
    round,
    positions: data.positions,
    notes: data.notes,
    updatedAt: serverTimestamp(),
  })
}

export async function fetchPlacement(
  id: string,
  round: number,
  uid: string,
): Promise<PlacementData | null> {
  const snap = await getDoc(placementRef(id, round, uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    positions: (d.positions ?? {}) as Record<string, Pos>,
    notes: (d.notes ?? {}) as Record<string, string>,
  }
}

export async function setReady(id: string, uid: string, round: number) {
  await updateDoc(participantRef(id, uid), { readyRound: round })
}

/* ---- ファシリテーター操作 ---- */

export async function startInput(id: string) {
  await updateDoc(sessionRef(id), { phase: 'input' })
}

export async function reveal(id: string, round: number) {
  await updateDoc(sessionRef(id), { phase: 'reveal', revealedUpTo: round })
}

export async function nextRound(id: string, currentRound: number) {
  await updateDoc(sessionRef(id), { phase: 'input', round: currentRound + 1 })
}

export async function toConsensus(id: string, initialPositions: Record<string, Pos>) {
  await updateDoc(sessionRef(id), { phase: 'consensus' })
  await setDoc(consensusRef(id), { positions: initialPositions, lastMovedBy: {}, notes: {} })
}

export async function closeSession(id: string) {
  await updateDoc(sessionRef(id), { phase: 'closed' })
}

export async function setShowNames(id: string, showNames: boolean) {
  await updateDoc(sessionRef(id), { showNames })
}

/* ---- 合意ボード ---- */

export async function moveConsensusCard(id: string, cardId: string, pos: Pos, uid: string) {
  await updateDoc(consensusRef(id), {
    [`positions.${cardId}`]: pos,
    [`lastMovedBy.${cardId}`]: uid,
  })
}

export async function removeConsensusCard(id: string, cardId: string, uid: string) {
  await updateDoc(consensusRef(id), {
    [`positions.${cardId}`]: deleteField(),
    [`lastMovedBy.${cardId}`]: uid,
  })
}

/** 合意ボードのメモ (「全員の意見」として記録)。空文字で削除 */
export async function setConsensusNote(id: string, cardId: string, note: string) {
  await updateDoc(consensusRef(id), {
    [`notes.${cardId}`]: note.trim() ? note.trim() : deleteField(),
  })
}
