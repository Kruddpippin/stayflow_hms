import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Star, Mail, Phone, MapPin, LogOut } from 'lucide-react'
import { useGuests, useReservations, useMutate } from '@/hooks/useData'
import * as api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { format } from 'date-fns'
import { initials, formatDate } from '@/lib/utils'

export default function Guests() {
  const { isAdmin } = useAuth()
  const { data: guests = [], isLoading } = useGuests()
  const { data: reservations = [] } = useReservations()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const save = useMutate((p) => editing ? api.updateGuest(editing.id, p) : api.createGuest(p), { invalidate: ['guests'], success: editing ? 'Guest updated' : 'Guest added' })
  const remove = useMutate(api.deleteGuest, { invalidate: ['guests'], success: 'Guest deleted' })
  const updateRes = useMutate(({ id, ...fields }) => api.updateReservation(id, fields), { invalidate: ['reservations', 'rooms'], success: 'Guest checked out' })
  const setRoomStatus = useMutate(({ id, status }) => api.updateRoom(id, { status }), { invalidate: ['rooms'] })

  function checkOutGuest(g) {
    const active = reservations.find((r) => r.guest_id === g.id && r.status === 'checked_in')
    if (!active) return
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const isEarly = todayStr < active.check_out
    updateRes.mutate({ id: active.id, status: 'checked_out', actual_checkout: todayStr, ...(isEarly ? { early_checkout: true } : {}) })
    if (active.room_id) setRoomStatus.mutate({ id: active.room_id, status: 'dirty' })
  }

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', address: '', id_document: '', notes: '', vip: false })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function openNew() { setEditing(null); setForm({ full_name: '', email: '', phone: '', address: '', id_document: '', notes: '', vip: false }); setModal(true) }
  function openEdit(g) { setEditing(g); setForm({ full_name: g.full_name, email: g.email || '', phone: g.phone || '', address: g.address || '', id_document: g.id_document || '', notes: g.notes || '', vip: g.vip }); setModal(true) }
  async function submit(e) {
    e.preventDefault()
    await save.mutateAsync({ ...form, email: form.email || null, phone: form.phone || null, address: form.address || null, id_document: form.id_document || null, notes: form.notes || null })
    setModal(false)
  }

  const filtered = useMemo(() => guests.filter((g) => !query || g.full_name.toLowerCase().includes(query.toLowerCase()) || g.email?.toLowerCase().includes(query.toLowerCase())), [guests, query])
  const guestStays = (id) => reservations.filter((r) => r.guest_id === id)

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input className="pl-9" placeholder="Search guests…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus size={16} /> Add guest</Button>
      </div>

      {filtered.length === 0 ? <EmptyState title="No guests found" action={<Button onClick={openNew}><Plus size={16} /> Add guest</Button>} /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <Card key={g.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{initials(g.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="truncate font-semibold text-ink-900">{g.full_name}</p>{g.vip && <Badge tone="amber"><Star size={11} /> VIP</Badge>}</div>
                  <p className="text-xs text-ink-400">{guestStays(g.id).length} stays on record</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-ink-600">
                {g.email && <p className="flex items-center gap-2"><Mail size={14} className="text-ink-400" /> <span className="truncate">{g.email}</span></p>}
                {g.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-ink-400" /> {g.phone}</p>}
                {g.address && <p className="flex items-center gap-2"><MapPin size={14} className="text-ink-400" /> <span className="truncate">{g.address}</span></p>}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3">
                <Button size="sm" variant="secondary" onClick={() => setDetail(g)}>View history</Button>
                {reservations.some((r) => r.guest_id === g.id && r.status === 'checked_in') && (
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Check out ${g.full_name}?`)) checkOutGuest(g) }} title="Check out"><LogOut size={14} /> Check out</Button>
                )}
                {isAdmin && <Button size="sm" variant="ghost" onClick={() => openEdit(g)}><Pencil size={14} /></Button>}
                {isAdmin && <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${g.full_name}?`)) remove.mutate(g.id) }}><Trash2 size={14} className="text-red-500" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit guest' : 'Add guest'} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="fn" label="Full name" required value={form.full_name} onChange={set('full_name')} />
            <Input id="em" label="Email" type="email" value={form.email} onChange={set('email')} />
            <Input id="ph" label="Phone" value={form.phone} onChange={set('phone')} />
            <Input id="doc" label="ID document" value={form.id_document} onChange={set('id_document')} placeholder="Passport / ID no." />
          </div>
          <Input id="addr" label="Address" value={form.address} onChange={set('address')} />
          <Textarea id="notes" label="Notes" value={form.notes} onChange={set('notes')} placeholder="Preferences, allergies, etc." />
          <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={form.vip} onChange={(e) => setForm((f) => ({ ...f, vip: e.target.checked }))} className="h-4 w-4 rounded border-ink-300 text-brand-600" /> Mark as VIP guest</label>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" loading={save.isPending}>{editing ? 'Save' : 'Add guest'}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `${detail.full_name} — stay history` : ''} size="lg">
        {detail && (
          <div className="space-y-3">
            {detail.notes && <div className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600"><span className="font-medium text-ink-700">Notes: </span>{detail.notes}</div>}
            {guestStays(detail.id).length === 0 ? <EmptyState title="No stays yet" /> : guestStays(detail.id).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 text-sm">
                <div><p className="font-medium text-ink-900">{r.room_type?.name} {r.room?.room_number ? `· #${r.room.room_number}` : ''}</p><p className="text-xs text-ink-400">{formatDate(r.check_in)} → {formatDate(r.check_out)}</p></div>
                <Badge tone="gray">{r.status.replace('_', ' ')}</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
