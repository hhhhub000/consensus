import type { Replay } from '../../lib/replay'

/** 「▶ 動きを再生 / ■ 停止」ボタン。enabled でないときは何も描かない */
export function ReplayButton({
  replay,
  label = '動きを再生',
  className = '',
}: {
  replay: Replay
  label?: string
  className?: string
}) {
  if (!replay.enabled) return null
  return (
    <button
      type="button"
      onClick={replay.playing ? replay.stop : replay.start}
      className={`inline-flex h-8 shrink-0 select-none items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
        replay.playing
          ? 'border-ink bg-ink text-white hover:bg-ink/85'
          : 'border-ink/20 bg-white/80 text-ink hover:border-ink/40 hover:bg-white'
      } ${className}`}
      title={`R1 から R${replay.total} まで配置の変化を順に再生します`}
    >
      <span aria-hidden>{replay.playing ? '■' : '▶'}</span>
      {replay.playing ? '停止' : label}
    </button>
  )
}

/**
 * 再生中にボード上へ重ねるラウンドバッジと進捗バー。
 * 親要素に `relative` が必要。クリックは透過させる。
 */
export function ReplayOverlay({ replay }: { replay: Replay }) {
  if (!replay.playing) return null
  const from = ((replay.round - 1) / replay.total) * 100
  const to = (replay.round / replay.total) * 100
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2 pt-2">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-ink/90 px-2.5 py-1 font-mono text-sm font-bold text-white shadow-card">
          R{replay.round}
          <span className="text-white/60"> / {replay.total}</span>
        </span>
        <span className="text-[11px] font-medium text-ink-soft">再生中</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/10">
        <div
          key={`${replay.runId}-${replay.round}`}
          className="replay-progress h-full rounded-full bg-accent"
          style={
            {
              '--replay-from': `${from}%`,
              '--replay-to': `${to}%`,
              '--replay-step': `${replay.stepMs}ms`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  )
}
