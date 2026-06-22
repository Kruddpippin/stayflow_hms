import { useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, isSameMonth, isWithinInterval, parseISO, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { RESERVATION_STATUS, cn } from '@/lib/utils'

const TONE_BG = { green: 'bg-emerald-500', blue: 'bg-brand-500', amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-ink-400' }

export default function CalendarView({ reservations, onSelect }) {
  const [cursor, setCursor] = useState(new Date())
  const monthStart = startOfMonth(cursor)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(cursor)) })

  const forDay = (day) => reservations.filter((r) => {
    try { return isWithinInterval(day, { start: parseISO(r.check_in), end: parseISO(r.check_out) }) } catch { return false }
  })

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <h3 className="text-base font-semibold text-ink-900">{format(cursor, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month"><ChevronLeft size={16} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"><ChevronRight size={16} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50 text-center text-xs font-medium text-ink-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = forDay(day)
          return (
            <div key={day.toISOString()} className={cn('min-h-[96px] border-b border-r border-ink-100 p-1.5', !isSameMonth(day, cursor) && 'bg-ink-50/50')}>
              <div className={cn('mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs', isToday(day) ? 'bg-brand-600 font-semibold text-white' : 'text-ink-500')}>{format(day, 'd')}</div>
              <div className="space-y-1">
                {items.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => onSelect(r)} className="flex w-full items-center gap-1 truncate rounded-md bg-ink-50 px-1.5 py-1 text-left text-[11px] font-medium text-ink-700 hover:bg-ink-100">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_BG[RESERVATION_STATUS[r.status]?.tone])} />
                    <span className="truncate">{r.guest?.full_name || 'Guest'}</span>
                  </button>
                ))}
                {items.length > 3 && <p className="px-1.5 text-[10px] text-ink-400">+{items.length - 3} more</p>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
