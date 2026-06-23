import { Card } from './Card'
import { cn } from '@/lib/utils'

export default function StatCard({ label, value, icon: Icon, tone = 'blue', hint }) {
  const tones = {
    blue: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700', violet: 'bg-accent-50 text-accent-700',
  }
  return (
    <Card className="flex items-center gap-3">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        {Icon && <Icon size={18} strokeWidth={2} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-ink-900">{value}</p>
        {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
      </div>
    </Card>
  )
}
