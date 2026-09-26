import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { Spinner } from '@/shared/ui/Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-500 text-white shadow-[0_8px_18px_rgba(45,91,255,0.28)] hover:bg-primary-600 disabled:opacity-60',
  secondary: 'bg-white text-ink-700 border border-border hover:bg-surface-soft',
  ghost: 'bg-transparent text-ink-700 hover:bg-surface-soft',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 disabled:opacity-60',
}

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, disabled, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {loading && <Spinner size="sm" className={variant === 'primary' || variant === 'danger' ? 'border-white/30 border-t-white' : undefined} />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
