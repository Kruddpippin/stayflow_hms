import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return <div className={cn('card p-5', className)} {...props}>{children}</div>
}
export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
