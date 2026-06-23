import { useState, useMemo } from 'react'
import { Plus, Search, CalendarDays, List, Pencil, LogIn, LogOut, X } from 'lucide-react'
import { useReservations, useMutate } from '@/hooks/useData'
import * as api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurrency, nights, RESERVATION_STATUS, PAYMENT_METHODS, cn } from '@/lib/utils'
import ReservationForm from './ReservationForm'
import CalendarView from './CalendarView'

const FILTERS = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']

export default function Reservations() {
  const { isAdmin } = useAuth()
  const { data: reservations = [], isLoading } = useReservations()
  const [view, setView] = useState('list')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const updateStatus = useMutate(({ id, status, room_id }) => api.updateReservation(id, { status, ...(room_id !== undefined ? { room_id } : {}) }),
    { invalidate: ['reservations', 'rooms'], success: 'Reservation updated' })
  const setRoomStatus = useMutate(({ id, status }) => api.updateRoom(id, { status }), { invalidate: ['rooms'] })

  const filtered = useMemo(() => reservations.filter((r) => {
    const guestLabel = r.guest?.full_name || r.guest_name || ''
    const matchesQuery = !query || guestLabel.toLowerCase().includes(query.toLowerCase()) || r.room?.room_number?.includes(query)
    const matchesFilter = filter === 'all' || r.status === filter
    return matchesQuery && matchesFilter
  }), [reservations, query, filter])

  function checkIn(r) {
    updateStatus.mutate({ id: r.id, status: 'checked_in' })
    if (r.room_id) setRoomStatus.mutate({ id: r.room_id, status: 'occupied' })
  }
  function checkOut(r) {
    updateStatus.mutate({ id: r.id, status: 'checked_out' })
    if (r.room_id) setRoomStatus.mutate({ id: r.room_id, status: 'dirty' })
  }

  function openNew() { setEditing(null); setModal(true) }
  function openEdit(r) { setEditing(r); setModal(true) }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-1">
          <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-ink-500')}><List size={16} /> List</button>
          <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', view === 'calendar' ? 'bg-brand-50 text-brand-700' : 'text-ink-500')}><CalendarDays size={16} /> Calendar</button>
        </div>
        <Button onClick={openNew}><Plus size={16} /> New reservation</Button>
      </div>

      {view === 'list' ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input className="pl-9" placeholder="Search by guest or room number…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize', filter === f ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50')}>{f.replace('_', ' ')}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No reservations found" description="Try adjusting filters or create a new reservation." icon={CalendarDays} action={<Button onClick={openNew}><Plus size={16} /> New reservation</Button>} />
          ) : (
            <Card className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr><th className="px-5 py-3 font-medium">Guest</th><th className="px-5 py-3 font-medium">Room</th><th className="px-5 py-3 font-medium">Stay</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Payment</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {filtered.map((r) => {
                      const guestLabel = r.guest?.full_name || r.guest_name || 'Anonymous'
                      const contactLine = r.guest_email || r.guest_phone || null
                      return (
                      <tr key={r.id} className="hover:bg-ink-50/60">
                        <td className="px-5 py-3"><p className="font-medium text-ink-900">{guestLabel}</p>{contactLine && <p className="text-xs text-ink-400">{contactLine}</p>}<p className="text-xs text-ink-400">{r.adults} adults · {r.children} children</p></td>
                        <td className="px-5 py-3 text-ink-600">{r.room?.room_number ? `#${r.room.room_number}` : <span className="text-ink-400">Unassigned</span>}<p className="text-xs text-ink-400">{r.room_type?.name}</p></td>
                        <td className="px-5 py-3 text-ink-600">{formatDate(r.check_in, 'MMM d')} → {formatDate(r.check_out, 'MMM d')}<p className="text-xs text-ink-400">{nights(r.check_in, r.check_out)} nights</p></td>
                        <td className="px-5 py-3 font-medium text-ink-900">{formatCurrency(nights(r.check_in, r.check_out) * r.nightly_rate)}</td>
                        <td className="px-5 py-3"><Badge tone={PAYMENT_METHODS[r.payment_method]?.tone}>{PAYMENT_METHODS[r.payment_method]?.label || 'At check-in'}</Badge></td>
                        <td className="px-5 py-3"><Badge tone={RESERVATION_STATUS[r.status]?.tone}>{RESERVATION_STATUS[r.status]?.label}</Badge></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {['pending', 'confirmed'].includes(r.status) && <Button size="sm" variant="success" onClick={() => checkIn(r)} title="Check in"><LogIn size={14} /></Button>}
                            {r.status === 'checked_in' && <Button size="sm" variant="secondary" onClick={() => checkOut(r)} title="Check out"><LogOut size={14} /></Button>}
                            {isAdmin && <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Pencil size={14} /></Button>}
                            {isAdmin && !['cancelled', 'checked_out', 'checked_in'].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: 'cancelled' })} title="Cancel"><X size={14} /></Button>}
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : <CalendarView reservations={reservations} onSelect={openEdit} />}

      <ReservationForm open={modal} onClose={() => setModal(false)} reservation={editing} isAdmin={isAdmin} />
    </div>
  )
}
