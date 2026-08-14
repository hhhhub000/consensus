/** 開示ボードのドットにホバー/タップしたときのフローティング表示 */
export interface DotTipState {
  x: number
  y: number
  /** null = 匿名表示 */
  name: string | null
  note?: string
}

export function DotTipOverlay({ tip }: { tip: DotTipState | null }) {
  if (!tip) return null
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left: tip.x, top: tip.y - 12, transform: 'translate(-50%, -100%)' }}
    >
      <div className="tip-bubble max-w-64 rounded-lg bg-ink px-3 py-2 text-[13px] leading-5 text-white shadow-lift">
        <p className="font-bold">{tip.name ?? '参加者'}</p>
        {tip.note && <p className="mt-0.5 whitespace-pre-wrap font-normal">{tip.note}</p>}
      </div>
    </div>
  )
}
