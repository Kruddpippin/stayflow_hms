import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import PageErrorBoundary from '@/components/common/PageErrorBoundary'
import { useProperty } from '@/context/PropertyContext'
import { setActivePropertyId } from '@/hooks/useData'
import { PageLoader } from '@/components/ui/Spinner'

const titles = {
  '/dashboard': 'Dashboard', '/reservations': 'Reservations', '/rooms': 'Rooms',
  '/guests': 'Guests', '/billing': 'Billing',
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { activeProperty, loading } = useProperty()
  const title = titles[Object.keys(titles).find((k) => pathname.startsWith(k))] || 'StayFlow'

  useEffect(() => {
    setActivePropertyId(activeProperty?.id || null)
  }, [activeProperty?.id])

  if (loading) return <PageLoader label="Loading property…" />

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} title={title} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in"><PageErrorBoundary><Outlet /></PageErrorBoundary></div>
        </main>
      </div>
    </div>
  )
}
