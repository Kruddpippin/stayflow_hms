import { Menu, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { initials } from '@/lib/utils'

export default function Topbar({ onMenu, title }) {
  const { profile, signOut } = useAuth()
  const [menu, setMenu] = useState(false)
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden" aria-label="Open menu"><Menu size={18} /></button>
        <h1 className="text-sm font-semibold text-ink-900">{title}</h1>
      </div>
      <div className="relative">
        <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50 transition-colors">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-[10px] font-semibold text-white">{initials(profile?.full_name)}</span>
          <span className="hidden text-xs font-medium text-ink-700 sm:block">{profile?.full_name}</span>
          <ChevronDown size={14} className="text-ink-400" />
        </button>
        {menu && (
          <div className="absolute right-0 mt-1 w-44 rounded-lg border border-ink-200 bg-white p-1 shadow-md" onMouseLeave={() => setMenu(false)}>
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-ink-800">{profile?.full_name}</p>
              <p className="truncate text-[11px] text-ink-400">{profile?.email}</p>
            </div>
            <hr className="my-1 border-ink-100" />
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
