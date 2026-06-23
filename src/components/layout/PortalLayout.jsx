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
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/portal" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white"><Hotel size={16} /></div>
            <span className="text-sm font-semibold text-ink-900">StayFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/portal" end className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50')}>Rooms</NavLink>
            <NavLink to="/portal/bookings" className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50')}>My Bookings</NavLink>
            <div className="mx-2 hidden items-center sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-[10px] font-semibold text-white">{initials(profile?.full_name)}</span>
            </div>
            <button onClick={signOut} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 transition-colors" aria-label="Sign out"><LogOut size={16} /></button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 animate-fade-in"><PageErrorBoundary><Outlet /></PageErrorBoundary></main>
    </div>
  )
}
