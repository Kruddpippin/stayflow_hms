import { useMemo } from 'react'
import { CalendarCheck, BedDouble, Users, DollarSign, LogIn, LogOut } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { isToday, parseISO } from 'date-fns'
import { useReservations, useRooms, useGuests, useFolios } from '@/hooks/useData'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, RESERVATION_STATUS, ROOM_STATUS } from '@/lib/utils'

const STATUS_COLORS = { available: '#10b981', occupied: '#2f5fff', dirty: '#f59e0b', maintenance: '#ef4444' }

export default function Dashboard() {
  const { data: reservations = [], isLoading: l1 } = useReservations()
  const { data: rooms = [], isLoading: l2 } = useRooms()
  const { data: guests = [], isLoading: l3 } = useGuests()
  const { data: folios = [], isLoading: l4 } = useFolios()

  const stats = useMemo(() => {
    const occupied = rooms.filter((r) => r.status === 'occupied').length
    const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0
    const arrivals = reservations.filter((r) => isToday(parseISO(r.check_in)) && ['confirmed', 'pending'].includes(r.status))
    const departures = reservations.filter((r) => isToday(parseISO(r.check_out)) && r.status === 'checked_in')
    const revenue = folios.reduce((sum, f) => sum + (f.charges || []).reduce((s, c) => s + Number(c.amount) * c.quantity, 0), 0)
    const roomStatus = Object.keys(ROOM_STATUS).map((k) => ({ name: ROOM_STATUS[k].label, key: k, value: rooms.filter((r) => r.status === k).length }))
    const byType = {}
    reservations.forEach((r) => { const n = r.room_type?.name || 'Other'; byType[n] = (byType[n] || 0) + 1 })
    const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }))
    return { occupancy, occupied, arrivals, departures, revenue, roomStatus, typeData }
  }, [rooms, reservations, folios])

  if (l1 || l2 || l3 || l4) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy rate" value={`${stats.occupancy}%`} icon={BedDouble} tone="blue" hint={`${stats.occupied} of ${rooms.length} rooms occupied`} />
        <StatCard label="Arrivals today" value={stats.arrivals.length} icon={LogIn} tone="green" />
        <StatCard label="Departures today" value={stats.departures.length} icon={LogOut} tone="amber" />
        <StatCard label="Total revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} tone="violet" hint="Across all open folios" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Reservations by room type" subtitle="Distribution of current bookings" />
          {stats.typeData.length === 0 ? <EmptyState title="No reservations yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.typeData} margin={{ left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceef2" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#607091' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#607091' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f6f7f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 13 }} />
                <Bar dataKey="value" fill="#2f5fff" radius={[8, 8, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title="Room status" subtitle={`${rooms.length} rooms total`} />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.roomStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {stats.roomStatus.map((e) => <Cell key={e.key} fill={STATUS_COLORS[e.key]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {stats.roomStatus.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-xs text-ink-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.key] }} />
                {s.name} <span className="ml-auto font-semibold text-ink-900">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-ink-100 px-5 py-4"><h3 className="text-base font-semibold text-ink-900">Recent reservations</h3></div>
        {reservations.length === 0 ? <div className="p-5"><EmptyState title="No reservations yet" icon={CalendarCheck} /></div> : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr><th className="px-5 py-3 font-medium">Guest</th><th className="px-5 py-3 font-medium">Room</th><th className="px-5 py-3 font-medium">Check-in</th><th className="px-5 py-3 font-medium">Check-out</th><th className="px-5 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {reservations.slice(0, 6).map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3 font-medium text-ink-900">{r.guest?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-ink-600">{r.room?.room_number ? `#${r.room.room_number}` : '—'} <span className="text-ink-400">· {r.room_type?.name}</span></td>
                    <td className="px-5 py-3 text-ink-600">{formatDate(r.check_in)}</td>
                    <td className="px-5 py-3 text-ink-600">{formatDate(r.check_out)}</td>
                    <td className="px-5 py-3"><Badge tone={RESERVATION_STATUS[r.status]?.tone}>{RESERVATION_STATUS[r.status]?.label}</Badge></td>
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
