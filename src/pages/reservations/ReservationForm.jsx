import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useRooms, useRoomTypes, useGuests, useMutate } from '@/hooks/useData'
import * as api from '@/services/api'
import { nights, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')
const tomorrow = () => format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')

const INITIAL = {
  guest_id: '', guest_name: '', guest_email: '', guest_phone: '',
  room_type_id: '', room_id: '', check_in: today(), check_out: tomorrow(),
  adults: 1, children: 0, nightly_rate: 0, status: 'confirmed',
  payment_method: 'at_checkin', special_requests: '',
}

export default function ReservationForm({ open, onClose, reservation, isAdmin }) {
  const { data: rooms = [] } = useRooms()
  const { data: roomTypes = [] } = useRoomTypes()
  const { data: guests = [] } = useGuests()
  const editing = Boolean(reservation)

  const [form, setForm] = useState(INITIAL)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (reservation) {
      setForm({
        guest_id: reservation.guest_id || '', guest_name: reservation.guest_name || '',
        guest_email: reservation.guest_email || '', guest_phone: reservation.guest_phone || '',
        room_type_id: reservation.room_type_id || '',
        room_id: reservation.room_id || '', check_in: reservation.check_in, check_out: reservation.check_out,
        adults: reservation.adults, children: reservation.children, nightly_rate: reservation.nightly_rate,
        status: reservation.status, payment_method: reservation.payment_method || 'at_checkin',
        special_requests: reservation.special_requests || '',
      })
    } else {
      setForm({ ...INITIAL, check_in: today(), check_out: tomorrow() })
    }
  }, [reservation, open])

  // auto-fill rate from selected room type
  useEffect(() => {
    if (!form.room_type_id) return
    const rt = roomTypes.find((t) => t.id === form.room_type_id)
    if (rt && (!editing || !form.nightly_rate)) setForm((f) => ({ ...f, nightly_rate: rt.base_rate }))
  }, [form.room_type_id]) // eslint-disable-line

  const create = useMutate(api.createReservation, { invalidate: ['reservations', 'rooms', 'folios'], success: 'Reservation created' })
  const update = useMutate((p) => api.updateReservation(reservation.id, p), { invalidate: ['reservations', 'rooms', 'folios'], success: 'Reservation updated' })

  const availableRooms = rooms.filter((r) => !form.room_type_id || r.room_type_id === form.room_type_id)
  const total = nights(form.check_in, form.check_out) * Number(form.nightly_rate || 0)

  async function submit(e) {
    e.preventDefault()
    const payload = {
      guest_id: form.guest_id || null, room_type_id: form.room_type_id || null, room_id: form.room_id || null,
      guest_name: form.guest_name || null, guest_email: form.guest_email || null, guest_phone: form.guest_phone || null,
      check_in: form.check_in, check_out: form.check_out, adults: Number(form.adults), children: Number(form.children),
      nightly_rate: Number(form.nightly_rate), status: form.status, payment_method: form.payment_method,
      special_requests: form.special_requests || null,
    }
    if (editing) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit reservation' : 'New reservation'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {/* Guest info */}
        <fieldset className="space-y-3 rounded-xl border border-ink-200 p-4">
          <legend className="px-2 text-sm font-semibold text-ink-700">Guest info <span className="font-normal text-ink-400">(all optional)</span></legend>
          <Select id="guest" label="Existing guest" value={form.guest_id} onChange={set('guest_id')}>
            <option value="">Anonymous / walk-in</option>
            {guests.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
          </Select>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input id="gname" label="Name" value={form.guest_name} onChange={set('guest_name')} placeholder="Guest name" />
            <Input id="gemail" label="Email" type="email" value={form.guest_email} onChange={set('guest_email')} placeholder="guest@email.com" />
            <Input id="gphone" label="Phone" type="tel" value={form.guest_phone} onChange={set('guest_phone')} placeholder="+1 555 000 0000" />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="rtype" label="Room type" required value={form.room_type_id} onChange={set('room_type_id')}>
            <option value="">Select type…</option>
            {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.base_rate)}/night</option>)}
          </Select>
          <Select id="room" label="Assign room" value={form.room_id} onChange={set('room_id')}>
            <option value="">Unassigned</option>
            {availableRooms.map((r) => <option key={r.id} value={r.id}>#{r.room_number} (Floor {r.floor}) — {r.status}</option>)}
          </Select>
          <Select id="status" label="Status" value={form.status} onChange={set('status')}>
            {['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </Select>
          <Select id="payment" label="Payment method" value={form.payment_method} onChange={set('payment_method')}>
            <option value="at_checkin">Pay at check-in</option>
            <option value="online">Pay online</option>
          </Select>
          <Input id="cin" label="Check-in" type="date" required value={form.check_in} onChange={set('check_in')} />
          <Input id="cout" label="Check-out" type="date" required value={form.check_out} onChange={set('check_out')} />
          <Input id="adults" label="Adults" type="number" min="1" value={form.adults} onChange={set('adults')} />
          <Input id="children" label="Children" type="number" min="0" value={form.children} onChange={set('children')} />
          <Input id="rate" label="Nightly rate" type="number" min="0" step="0.01" value={form.nightly_rate} onChange={set('nightly_rate')} disabled={editing && !isAdmin} />
          <div className="flex flex-col justify-end">
            <p className="text-sm text-ink-500">Estimated total ({nights(form.check_in, form.check_out)} nights)</p>
            <p className="text-xl font-bold text-ink-900">{formatCurrency(total)}</p>
          </div>
        </div>
        <Textarea id="req" label="Special requests" value={form.special_requests} onChange={set('special_requests')} placeholder="e.g. high floor, late check-in…" />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending || update.isPending}>{editing ? 'Save changes' : 'Create reservation'}</Button>
        </div>
      </form>
    </Modal>
  )
}
