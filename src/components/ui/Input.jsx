import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ label, error, className, id, ...props }, ref) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-ink-700">{label}</label>}
      <input id={id} ref={ref} className={cn('input-base', error && 'border-red-400 focus:ring-red-100', className)} {...props} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})

export function Select({ label, error, className, id, children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-ink-700">{label}</label>}
      <select id={id} className={cn('input-base appearance-none bg-no-repeat', className)} {...props}>{children}</select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Textarea({ label, className, id, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-ink-700">{label}</label>}
      <textarea id={id} className={cn('input-base min-h-[88px] resize-y', className)} {...props} />
    </div>
  )
}
