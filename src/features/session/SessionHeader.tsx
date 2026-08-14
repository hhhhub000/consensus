import { useState } from 'react'
import { Link } from 'react-router'
import type { Phase, Session } from '../../types'

const PHASES: { key: Phase; label: string }[] = [
  { key: 'lobby', label: '準備' },
  { key: 'input', label: '入力' },
  { key: 'reveal', label: '開示' },
  { key: 'consensus', label: '合意' },
  { key: 'closed', label: '終了' },
]

export function SessionHeader({ session }: { session: Session }) {
  const [copied, setCopied] = useState(false)
  const currentIdx = PHASES.findIndex((p) => p.key === session.phase)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard 不許可時は無視 */
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link to="/" className="font-display text-base font-bold text-ink-soft hover:text-ink">
        Consensus
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold md:text-xl">
        {session.title}
      </h1>
      <div className="flex items-center gap-3">
        <ol className="flex items-center gap-1 text-[11px]">
          {PHASES.map((p, i) => (
            <li key={p.key} className="flex items-center gap-1">
              {i > 0 && <span className="text-ink-faint">·</span>}
              <span
                className={
                  i === currentIdx
                    ? 'rounded-sm bg-ink px-1.5 py-0.5 font-bold text-white'
                    : i < currentIdx
                      ? 'text-ink-soft'
                      : 'text-ink-faint'
                }
              >
                {p.label}
                {p.key === session.phase &&
                  (session.phase === 'input' || session.phase === 'reveal') &&
                  ` R${session.phase === 'reveal' ? session.revealedUpTo : session.round}`}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-ink/15 bg-white/70 px-2 py-1 text-[11px] font-medium text-ink-soft hover:border-ink/40"
          title="このページのURLをコピー (招待用)"
        >
          {copied ? 'コピーしました' : 'URLコピー'}
        </button>
      </div>
    </header>
  )
}
