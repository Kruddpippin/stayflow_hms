import { Menu, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { initials } from '@/lib/utils'

export default function Topbar({ onMenu, title }) {
  const { profile, signOut } = useAuth()
  const [menu, setMenu] = useState(false)
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/85 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
        <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
      </div>
      <div className="relative">
        <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-ink-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials(profile?.full_name)}</span>
          <span className="hidden text-sm font-medium text-ink-700 sm:block">{profile?.full_name}</span>
          <ChevronDown size={16} className="text-ink-400" />
        </button>
        {menu && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-ink-100 bg-white p-1.5 shadow-card" onMouseLeave={() => setMenu(false)}>
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-ink-800">{profile?.full_name}</p>
              <p className="truncate text-xs text-ink-400">{profile?.email}</p>
            </div>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
