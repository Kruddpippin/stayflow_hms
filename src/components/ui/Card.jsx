import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return <div className={cn('card', className)} {...props}>{children}</div>
}
export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
