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

/** 4象限ボードの各区画ラベル (tl=左上, tr=右上, bl=左下, br=右下) */
export interface Quadrants {
  tl: string
  tr: string
  bl: string
  br: string
}

export interface Session {
  id: string
  title: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  /** 設定されている場合、2次元ボードを「4象限」として表示する */
  quadrants?: Quadrants
  /** ゲームモード: 合意フェーズなしで一致を目指し、終了時にスコアを発表する */
  gameMode?: boolean
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
  /** カードごとのメモ (任意) */
  notes: Record<string, string>
  updatedAt?: number
}

export interface ConsensusBoard {
  positions: Record<string, Pos>
  lastMovedBy: Record<string, string>
  /** カードごとの「全員の意見」としてのメモ */
  notes: Record<string, string>
}
