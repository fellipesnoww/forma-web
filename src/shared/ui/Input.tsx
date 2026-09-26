import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/shared/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...rest }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-ink-700">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'h-11 rounded-lg border border-border bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-200 focus:border-primary-500 focus:outline-2 focus:outline-primary-100',
            error && 'border-danger-500 focus:outline-danger-500/20',
            className,
          )}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs font-medium text-danger-500">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
