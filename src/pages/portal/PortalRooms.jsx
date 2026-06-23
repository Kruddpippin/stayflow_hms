import { useState } from 'react'
import { Users, Wifi, Check, CalendarPlus, BedDouble, Eye } from 'lucide-react'
import { useRoomTypes, useRooms, useMutate } from '@/hooks/useData'
import * as api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency, nights, ROOM_STATUS } from '@/lib/utils'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const today = () => format(new Date(), 'yyyy-MM-dd')
const tomorrow = () => format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')

export default function PortalRooms() {
  const { data: types = [], isLoading: typesLoading } = useRoomTypes()
  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({ check_in: today(), check_out: tomorrow(), adults: 1, children: 0, special_requests: '', payment_method: 'at_checkin' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const book = useMutate(api.createReservation, { invalidate: ['reservations'], success: 'Booking requested! We will confirm shortly.' })

  async function submit(e) {
    e.preventDefault()
    if (form.check_out <= form.check_in) return toast.error('Check-out must be after check-in')
    const guest = await api.ensureGuestRecord(profile)
    await book.mutateAsync({
      guest_id: guest.id, room_type_id: selected.id, check_in: form.check_in, check_out: form.check_out,
      adults: Number(form.adults), children: Number(form.children), nightly_rate: selected.base_rate,
      status: 'pending', payment_method: form.payment_method, special_requests: form.special_requests || null,
    })
    qc.invalidateQueries({ queryKey: ['my-reservations'] })
    setSelected(null)
    setForm({ check_in: today(), check_out: tomorrow(), adults: 1, children: 0, special_requests: '', payment_method: 'at_checkin' })
  }

  const roomsForType = (typeId) => rooms.filter((r) => r.room_type_id === typeId)

  if (typesLoading || roomsLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">Find your perfect room</h1>
        <p className="mt-1 max-w-lg text-white/80">Browse our rooms and suites, then book your stay in seconds. Welcome back, {profile?.full_name?.split(' ')[0]}.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {types.map((t) => {
          const typeRooms = roomsForType(t.id)
          const available = typeRooms.filter((r) => r.status === 'available').length
          return (
            <Card key={t.id} className="flex flex-col overflow-hidden p-0">
              <div className="relative">
                {t.image_url ? <img src={t.image_url} alt={t.name} className="h-48 w-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none' }} /> : <div className="flex h-48 w-full items-center justify-center bg-ink-100 text-ink-400">No image</div>}
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-brand-700">{formatCurrency(t.base_rate)}<span className="text-xs font-normal text-ink-400">/night</span></span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-ink-900">{t.name}</h3>
                <p className="mt-1 flex-1 text-sm text-ink-500">{t.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1"><Users size={14} /> Up to {t.capacity}</span>
                  <span className="inline-flex items-center gap-1"><Wifi size={14} /> {t.amenities?.length} amenities</span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600">{available} available</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.amenities?.slice(0, 3).map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-0.5 text-[11px] text-ink-600"><Check size={11} /> {a}</span>)}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => setSelected(t)}><CalendarPlus size={16} /> Book</Button>
                  <Button variant="secondary" onClick={() => setViewing(t)}><Eye size={16} /> View rooms</Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* View rooms modal */}
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing ? `${viewing.name} — Rooms` : ''} size="lg">
        {viewing && (() => {
          const typeRooms = roomsForType(viewing.id)
          return (
            <div className="space-y-3">
              <p className="text-xs text-ink-500">{typeRooms.length} rooms of this type</p>
              {typeRooms.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">No rooms configured for this type yet.</p>
              ) : (
                <div className="divide-y divide-ink-100 rounded-lg border border-ink-200">
                  {typeRooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50 text-ink-400"><BedDouble size={16} /></div>
                        <div>
                          <p className="text-sm font-medium text-ink-800">Room {r.room_number}</p>
                          <p className="text-xs text-ink-400">Floor {r.floor}</p>
                        </div>
                      </div>
                      <Badge tone={ROOM_STATUS[r.status]?.tone}>{ROOM_STATUS[r.status]?.label}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button onClick={() => { setViewing(null); setSelected(viewing) }}><CalendarPlus size={16} /> Book this room type</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Booking modal */}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Book — ${selected.name}` : ''} size="lg">
        {selected && (
          <form onSubmit={submit} className="space-y-4">
            <img src={selected.image_url} alt={selected.name} className="h-40 w-full rounded-lg object-cover" />
            <div className="grid grid-cols-2 gap-4">
              <Input id="ci" label="Check-in" type="date" min={today()} required value={form.check_in} onChange={set('check_in')} />
              <Input id="co" label="Check-out" type="date" min={form.check_in || today()} required value={form.check_out} onChange={set('check_out')} />
              <Input id="ad" label="Adults" type="number" min="1" max={selected.capacity} value={form.adults} onChange={set('adults')} />
              <Input id="ch" label="Children" type="number" min="0" value={form.children} onChange={set('children')} />
            </div>
            <Textarea id="sr" label="Special requests" value={form.special_requests} onChange={set('special_requests')} placeholder="Anything we should know?" />
            <Select id="pm" label="Payment method" value={form.payment_method} onChange={set('payment_method')}>
              <option value="online">Pay now (online)</option>
              <option value="at_checkin">Pay at check-in</option>
            </Select>
            <div className="flex items-center justify-between rounded-lg bg-ink-50 p-4">
              <div>
                <p className="text-xs text-ink-500">{nights(form.check_in, form.check_out)} nights x {formatCurrency(selected.base_rate)}</p>
                <p className="text-xl font-semibold text-ink-900">{formatCurrency(nights(form.check_in, form.check_out) * selected.base_rate)}</p>
              </div>
              <Button type="submit" loading={book.isPending}>{form.payment_method === 'online' ? 'Pay & confirm' : 'Confirm booking'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
