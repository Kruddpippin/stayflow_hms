import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarX, BedDouble, X } from 'lucide-react'
import * as api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useMutate } from '@/hooks/useData'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurrency, nights, RESERVATION_STATUS } from '@/lib/utils'

export default function PortalBookings() {
  const { profile } = useAuth()
  const [guestId, setGuestId] = useState(null)

  useEffect(() => { if (profile) api.getMyGuestRecord(profile.id).then((g) => setGuestId(g?.id ?? null)) }, [profile])

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['my-reservations', guestId],
    queryFn: () => api.getMyReservations(guestId),
    enabled: Boolean(guestId),
  })

  const cancelBooking = useMutate(({ id }) => api.updateReservation(id, { status: 'cancelled' }),
    { invalidate: ['my-reservations', 'reservations'], success: 'Booking cancelled' })

  if (isLoading && guestId) return <PageLoader />

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-ink-900">My bookings</h1><p className="text-sm text-ink-500">Your upcoming and past stays with us.</p></div>
      {(!guestId || reservations.length === 0) ? (
        <EmptyState icon={CalendarX} title="No bookings yet" description="Head to the Rooms page to book your first stay." />
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><BedDouble size={20} /></div>
                <div>
                  <p className="font-semibold text-ink-900">{r.room_type?.name}{r.room?.room_number ? ` · Room ${r.room.room_number}` : ''}</p>
                  <p className="text-sm text-ink-500">{formatDate(r.check_in)} → {formatDate(r.check_out)} · {nights(r.check_in, r.check_out)} nights</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="text-xs text-ink-400">Total</p><p className="font-bold text-ink-900">{formatCurrency(nights(r.check_in, r.check_out) * r.nightly_rate)}</p></div>
                <Badge tone={RESERVATION_STATUS[r.status]?.tone}>{RESERVATION_STATUS[r.status]?.label}</Badge>
                {['pending', 'confirmed'].includes(r.status) && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (window.confirm('Cancel this booking?')) cancelBooking.mutate({ id: r.id }) }}><X size={14} /> Cancel</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
