import { useState } from 'react'
import { Button, Panel } from './ui'

/** カードのメモを書く小さなモーダル */
export function NoteEditor({
  cardLabel,
  cardColor,
  initial,
  hint,
  onSave,
  onClose,
}: {
  cardLabel: string
  cardColor: string
  initial: string
  hint?: string
  onSave: (note: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(initial)

  const save = () => {
    onSave(text.trim())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`${cardLabel} のメモ`}
    >
      <Panel
        className="animate-fade-up w-full max-w-sm p-5"
        // Panel 内のクリックで閉じないように
        onClick={(e) => e.stopPropagation()}
      >
        <p className="flex items-center gap-2 font-display text-base font-bold">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: cardColor }} />
          {cardLabel}
        </p>
        {hint && <p className="mt-1 text-[13px] text-ink-soft">{hint}</p>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          rows={4}
          autoFocus
          placeholder="この配置にした理由や補足を書けます (任意)"
          className="mt-3 w-full resize-none rounded-lg border border-ink/20 bg-white p-3 text-sm text-ink placeholder:text-ink-faint"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-faint">{text.length}/200</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              キャンセル
            </Button>
            {initial && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSave('')
                  onClose()
                }}
              >
                メモを削除
              </Button>
            )}
            <Button variant="accent" size="sm" onClick={save}>
              保存
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
