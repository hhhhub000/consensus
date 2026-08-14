import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { clamp01 } from '../../lib/utils'
import type { AxisDef, AxisType, CardDef, Pos } from '../../types'

export interface PlacementBoardProps {
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  cards: CardDef[]
  positions: Record<string, Pos>
  disabled?: boolean
  /** pos=null はトレイに戻す操作 */
  onMove?: (cardId: string, pos: Pos | null) => void
  /** ドラッグ中の逐次通知 (合意ボードのライブ同期用) */
  onDragLive?: (cardId: string, pos: Pos) => void
  /** ドラッグ/ホバー中のカード変化 (ゴースト表示用) */
  onActiveCard?: (cardId: string | null) => void
  /** ボード内に敷くレイヤー (分布ゴーストなど)。カードの下に描画される */
  overlay?: ReactNode
  /** カードチップの右肩に出す注記 (合意ボードの「最終移動者」など) */
  cardNote?: (cardId: string) => string | undefined
  trayHint?: string
}

interface DragState {
  cardId: string
  clientX: number
  clientY: number
  pos: Pos | null // ボード内にいるときのみ
}

export function PlacementBoard({
  axisType,
  axes,
  cards,
  positions,
  disabled,
  onMove,
  onDragLive,
  onActiveCard,
  overlay,
  cardNote,
  trayHint,
}: PlacementBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  // ハンドラは ref を読む (連続する pointer イベント間で state の反映を待たないため)
  const dragRef = useRef<DragState | null>(null)
  const [drag, setDragState] = useState<DragState | null>(null)
  const setDrag = (d: DragState | null) => {
    dragRef.current = d
    setDragState(d)
  }

  const toPos = (clientX: number, clientY: number): Pos | null => {
    const el = boardRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = (clientX - r.left) / r.width
    const y = (clientY - r.top) / r.height
    // 端の少し外までは「ボード内」とみなす (指で掴んだとき落としやすくする)
    if (x < -0.06 || x > 1.06 || y < -0.12 || y > 1.12) return null
    return { x: clamp01(x), y: clamp01(y) }
  }

  const startDrag = (cardId: string) => (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 合成イベント等で capture できなくても続行 */
    }
    setDrag({ cardId, clientX: e.clientX, clientY: e.clientY, pos: toPos(e.clientX, e.clientY) })
    onActiveCard?.(cardId)
  }

  const moveDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const cur = dragRef.current
    if (!cur) return
    const pos = toPos(e.clientX, e.clientY)
    setDrag({ ...cur, clientX: e.clientX, clientY: e.clientY, pos })
    if (pos) onDragLive?.(cur.cardId, pos)
  }

  const endDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const cur = dragRef.current
    if (!cur) return
    const pos = toPos(e.clientX, e.clientY)
    setDrag(null)
    onActiveCard?.(null)
    onMove?.(cur.cardId, pos)
  }

  const cancelDrag = () => {
    setDrag(null)
    onActiveCard?.(null)
  }

  // 注意: ドラッグ中はチップを unmount しない (pointer capture が切れるため)。
  // トレイ→ボードのドラッグ中はトレイ側チップを残し、ボードには preview を表示する
  const placedIds = new Set(Object.keys(positions))
  const trayCards = cards.filter((c) => !placedIds.has(c.id))
  const dragCard = drag ? cards.find((c) => c.id === drag.cardId) : undefined
  const dragFromTray = drag ? !placedIds.has(drag.cardId) : false
  const boardHeight =
    axisType === '2d'
      ? 'h-[min(78vw,480px)] md:h-[520px]'
      : 'h-56 md:h-72'

  return (
    <div>
      <div
        ref={boardRef}
        className={`graph-paper relative w-full overflow-hidden rounded-xl border border-ink/15 shadow-card ${boardHeight}`}
      >
        <AxisFrame axisType={axisType} axes={axes} />
        {overlay && (
          <div className="pointer-events-none absolute inset-0">{overlay}</div>
        )}
        {cards.map((card) => {
          const stored = positions[card.id]
          if (!stored) return null
          const isDragging = drag?.cardId === card.id
          // ドラッグ中: ボード内なら追従、ボード外なら元位置に薄く残す (unmount しない)
          const pos = isDragging && drag.pos ? drag.pos : stored
          return (
            <CardChip
              key={card.id}
              card={card}
              note={cardNote?.(card.id)}
              disabled={disabled}
              dragging={isDragging}
              style={{
                position: 'absolute',
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                transition: isDragging ? 'none' : 'left 0.25s ease, top 0.25s ease',
                zIndex: isDragging ? 30 : 10,
                opacity: isDragging && !drag.pos ? 0.3 : 1,
              }}
              onPointerDown={startDrag(card.id)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={cancelDrag}
              onMouseEnter={() => !drag && onActiveCard?.(card.id)}
              onMouseLeave={() => !drag && onActiveCard?.(null)}
            />
          )
        })}
        {/* トレイからのドラッグ中のボード上プレビュー */}
        {drag?.pos && dragFromTray && dragCard && (
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: `${drag.pos.x * 100}%`,
              top: `${drag.pos.y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <ChipBody card={dragCard} dragging />
          </div>
        )}
      </div>

      {/* ドラッグ中にボード外にいるときのゴースト */}
      {drag && !drag.pos && dragCard && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: drag.clientX,
            top: drag.clientY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ChipBody card={dragCard} dragging />
        </div>
      )}

      {!disabled && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-bold text-ink-soft">
              カード置き場 ({cards.length - trayCards.length}/{cards.length} 配置済み)
            </span>
            <span className="text-[11px] text-ink-faint">
              {trayHint ?? 'ドラッグでボードへ。ボード外に出すと戻せます。全部置かなくてもOK'}
            </span>
          </div>
          <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-dashed border-ink/20 bg-white/40 p-2">
            {trayCards.length === 0 && (
              <span className="px-1 py-1 text-xs text-ink-faint">すべて配置済み</span>
            )}
            {trayCards.map((card) => (
              <CardChip
                key={card.id}
                card={card}
                disabled={disabled}
                dragging={drag?.cardId === card.id}
                onPointerDown={startDrag(card.id)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={cancelDrag}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CardChip({
  card,
  note,
  disabled,
  dragging,
  style,
  ...handlers
}: {
  card: CardDef
  note?: string
  disabled?: boolean
  dragging?: boolean
  style?: React.CSSProperties
} & Pick<
  React.HTMLAttributes<HTMLButtonElement>,
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
  | 'onPointerCancel'
  | 'onMouseEnter'
  | 'onMouseLeave'
>) {
  return (
    <button
      type="button"
      style={style}
      className={`touch-none select-none ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      aria-label={`カード: ${card.label}`}
      {...handlers}
    >
      <ChipBody card={card} note={note} dragging={dragging} />
    </button>
  )
}

function ChipBody({
  card,
  note,
  dragging,
}: {
  card: CardDef
  note?: string
  dragging?: boolean
}) {
  return (
    <span className="relative inline-block">
      <span
        className={`inline-block max-w-32 truncate rounded-md border border-ink/10 bg-white px-2 py-1 text-xs font-medium leading-4 text-ink md:max-w-40 ${
          dragging ? 'shadow-lift ring-2 ring-accent/60' : 'shadow-card'
        }`}
        style={{ borderLeft: `4px solid ${card.color}` }}
      >
        {card.label}
      </span>
      {note && (
        <span className="absolute -top-2 left-2 rounded-sm bg-ink/70 px-1 text-[9px] leading-3 text-white">
          {note}
        </span>
      )}
    </span>
  )
}

export function AxisFrame({
  axisType,
  axes,
}: {
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
}) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none text-[11px] text-ink-soft">
      {axisType === '2d' ? (
        <>
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-grid-strong" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-grid-strong" />
          {/* X軸 */}
          <span className="absolute bottom-1 left-2 max-w-[38%] truncate">{axes.x.minLabel}</span>
          <span className="absolute bottom-1 right-2 max-w-[38%] truncate text-right">
            {axes.x.maxLabel} →
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-sm bg-white/80 px-1.5 font-bold">
            {axes.x.label}
          </span>
          {/* Y軸 */}
          <span className="absolute left-2 top-1 max-w-[38%] truncate">↑ {axes.y?.maxLabel}</span>
          <span className="absolute bottom-6 left-2 max-w-[38%] truncate">{axes.y?.minLabel}</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 rounded-sm bg-white/80 px-1.5 font-bold [writing-mode:vertical-rl]">
            {axes.y?.label}
          </span>
        </>
      ) : (
        <>
          <div className="absolute bottom-8 left-3 right-3 h-px bg-grid-strong" />
          <span className="absolute bottom-3 left-3">← {axes.x.minLabel}</span>
          <span className="absolute bottom-3 right-3">{axes.x.maxLabel} →</span>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-sm bg-white/80 px-1.5 font-bold">
            {axes.x.label}
          </span>
        </>
      )}
    </div>
  )
}
