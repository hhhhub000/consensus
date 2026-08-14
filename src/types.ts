export type AxisType = '1d' | '2d'

export interface AxisDef {
  label: string
  minLabel: string
  maxLabel: string
}

export interface CardDef {
  id: string
  label: string
  description?: string
  color: string
}

export type Phase = 'lobby' | 'input' | 'reveal' | 'consensus' | 'closed'

export interface Session {
  id: string
  title: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  cards: CardDef[]
  createdBy: string
  phase: Phase
  round: number
  revealedUpTo: number
  showNames: boolean
  templateId?: string
  createdAt?: number
}

export interface Participant {
  uid: string
  name: string
  color: string
  joinedAt?: number
  /** このラウンド番号まで「配置完了」を宣言済み */
  readyRound: number
}

export interface Pos {
  x: number
  y: number
}

export interface Placement {
  uid: string
  round: number
  positions: Record<string, Pos>
  updatedAt?: number
}

export interface ConsensusBoard {
  positions: Record<string, Pos>
  lastMovedBy: Record<string, string>
}
