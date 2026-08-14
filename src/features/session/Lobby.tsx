import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Badge, Panel } from '../../components/ui'
import type { Participant, Session } from '../../types'

export function Lobby({
  session,
  participants,
}: {
  session: Session
  participants: Participant[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InviteBox />
      <Panel className="p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">参加者</h2>
          <Badge>{participants.length}人</Badge>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {participants.map((p) => (
            <li
              key={p.uid}
              className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm shadow-card"
            >
              <span
                className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.name.slice(0, 1)}
              </span>
              {p.name}
              {p.uid === session.createdBy && (
                <span className="text-[10px] text-ink-faint">(作成者)</span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-lg bg-paper p-4 text-sm leading-6 text-ink-soft">
          <p className="font-bold text-ink">このあとの流れ</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>各自がひとりでカードを配置 (他の人には見えません)</li>
            <li>全員の配置を一斉開示</li>
            <li>バラツキを見ながら議論 (必要なら再ラウンド)</li>
            <li>全員で合意ボードを完成</li>
          </ol>
        </div>
      </Panel>
    </div>
  )
}

function InviteBox() {
  const url = location.href
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <Panel className="flex flex-col items-center gap-4 p-5">
      <h2 className="self-start font-display text-base font-bold">メンバーを招待</h2>
      <div className="rounded-lg border border-ink/10 bg-white p-3">
        <QRCodeSVG value={url} size={144} fgColor="#21313a" bgColor="#ffffff" />
      </div>
      <div className="flex w-full items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-ink/10 bg-paper px-2 py-1.5 font-mono text-[11px] text-ink-soft">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink/85"
        >
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      <p className="self-start text-sm text-ink-soft">
        URLを開くだけで参加できます。ログインは不要です。
      </p>
    </Panel>
  )
}
