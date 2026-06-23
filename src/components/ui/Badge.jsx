import { cn } from '@/lib/utils'

const tones = {
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-brand-50 text-brand-800',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-ink-100 text-ink-600',
  violet: 'bg-violet-50 text-violet-700',
}

export default function Badge({ tone = 'gray', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}
