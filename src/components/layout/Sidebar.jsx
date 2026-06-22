import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, BedDouble, Users, Receipt, Hotel, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/rooms', label: 'Rooms', icon: BedDouble },
  { to: '/guests', label: 'Guests', icon: Users },
  { to: '/billing', label: 'Billing', icon: Receipt },
]

export default function Sidebar({ open, onClose }) {
  const { profile } = useAuth()
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-100 bg-white transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Hotel size={18} /></div>
            <div>
              <p className="text-sm font-bold leading-tight text-ink-900">StayFlow</p>
              <p className="text-[11px] text-ink-400">Hotel Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
              )}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          <div className="rounded-xl bg-ink-50 p-3">
            <p className="text-xs font-medium text-ink-700">{profile?.full_name}</p>
            <p className="text-[11px] capitalize text-ink-400">{profile?.role} account</p>
          </div>
        </div>
      </aside>
    </>
  )
}
