import { Link, NavLink, Outlet } from 'react-router-dom'
import { Hotel, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import PageErrorBoundary from '@/components/common/PageErrorBoundary'
import { initials } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function PortalLayout() {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/portal" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Hotel size={18} /></div>
            <span className="text-base font-bold text-ink-900">StayFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/portal" end className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100')}>Rooms</NavLink>
            <NavLink to="/portal/bookings" className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100')}>My Bookings</NavLink>
            <div className="mx-2 hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials(profile?.full_name)}</span>
            </div>
            <button onClick={signOut} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Sign out"><LogOut size={18} /></button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 animate-fade-in"><PageErrorBoundary><Outlet /></PageErrorBoundary></main>
    </div>
  )
}
