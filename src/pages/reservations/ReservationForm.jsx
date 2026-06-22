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

export default function ReservationForm({ open, onClose, reservation }) {
  const { data: rooms = [] } = useRooms()
  const { data: roomTypes = [] } = useRoomTypes()
  const { data: guests = [] } = useGuests()
  const editing = Boolean(reservation)

  const [form, setForm] = useState({
    guest_id: '', room_type_id: '', room_id: '', check_in: today(), check_out: tomorrow(),
    adults: 1, children: 0, nightly_rate: 0, status: 'confirmed', special_requests: '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (reservation) {
      setForm({
        guest_id: reservation.guest_id || '', room_type_id: reservation.room_type_id || '',
        room_id: reservation.room_id || '', check_in: reservation.check_in, check_out: reservation.check_out,
        adults: reservation.adults, children: reservation.children, nightly_rate: reservation.nightly_rate,
        status: reservation.status, special_requests: reservation.special_requests || '',
      })
    } else {
      setForm({ guest_id: '', room_type_id: '', room_id: '', check_in: today(), check_out: tomorrow(), adults: 1, children: 0, nightly_rate: 0, status: 'confirmed', special_requests: '' })
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
      check_in: form.check_in, check_out: form.check_out, adults: Number(form.adults), children: Number(form.children),
      nightly_rate: Number(form.nightly_rate), status: form.status, special_requests: form.special_requests || null,
    }
    if (editing) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit reservation' : 'New reservation'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="guest" label="Guest" required value={form.guest_id} onChange={set('guest_id')}>
            <option value="">Select guest…</option>
            {guests.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
          </Select>
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
          <Input id="cin" label="Check-in" type="date" required value={form.check_in} onChange={set('check_in')} />
          <Input id="cout" label="Check-out" type="date" required value={form.check_out} onChange={set('check_out')} />
          <Input id="adults" label="Adults" type="number" min="1" value={form.adults} onChange={set('adults')} />
          <Input id="children" label="Children" type="number" min="0" value={form.children} onChange={set('children')} />
          <Input id="rate" label="Nightly rate" type="number" min="0" step="0.01" value={form.nightly_rate} onChange={set('nightly_rate')} />
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
