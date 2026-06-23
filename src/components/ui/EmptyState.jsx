import { Inbox } from 'lucide-react'
export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-300 bg-ink-50/50 px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-400"><Icon size={18} /></div>
      <h3 className="text-sm font-medium text-ink-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
