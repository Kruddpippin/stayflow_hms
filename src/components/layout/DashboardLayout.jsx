import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titles = {
  '/dashboard': 'Dashboard', '/reservations': 'Reservations', '/rooms': 'Rooms',
  '/guests': 'Guests', '/billing': 'Billing',
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const title = titles[Object.keys(titles).find((k) => pathname.startsWith(k))] || 'StayFlow'
  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} title={title} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
