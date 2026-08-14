import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

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
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  )
}

export function Panel({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-xl border border-ink/10 bg-surface shadow-card ${className}`}>
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
