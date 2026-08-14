import {
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/85 disabled:bg-ink/35',
  accent: 'bg-accent text-white hover:bg-accent-deep disabled:bg-accent/40',
  outline:
    'border border-ink/20 bg-white/80 text-ink hover:border-ink/40 hover:bg-white disabled:opacity-50',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-50',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return (
    <button
      className={`inline-flex select-none items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  )
}

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-ink/20 bg-white px-3 text-sm text-ink placeholder:text-ink-faint ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  tip,
  children,
}: {
  label: string
  hint?: string
  /** ⓘ アイコンにフォーカス/ホバーで表示される説明 */
  tip?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-soft">
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-ink-soft">{hint}</span>}
    </label>
  )
}

/**
 * ホバー/フォーカスで吹き出しを出す汎用ラッパー。
 * children をトリガーとして包む。トリガーがフォーカス可能でない場合は tabIndex を付与すること。
 */
export function Tip({
  content,
  children,
  align = 'center',
}: {
  content: ReactNode
  children: ReactNode
  align?: 'center' | 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const pos =
    align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2'
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`tip-bubble pointer-events-none absolute top-full z-40 mt-1.5 w-max max-w-[min(20rem,85vw)] rounded-lg bg-ink p-3.5 text-left text-[13px] font-normal leading-6 text-white shadow-lift ${pos}`}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/** ⓘ アイコン。フォーカス/ホバーで説明の吹き出しを表示 */
export function InfoTip({
  children,
  align = 'center',
}: {
  children: ReactNode
  align?: 'center' | 'left' | 'right'
}) {
  return (
    <Tip content={children} align={align}>
      <button
        type="button"
        aria-label="項目の説明"
        onClick={(e) => e.preventDefault()}
        className="flex size-4 items-center justify-center rounded-full border border-ink/30 font-mono text-[10px] font-bold text-ink-soft hover:border-ink/60 hover:text-ink"
      >
        i
      </button>
    </Tip>
  )
}

export function Panel({
  className = '',
  children,
  ...rest
}: {
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-ink/10 bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Badge({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-ink-soft ${className}`}
    >
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={`inline-flex rounded-lg border border-ink/15 bg-white/70 p-0.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 font-medium transition-colors ${
            o.value === value ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-soft">
      <div className="size-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
