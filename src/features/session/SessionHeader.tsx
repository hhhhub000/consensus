import { useState } from 'react'
import { Link } from 'react-router'
import { Tip } from '../../components/ui'
import type { Phase, Session } from '../../types'

const PHASES: { key: Phase; label: string; description: string }[] = [
  {
    key: 'lobby',
    label: '準備',
    description: '参加者が揃うのを待つロビー。招待URLを共有してメンバーを集めます。',
  },
  {
    key: 'input',
    label: '入力',
    description:
      '各自が他の人に見えない状態でカードを配置します。周りに流されず、まず自分の考えを固めるターンです。',
  },
  {
    key: 'reveal',
    label: '開示',
    description:
      '全員の配置を一斉に公開。意見のバラツキと合意度を見ながら議論します。必要なら再入力ラウンドへ。',
  },
  {
    key: 'consensus',
    label: '合意',
    description:
      '全員で1枚のボードを共同編集し、チームとしての結論をつくります。',
  },
  {
    key: 'closed',
    label: '終了',
    description: '結果が確定した状態。このページのURLがそのまま記録になります。',
  },
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
        <ol className="flex items-center gap-1 text-xs">
          {PHASES.map((p, i) => (
            <li key={p.key} className="flex items-center gap-1">
              {i > 0 && <span className="text-ink-faint">·</span>}
              <Tip
                align={i >= 3 ? 'right' : 'center'}
                content={
                  <>
                    <b className="mb-0.5 block">{p.label}</b>
                    {p.description}
                  </>
                }
              >
                <span
                  tabIndex={0}
                  className={`cursor-help rounded-sm px-1.5 py-0.5 ${
                    i === currentIdx
                      ? 'bg-ink font-bold text-white'
                      : i < currentIdx
                        ? 'text-ink-soft'
                        : 'text-ink-faint'
                  }`}
                >
                  {p.label}
                  {p.key === session.phase &&
                    (session.phase === 'input' || session.phase === 'reveal') &&
                    ` R${session.phase === 'reveal' ? session.revealedUpTo : session.round}`}
                </span>
              </Tip>
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
