import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clamp01 } from '../../lib/utils'
import type { AxisDef, AxisType, CardDef, Pos, Quadrants } from '../../types'

export interface PlacementBoardProps {
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  quadrants?: Quadrants
  cards: CardDef[]
  positions: Record<string, Pos>
  disabled?: boolean
  /** pos=null はトレイに戻す操作 */
  onMove?: (cardId: string, pos: Pos | null) => void
  /** ドラッグ中の逐次通知 (合意ボードのライブ同期用) */
  onDragLive?: (cardId: string, pos: Pos) => void
  /** ドラッグ/ホバー中のカード変化 (ゴースト表示用) */
  onActiveCard?: (cardId: string | null) => void
  /** 配置済みカードをクリック (ドラッグせず) したとき。メモ編集用 */
  onCardClick?: (cardId: string) => void
  /** メモ付きカードに 📝 マークを表示 */
  hasNote?: (cardId: string) => boolean
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
  startX: number
  startY: number
  /** ドラッグ開始時点で配置済みだったか (クリック判定用) */
  wasPlaced: boolean
  pos: Pos | null // ボード内にいるときのみ
}

export function PlacementBoard({
  axisType,
  axes,
  quadrants,
  cards,
  positions,
  disabled,
  onMove,
  onDragLive,
  onActiveCard,
  onCardClick,
  hasNote,
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
    setDrag({
      cardId,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      wasPlaced: !!positions[cardId],
      pos: toPos(e.clientX, e.clientY),
    })
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
    // ほぼ動かしていない配置済みカードは「クリック」= メモ編集
    const moved = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY)
    if (moved < 6 && cur.wasPlaced && onCardClick) {
      onCardClick(cur.cardId)
      return
    }
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
        <AxisFrame axisType={axisType} axes={axes} quadrants={quadrants} />
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
              noteMark={hasNote?.(card.id)}
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
      {/* body 直下に描画 (祖先の transform で fixed の基準がズレるのを防ぐ) */}
      {drag &&
        !drag.pos &&
        dragCard &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50"
            style={{
              left: drag.clientX,
              top: drag.clientY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <ChipBody card={dragCard} dragging />
          </div>,
          document.body,
        )}

      {!disabled && (
        <div className="mt-3">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-[13px] font-bold text-ink-soft">
              カード置き場 ({cards.length - trayCards.length}/{cards.length} 配置済み)
            </span>
            <span className="text-xs text-ink-soft">
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
  noteMark,
  disabled,
  dragging,
  style,
  ...handlers
}: {
  card: CardDef
  note?: string
  noteMark?: boolean
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
      <ChipBody card={card} note={note} noteMark={noteMark} dragging={dragging} />
    </button>
  )
}

function ChipBody({
  card,
  note,
  noteMark,
  dragging,
}: {
  card: CardDef
  note?: string
  noteMark?: boolean
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
        {noteMark && <span aria-label="メモあり">📝</span>}
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

const ARROW_COLOR = '#4a5a61'

/**
 * 横向きの両矢印軸 (どちらが大きいかを暗示しない中立表現)。
 * 矢頭は固定サイズの SVG、軸線は flex で伸縮させ段差なく接続する
 */
export function HArrow({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center ${className}`} aria-hidden>
      <svg width="10" height="12" viewBox="0 0 10 12" className="shrink-0">
        <path d="M10 0 L0 6 L10 12 Z" fill={ARROW_COLOR} />
      </svg>
      <span className="-mx-px h-[3px] min-w-0 flex-1" style={{ backgroundColor: ARROW_COLOR }} />
      <svg width="10" height="12" viewBox="0 0 10 12" className="shrink-0">
        <path d="M0 0 L10 6 L0 12 Z" fill={ARROW_COLOR} />
      </svg>
    </span>
  )
}

/** 縦向きの両矢印軸 */
function VArrow({ className = '' }: { className?: string }) {
  return (
    <span className={`flex flex-col items-center ${className}`} aria-hidden>
      <svg width="12" height="10" viewBox="0 0 12 10" className="shrink-0">
        <path d="M0 10 L6 0 L12 10 Z" fill={ARROW_COLOR} />
      </svg>
      <span className="-my-px w-[3px] min-h-0 flex-1" style={{ backgroundColor: ARROW_COLOR }} />
      <svg width="12" height="10" viewBox="0 0 12 10" className="shrink-0">
        <path d="M0 0 L6 10 L12 0 Z" fill={ARROW_COLOR} />
      </svg>
    </span>
  )
}

export function AxisFrame({
  axisType,
  axes,
  quadrants,
}: {
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  quadrants?: Quadrants
}) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none text-xs text-ink-soft">
      {axisType === '2d' ? (
        <>
          {/* 4象限の背景色 (開示のカード色と混ざらないようごく薄く) */}
          {quadrants && (
            <>
              <div className="absolute left-0 top-0 h-1/2 w-1/2" style={{ backgroundColor: 'rgba(42, 120, 214, 0.06)' }} />
              <div className="absolute right-0 top-0 h-1/2 w-1/2" style={{ backgroundColor: 'rgba(235, 104, 52, 0.06)' }} />
              <div className="absolute bottom-0 left-0 h-1/2 w-1/2" style={{ backgroundColor: 'rgba(27, 175, 122, 0.06)' }} />
              <div className="absolute bottom-0 right-0 h-1/2 w-1/2" style={{ backgroundColor: 'rgba(237, 161, 0, 0.055)' }} />
            </>
          )}
          {/* 十字の境界線 (4象限では太く濃く) */}
          <div
            className={`absolute top-0 h-full -translate-x-1/2 ${
              quadrants ? 'left-1/2 w-[2.5px] bg-ink/35' : 'left-1/2 w-px bg-grid-strong'
            }`}
          />
          <div
            className={`absolute left-0 w-full -translate-y-1/2 ${
              quadrants ? 'top-1/2 h-[2.5px] bg-ink/35' : 'top-1/2 h-px bg-grid-strong'
            }`}
          />
          {/* 4象限ラベル (各区画の中央に薄く表示) */}
          {quadrants &&
            (
              [
                ['tl', '25%', '25%'],
                ['tr', '75%', '25%'],
                ['bl', '25%', '75%'],
                ['br', '75%', '75%'],
              ] as const
            ).map(([key, left, top]) =>
              quadrants[key] ? (
                <span
                  key={key}
                  className="absolute max-w-[45%] -translate-x-1/2 -translate-y-1/2 text-center font-display text-base font-bold leading-6 text-ink/25 md:text-xl"
                  style={{ left, top }}
                >
                  {quadrants[key]}
                </span>
              ) : null,
            )}
          {/* X軸 (ラベルが設定されているときのみ。4象限ではラベル無しも可) */}
          {(axes.x.minLabel || axes.x.maxLabel || axes.x.label) && (
            <>
              <HArrow className="absolute inset-x-6 bottom-2" />
              <span className="absolute bottom-1 left-6 max-w-[35%] truncate rounded-sm bg-white/85 px-1.5 py-0.5 text-sm font-bold text-ink">
                {axes.x.minLabel}
              </span>
              <span className="absolute bottom-1 right-2 max-w-[38%] truncate rounded-sm bg-white/85 px-1.5 py-0.5 text-right text-sm font-bold text-ink">
                {axes.x.maxLabel}
              </span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-sm bg-white/90 px-2 py-0.5 font-bold text-ink">
                {axes.x.label}
              </span>
            </>
          )}
          {/* Y軸 */}
          {(axes.y?.minLabel || axes.y?.maxLabel || axes.y?.label) && (
            <>
              <VArrow className="absolute bottom-8 left-2 top-8" />
              <span className="absolute left-1 top-1 max-w-[45%] truncate rounded-sm bg-white/85 px-1.5 py-0.5 text-sm font-bold text-ink">
                {axes.y?.maxLabel}
              </span>
              <span className="absolute bottom-7 left-1 max-w-[40%] truncate rounded-sm bg-white/85 px-1.5 py-0.5 text-sm font-bold text-ink">
                {axes.y?.minLabel}
              </span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 rounded-sm bg-white/90 px-1 py-1.5 font-bold text-ink [writing-mode:vertical-rl]">
                {axes.y?.label}
              </span>
            </>
          )}
        </>
      ) : (
        <>
          <HArrow className="absolute inset-x-3 bottom-9" />
          <span className="absolute bottom-2.5 left-3 rounded-sm bg-white/85 px-1.5 py-0.5 text-sm font-bold text-ink">
            {axes.x.minLabel}
          </span>
          <span className="absolute bottom-2.5 right-3 rounded-sm bg-white/85 px-1.5 py-0.5 text-sm font-bold text-ink">
            {axes.x.maxLabel}
          </span>
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-sm bg-white/85 px-2 py-0.5 font-bold text-ink">
            {axes.x.label}
          </span>
        </>
      )}
    </div>
  )
}
