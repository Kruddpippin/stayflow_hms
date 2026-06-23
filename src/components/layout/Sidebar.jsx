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
      {open && <div className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-ink-200 bg-white transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex h-14 items-center justify-between gap-2 border-b border-ink-200 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white"><Hotel size={16} /></div>
            <div>
              <p className="text-sm font-semibold leading-tight text-ink-900">StayFlow</p>
              <p className="text-[10px] font-medium text-ink-400 uppercase tracking-wide">HMS</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 lg:hidden"><X size={16} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800',
              )}>
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-200 px-3 py-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-200 text-[10px] font-semibold text-ink-600">
              {profile?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-700">{profile?.full_name}</p>
              <p className="truncate text-[10px] capitalize text-ink-400">{profile?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
