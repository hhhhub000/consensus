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
 * ボードの直上に置く再生ラウンドのバッジと進捗バー。
 * 盤面の情報 (1次元の軸ヘッダー、2次元のY軸ラベル) を隠さないよう重ねずに配置し、
 * 再生していない間も同じ高さを invisible で確保して盤面がガタつかないようにする。
 */
export function ReplayHud({ replay }: { replay: Replay }) {
  if (!replay.enabled) return null
  const shown = replay.round || 1
  const from = ((shown - 1) / replay.total) * 100
  const to = (shown / replay.total) * 100
  return (
    <div
      className={`mb-1.5 select-none ${replay.playing ? '' : 'invisible'}`}
      aria-hidden={!replay.playing}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-ink/90 px-2.5 py-0.5 font-mono text-sm font-bold text-white">
          R{shown}
          <span className="text-white/60"> / {replay.total}</span>
        </span>
        <span className="text-[11px] font-medium text-ink-soft">再生中</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/10">
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
