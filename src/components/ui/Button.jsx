import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-soft',
  secondary: 'bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 hover:border-ink-400',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}
const sizes = { sm: 'h-8 px-2.5 text-xs', md: 'h-9 px-3.5 text-sm', lg: 'h-10 px-5 text-sm' }

export default function Button({ variant = 'primary', size = 'md', className, children, loading, disabled, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant], sizes[size], className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}
