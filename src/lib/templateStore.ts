import type { AxisDef, AxisType, Quadrants } from '../types'
import { randomId } from './utils'

/**
 * マイテンプレートの保存層。
 * 現在は localStorage 実装。ログイン機能を導入する場合はこのファイルの中だけを
 * Firestore (users/{uid}/templates) に差し替え、初回ログイン時に localStorage から
 * 一括移行すればよい (他のデータからの参照はない)。
 */

export interface MyTemplate {
  id: string
  title: string
  /** テーマの状況説明 (任意) */
  description?: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  quadrants?: Quadrants
  gameMode?: boolean
  cards: { label: string }[]
  savedAt: number
}

const KEY = 'consensus:myTemplates'
const MAX_ITEMS = 30

function read(): MyTemplate[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MyTemplate[]) : []
  } catch {
    return []
  }
}

function write(items: MyTemplate[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function listMyTemplates(): MyTemplate[] {
  return read()
}

export function getMyTemplate(id: string | null | undefined): MyTemplate | undefined {
  if (!id) return undefined
  return read().find((t) => t.id === id)
}

export function saveMyTemplate(input: Omit<MyTemplate, 'id' | 'savedAt'>): MyTemplate {
  const item: MyTemplate = { ...input, id: randomId(10), savedAt: Date.now() }
  write([item, ...read()])
  return item
}

export function deleteMyTemplate(id: string) {
  write(read().filter((t) => t.id !== id))
}
