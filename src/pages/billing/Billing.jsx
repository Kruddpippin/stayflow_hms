import { useState, useMemo } from 'react'
import { Receipt, Plus, CreditCard, Banknote, FileText, Trash2 } from 'lucide-react'
import { useFolios, useMutate } from '@/hooks/useData'
import * as api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'

const folioTotals = (f) => {
  const charges = (f.charges || []).reduce((s, c) => s + Number(c.amount) * c.quantity, 0)
  const payments = (f.payments || []).reduce((s, p) => s + Number(p.amount), 0)
  return { charges, payments, balance: charges - payments }
}

export default function Billing() {
  const { isAdmin } = useAuth()
  const { data: folios = [], isLoading } = useFolios()
  const [active, setActive] = useState(null)
  const [chargeModal, setChargeModal] = useState(false)
  const [payModal, setPayModal] = useState(false)

  const addCharge = useMutate(api.addCharge, { invalidate: ['folios'], success: 'Charge added' })
  const delCharge = useMutate(api.deleteCharge, { invalidate: ['folios'] })
  const addPayment = useMutate(api.addPayment, { invalidate: ['folios'], success: 'Payment recorded' })
  const closeFolio = useMutate(api.closeFolio, { invalidate: ['folios'], success: 'Folio closed' })

  const [charge, setCharge] = useState({ description: '', type: 'service', amount: '', quantity: 1 })
  const [payment, setPayment] = useState({ amount: '', method: 'card', reference: '' })

  const summary = useMemo(() => {
    let charges = 0, payments = 0
    folios.forEach((f) => { const t = folioTotals(f); charges += t.charges; payments += t.payments })
    return { charges, payments, outstanding: charges - payments, open: folios.filter((f) => f.status === 'open').length }
  }, [folios])

  const current = folios.find((f) => f.id === active?.id) || active

  async function submitCharge(e) {
    e.preventDefault()
    await addCharge.mutateAsync({ folio_id: current.id, description: charge.description, type: charge.type, amount: Number(charge.amount), quantity: Number(charge.quantity) })
    setCharge({ description: '', type: 'service', amount: '', quantity: 1 }); setChargeModal(false)
  }
  async function submitPayment(e) {
    e.preventDefault()
    await addPayment.mutateAsync({ folio_id: current.id, amount: Number(payment.amount), method: payment.method, reference: payment.reference || null })
    setPayment({ amount: '', method: 'card', reference: '' }); setPayModal(false)
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total billed" value={formatCurrency(summary.charges)} icon={FileText} tone="blue" />
        <StatCard label="Collected" value={formatCurrency(summary.payments)} icon={Banknote} tone="green" />
        <StatCard label="Outstanding" value={formatCurrency(summary.outstanding)} icon={CreditCard} tone="amber" />
        <StatCard label="Open folios" value={summary.open} icon={Receipt} tone="violet" />
      </div>

      {folios.length === 0 ? <EmptyState title="No folios yet" description="Folios are created automatically when a reservation is made." icon={Receipt} /> : (
        <Card className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr><th className="px-5 py-3 font-medium">Folio / Guest</th><th className="px-5 py-3 font-medium">Room</th><th className="px-5 py-3 font-medium">Charges</th><th className="px-5 py-3 font-medium">Paid</th><th className="px-5 py-3 font-medium">Balance</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {folios.map((f) => {
                  const t = folioTotals(f)
                  return (
                    <tr key={f.id} className="cursor-pointer hover:bg-ink-50/60" onClick={() => setActive(f)}>
                      <td className="px-5 py-3"><p className="font-medium text-ink-900">{f.reservation?.guest?.full_name || 'Guest'}</p><p className="text-xs text-ink-400">#{f.id.slice(0, 8)}</p></td>
                      <td className="px-5 py-3 text-ink-600">{f.reservation?.room?.room_number ? `#${f.reservation.room.room_number}` : '—'}</td>
                      <td className="px-5 py-3 text-ink-600">{formatCurrency(t.charges)}</td>
                      <td className="px-5 py-3 text-ink-600">{formatCurrency(t.payments)}</td>
                      <td className="px-5 py-3 font-semibold text-ink-900">{formatCurrency(t.balance)}</td>
                      <td className="px-5 py-3"><Badge tone={f.status === 'open' ? 'blue' : 'gray'}>{f.status}</Badge></td>
                      <td className="px-5 py-3 text-right"><Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setActive(f) }}>Open</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={current ? `Folio — ${current.reservation?.guest?.full_name || 'Guest'}` : ''} size="xl">
        {current && (() => {
          const t = folioTotals(current)
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-ink-50 p-3"><p className="text-xs text-ink-500">Charges</p><p className="text-lg font-bold text-ink-900">{formatCurrency(t.charges)}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-600">Paid</p><p className="text-lg font-bold text-emerald-700">{formatCurrency(t.payments)}</p></div>
                <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-600">Balance due</p><p className="text-lg font-bold text-amber-700">{formatCurrency(t.balance)}</p></div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-ink-800">Charges</h4><Button size="sm" variant="secondary" onClick={() => setChargeModal(true)}><Plus size={14} /> Add charge</Button></div>
                <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                  {(current.charges || []).length === 0 ? <p className="px-4 py-3 text-sm text-ink-400">No charges yet.</p> : current.charges.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div><p className="font-medium text-ink-800">{c.description}</p><p className="text-xs capitalize text-ink-400">{c.type} · {c.quantity} × {formatCurrency(c.amount)}</p></div>
                      <div className="flex items-center gap-3"><span className="font-semibold text-ink-900">{formatCurrency(c.amount * c.quantity)}</span>{isAdmin && <button onClick={() => delCharge.mutate(c.id)} className="text-ink-400 hover:text-red-500"><Trash2 size={14} /></button>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-ink-800">Payments</h4><Button size="sm" variant="success" onClick={() => setPayModal(true)}><Plus size={14} /> Record payment</Button></div>
                <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                  {(current.payments || []).length === 0 ? <p className="px-4 py-3 text-sm text-ink-400">No payments yet.</p> : current.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div><p className="font-medium capitalize text-ink-800">{p.method.replace('_', ' ')}</p><p className="text-xs text-ink-400">{p.reference || '—'} · {formatDate(p.created_at)}</p></div>
                      <span className="font-semibold text-emerald-700">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {current.status === 'open' && <div className="flex justify-end border-t border-ink-100 pt-4"><Button variant="secondary" onClick={() => closeFolio.mutate(current.id)} disabled={t.balance > 0}>{t.balance > 0 ? `Settle ${formatCurrency(t.balance)} to close` : 'Close folio'}</Button></div>}
            </div>
          )
        })()}
      </Modal>

      <Modal open={chargeModal} onClose={() => setChargeModal(false)} title="Add charge">
        <form onSubmit={submitCharge} className="space-y-4">
          <Input id="cd" label="Description" required value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Select id="ct" label="Type" value={charge.type} onChange={(e) => setCharge({ ...charge, type: e.target.value })}>{['room', 'food', 'minibar', 'service', 'tax', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}</Select>
            <Input id="ca" label="Amount" type="number" min="0" step="0.01" required value={charge.amount} onChange={(e) => setCharge({ ...charge, amount: e.target.value })} />
            <Input id="cq" label="Qty" type="number" min="1" value={charge.quantity} onChange={(e) => setCharge({ ...charge, quantity: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setChargeModal(false)}>Cancel</Button><Button type="submit" loading={addCharge.isPending}>Add</Button></div>
        </form>
      </Modal>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record payment">
        <form onSubmit={submitPayment} className="space-y-4">
          <Input id="pa" label="Amount" type="number" min="0" step="0.01" required value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
          <Select id="pm" label="Method" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>{['card', 'cash', 'bank_transfer', 'online'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}</Select>
          <Input id="pr" label="Reference" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} placeholder="Transaction ID (optional)" />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPayModal(false)}>Cancel</Button><Button type="submit" variant="success" loading={addPayment.isPending}>Record</Button></div>
        </form>
      </Modal>
    </div>
  )
}
