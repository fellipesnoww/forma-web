import { type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useEffect, useId, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import type { Tone } from '@/features/admin/lib/format'

const toneClasses: Record<Tone, string> = {
  success: 'bg-success-50 text-success-600',
  neutral: 'bg-surface-sunken text-ink-600',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-500',
  primary: 'bg-primary-50 text-primary-500',
}

export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] leading-none font-extrabold whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export const dotTone: Record<Tone, string> = {
  success: 'bg-success-500',
  neutral: 'bg-ink-200',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  primary: 'bg-primary-500',
}

/** Switch with a 44px hit area. Stops propagation so it can live inside a clickable table row. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-primary-500 disabled:opacity-50"
    >
      <span
        className={cn(
          'relative h-[23px] w-10 rounded-full transition-colors',
          checked ? 'bg-success-500' : 'bg-switch-off',
        )}
      >
        <span
          className={cn(
            'absolute top-[2.5px] h-[18px] w-[18px] rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left]',
            checked ? 'left-[19.5px]' : 'left-[2.5px]',
          )}
        />
      </span>
    </button>
  )
}

/** Search box that pushes its value up after a short pause, so typing doesn't fire a request per key. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft.trim()), 300)
    return () => clearTimeout(timer)
  }, [draft, value, onChange])

  return (
    <div className={cn('relative', className)}>
      <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-200" />
      <input
        type="search"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[11px] border border-border bg-surface-soft pr-3.5 pl-10 text-sm font-medium text-ink-900 placeholder:text-ink-200 focus:border-primary-500 focus:bg-surface focus:outline-2 focus:outline-primary-100"
      />
    </div>
  )
}

/** Segmented control (design: users tabs). Scrolls horizontally on narrow screens. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string }[]
  value: V
  onChange: (value: V) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'min-h-9 shrink-0 rounded-[9px] px-3.5 text-[12.5px] font-bold whitespace-nowrap',
            value === opt.value ? 'bg-primary-50 font-extrabold text-primary-500' : 'text-ink-600 hover:bg-surface-soft',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const selectClass =
  'h-11 w-full appearance-none rounded-xl border border-border bg-surface pr-9 pl-3.5 text-sm font-semibold text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100'

/** Filter dropdown styled as a chip-height select (design: "Categoria: todas"). */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-200" />
    </div>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}

/** Labeled select for react-hook-form, same look as `Input`. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, children, className, ...rest }, ref) => {
    const autoId = useId()
    const selectId = id ?? autoId
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={selectId} className="text-sm font-semibold text-ink-700">
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : undefined}
            className={cn(selectClass, 'rounded-lg', error && 'border-danger-500')}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-200" />
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-xs font-medium text-danger-500">
            {error}
          </p>
        )}
      </div>
    )
  },
)
SelectField.displayName = 'SelectField'

export function TextareaField({
  label,
  error,
  ...rest
}: { label: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-700">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error}
        className={cn(
          'resize-y rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-200 focus:border-primary-500 focus:outline-2 focus:outline-primary-100',
          error && 'border-danger-500',
        )}
        {...rest}
      />
      {error && <p className="text-xs font-medium text-danger-500">{error}</p>}
    </div>
  )
}

/** Header strip of every admin screen: title + count on the left, actions/search on the right. */
export function AdminHeader({ title, meta, children }: { title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:min-h-[70px] md:px-7 md:py-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h1 className="text-[19px] font-extrabold tracking-[-0.3px] text-ink-900">{title}</h1>
        {meta}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  )
}

/** Avatar with the design's striped placeholder behind it until (or unless) the image loads. */
export function Avatar({ src, size = 34, className }: { src?: string | null; size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('shrink-0 overflow-hidden rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: 'repeating-linear-gradient(135deg,#E2E6EF,#E2E6EF 5px,#EDEFF5 5px,#EDEFF5 10px)',
      }}
    >
      {src && <AuthedImage src={src} alt="" className="h-full w-full object-cover" />}
    </div>
  )
}
