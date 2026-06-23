import { useMemo, useState } from 'react'
import { CalendarCheck, BedDouble, Banknote, LogIn, LogOut, AlertTriangle, X } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { isToday, parseISO } from 'date-fns'
import { useReservations, useRooms, useGuests, useFolios } from '@/hooks/useData'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate, RESERVATION_STATUS, ROOM_STATUS } from '@/lib/utils'

const STATUS_COLORS = { available: '#10b981', occupied: '#0f766e', dirty: '#f59e0b', maintenance: '#ef4444' }
const STATUS_ORDER = { pending: 0, confirmed: 1, checked_in: 2, checked_out: 3, cancelled: 4, no_show: 5 }

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const { data: reservations = [], isLoading: l1 } = useReservations()
  const { data: rooms = [], isLoading: l2 } = useRooms()
  const { data: guests = [], isLoading: l3 } = useGuests()
  const { data: folios = [], isLoading: l4 } = useFolios()
  const [dismissedEarly, setDismissedEarly] = useState(false)

  const stats = useMemo(() => {
    const occupied = rooms.filter((r) => r.status === 'occupied').length
    const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0
    const arrivals = reservations.filter((r) => isToday(parseISO(r.check_in)) && ['confirmed', 'pending'].includes(r.status))
    const departures = reservations.filter((r) => isToday(parseISO(r.check_out)) && r.status === 'checked_in')
    const revenue = folios.reduce((sum, f) => sum + (f.payments || []).reduce((s, p) => s + Number(p.amount), 0), 0)
    const billed = folios.reduce((sum, f) => sum + (f.charges || []).reduce((s, c) => s + Number(c.amount) * c.quantity, 0), 0)
    const earlyCheckouts = reservations.filter((r) => r.early_checkout)
    const roomStatus = Object.keys(ROOM_STATUS).map((k) => ({ name: ROOM_STATUS[k].label, key: k, value: rooms.filter((r) => r.status === k).length }))
    const byType = {}
    reservations.forEach((r) => { const n = r.room_type?.name || 'Other'; byType[n] = (byType[n] || 0) + 1 })
    const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }))
    return { occupancy, occupied, arrivals, departures, revenue, billed, earlyCheckouts, roomStatus, typeData }
  }, [rooms, reservations, folios])

  if (l1 || l2 || l3 || l4) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Occupancy rate" value={`${stats.occupancy}%`} icon={BedDouble} tone="blue" hint={`${stats.occupied} of ${rooms.length} rooms occupied`} />
        <StatCard label="Arrivals today" value={stats.arrivals.length} icon={LogIn} tone="green" />
        <StatCard label="Departures today" value={stats.departures.length} icon={LogOut} tone="amber" />
        {isAdmin && <StatCard label="Total revenue" value={formatCurrency(stats.revenue)} icon={Banknote} tone="violet" hint={`${formatCurrency(stats.billed)} billed`} />}
        <Card className="flex flex-col justify-center">
          <p className="mb-2 text-xs font-medium text-ink-500">Room status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {stats.roomStatus.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-xs text-ink-600">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.key] }} />
                {s.name} <span className="ml-auto font-semibold text-ink-900">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      {isAdmin && !dismissedEarly && stats.earlyCheckouts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 p-0">
          <div className="border-b border-amber-200 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Early checkouts ({stats.earlyCheckouts.length})</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setDismissedEarly(true)} aria-label="Dismiss early checkout alert"><X size={14} /></Button>
          </div>
          <div className="divide-y divide-amber-100">
            {stats.earlyCheckouts.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{r.guest?.full_name || r.guest_name || 'Anonymous'}</p>
                  <p className="text-xs text-ink-500">{r.room?.room_number ? `Room #${r.room.room_number}` : ''} {r.room_type?.name ? `· ${r.room_type.name}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-500">Scheduled: {formatDate(r.check_out)}</p>
                  <p className="text-xs font-medium text-amber-700">Actual: {formatDate(r.actual_checkout)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader title="Reservations by room type" subtitle="Distribution of current bookings" />
          {stats.typeData.length === 0 ? <EmptyState title="No reservations yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.typeData} margin={{ left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceef2" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#607091' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#607091' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f6f7f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 13 }} />
                <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-ink-100 px-5 py-4"><h3 className="text-sm font-semibold text-ink-900">Recent reservations</h3></div>
        {reservations.length === 0 ? <div className="p-5"><EmptyState title="No reservations yet" icon={CalendarCheck} /></div> : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr><th className="px-5 py-3 font-medium">Guest</th><th className="px-5 py-3 font-medium">Room</th><th className="px-5 py-3 font-medium">Check-in</th><th className="px-5 py-3 font-medium">Check-out</th><th className="px-5 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {[...reservations].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)).slice(0, 6).map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3 font-medium text-ink-900">{r.guest?.full_name || r.guest_name || 'Anonymous'}</td>
                    <td className="px-5 py-3 text-ink-600">{r.room?.room_number ? `#${r.room.room_number}` : '—'} <span className="text-ink-400">· {r.room_type?.name}</span></td>
                    <td className="px-5 py-3 text-ink-600">{formatDate(r.check_in)}</td>
                    <td className="px-5 py-3 text-ink-600">{formatDate(r.check_out)}</td>
                    <td className="px-5 py-3"><Badge tone={RESERVATION_STATUS[r.status]?.tone}>{RESERVATION_STATUS[r.status]?.label}</Badge>{r.early_checkout && <Badge tone="amber" className="ml-1">Early</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
