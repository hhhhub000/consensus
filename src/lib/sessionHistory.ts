/**
 * 過去に作成/参加したルームの履歴 (localStorage)。
 * 匿名認証のUID自体がブラウザ保存のため、履歴もブラウザ保存で耐久性は同等。
 * ログイン機能を導入して端末をまたぐ場合は Firestore クエリ
 * (sessions.createdBy == uid / participants collectionGroup) に置き換える。
 */

export type RoomRole = 'creator' | 'participant'

export interface RoomHistoryEntry {
  id: string
  title: string
  role: RoomRole
  lastVisitedAt: number
}

const KEY = 'consensus:roomHistory'
const MAX_ITEMS = 50

function read(): RoomHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RoomHistoryEntry[]) : []
  } catch {
    return []
  }
}

function write(items: RoomHistoryEntry[]) {
  const sorted = [...items].sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
  localStorage.setItem(KEY, JSON.stringify(sorted.slice(0, MAX_ITEMS)))
}

export function listRoomHistory(): RoomHistoryEntry[] {
  return read()
}

/** 訪問を記録 (既存エントリはタイトル・日時を更新。creator は participant に格下げしない) */
export function recordRoomVisit(entry: { id: string; title: string; role: RoomRole }) {
  const items = read()
  const existing = items.find((e) => e.id === entry.id)
  if (existing) {
    existing.title = entry.title
    existing.lastVisitedAt = Date.now()
    if (entry.role === 'creator') existing.role = 'creator'
    write(items)
  } else {
    write([{ ...entry, lastVisitedAt: Date.now() }, ...items])
  }
}

export function removeRoomHistory(id: string) {
  write(read().filter((e) => e.id !== id))
}
