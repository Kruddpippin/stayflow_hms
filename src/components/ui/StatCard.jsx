import { Card } from './Card'
import { cn } from '@/lib/utils'

export default function StatCard({ label, value, icon: Icon, tone = 'blue', hint }) {
  const tones = {
    blue: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <Card className="flex items-center gap-4">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-ink-900">{value}</p>
        {hint && <p className="text-xs text-ink-400">{hint}</p>}
      </div>
    </Card>
  )
}
