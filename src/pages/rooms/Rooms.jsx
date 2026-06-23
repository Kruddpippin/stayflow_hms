import { useState } from 'react'
import { Plus, BedDouble, Pencil, Trash2, Users, Tag } from 'lucide-react'
import { useRooms, useRoomTypes, useMutate } from '@/hooks/useData'
import * as api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import { ROOM_STATUS, formatCurrency, cn } from '@/lib/utils'

export default function Rooms() {
  const { isAdmin } = useAuth()
  const { data: rooms = [], isLoading } = useRooms()
  const { data: types = [] } = useRoomTypes()
  const [tab, setTab] = useState('rooms')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const save = useMutate((p) => editing ? api.updateRoom(editing.id, p) : api.createRoom(p), { invalidate: ['rooms'], success: editing ? 'Room updated' : 'Room added' })
  const setStatus = useMutate(({ id, status }) => api.updateRoom(id, { status }), { invalidate: ['rooms'] })
  const remove = useMutate(api.deleteRoom, { invalidate: ['rooms'], success: 'Room deleted' })

  const [form, setForm] = useState({ room_number: '', room_type_id: '', floor: 1, status: 'available', notes: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function openNew() { setEditing(null); setForm({ room_number: '', room_type_id: types[0]?.id || '', floor: 1, status: 'available', notes: '' }); setModal(true) }
  function openEdit(r) { setEditing(r); setForm({ room_number: r.room_number, room_type_id: r.room_type_id, floor: r.floor, status: r.status, notes: r.notes || '' }); setModal(true) }
  async function submit(e) {
    e.preventDefault()
    await save.mutateAsync({ room_number: form.room_number, room_type_id: form.room_type_id, floor: Number(form.floor), status: form.status, notes: form.notes || null })
    setModal(false)
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-1">
          <button onClick={() => setTab('rooms')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', tab === 'rooms' ? 'bg-brand-50 text-brand-700' : 'text-ink-500')}>Rooms ({rooms.length})</button>
          <button onClick={() => setTab('types')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', tab === 'types' ? 'bg-brand-50 text-brand-700' : 'text-ink-500')}>Room types ({types.length})</button>
        </div>
        {tab === 'rooms' && isAdmin && <Button onClick={openNew}><Plus size={16} /> Add room</Button>}
      </div>

      {tab === 'rooms' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((r) => (
            <Card key={r.id} className="group relative">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><BedDouble size={18} /></div>
                  <div><p className="font-semibold text-ink-900">Room {r.room_number}</p><p className="text-xs text-ink-400">Floor {r.floor} · {r.room_type?.name}</p></div>
                </div>
                <Badge tone={ROOM_STATUS[r.status]?.tone}>{ROOM_STATUS[r.status]?.label}</Badge>
              </div>
              <p className="text-sm text-ink-500">{formatCurrency(r.room_type?.base_rate)} <span className="text-ink-400">/ night</span></p>
              <div className="mt-3 flex items-center gap-2">
                {isAdmin ? (
                  <Select className="h-9 py-1.5 text-xs" value={r.status} onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value })}>
                    {Object.keys(ROOM_STATUS).map((s) => <option key={s} value={s}>{ROOM_STATUS[s].label}</option>)}
                  </Select>
                ) : (
                  <Badge tone={ROOM_STATUS[r.status]?.tone}>{ROOM_STATUS[r.status]?.label}</Badge>
                )}
                {isAdmin && <Button size="sm" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit room"><Pencil size={14} /></Button>}
                {isAdmin && <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Delete room ${r.room_number}?`)) remove.mutate(r.id) }} aria-label="Delete room"><Trash2 size={14} className="text-red-500" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <Card key={t.id} className="overflow-hidden p-0">
              {t.image_url ? <img src={t.image_url} alt={t.name} className="h-40 w-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none' }} /> : <div className="flex h-40 w-full items-center justify-center bg-ink-100 text-sm text-ink-400"><BedDouble size={24} /></div>}
              <div className="p-5">
                <div className="flex items-center justify-between"><h3 className="font-semibold text-ink-900">{t.name}</h3><span className="font-bold text-brand-600">{formatCurrency(t.base_rate)}</span></div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">{t.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1"><Users size={13} /> {t.capacity} guests</span>
                  <span className="inline-flex items-center gap-1"><Tag size={13} /> {t.amenities?.length || 0} amenities</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.amenities?.slice(0, 4).map((a) => <span key={a} className="rounded-md bg-ink-50 px-2 py-0.5 text-[11px] text-ink-600">{a}</span>)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit room' : 'Add room'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input id="rn" label="Room number" required value={form.room_number} onChange={set('room_number')} />
            <Input id="fl" label="Floor" type="number" min="1" value={form.floor} onChange={set('floor')} />
          </div>
          <Select id="rt" label="Room type" required value={form.room_type_id} onChange={set('room_type_id')}>
            <option value="">Select type…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select id="st" label="Status" value={form.status} onChange={set('status')}>
            {Object.keys(ROOM_STATUS).map((s) => <option key={s} value={s}>{ROOM_STATUS[s].label}</option>)}
          </Select>
          <Input id="nt" label="Notes" value={form.notes} onChange={set('notes')} placeholder="Optional" />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" loading={save.isPending}>{editing ? 'Save' : 'Add room'}</Button></div>
        </form>
      </Modal>
    </div>
  )
}
