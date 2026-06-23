import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PortalLayout from '@/components/layout/PortalLayout'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'

function retry(fn) {
  return lazy(() => fn().catch(() => { window.location.reload() }))
}

const Login = retry(() => import('@/pages/auth/Login'))
const Signup = retry(() => import('@/pages/auth/Signup'))
const Dashboard = retry(() => import('@/pages/dashboard/Dashboard'))
const Reservations = retry(() => import('@/pages/reservations/Reservations'))
const Rooms = retry(() => import('@/pages/rooms/Rooms'))
const Guests = retry(() => import('@/pages/guests/Guests'))
const Billing = retry(() => import('@/pages/billing/Billing'))
const PortalRooms = retry(() => import('@/pages/portal/PortalRooms'))
const PortalBookings = retry(() => import('@/pages/portal/PortalBookings'))
const NotFound = retry(() => import('@/pages/NotFound'))

function HomeRedirect() {
  const { loading, session, isStaff } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isStaff ? '/dashboard' : '/portal'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Staff dashboard */}
        <Route element={<ProtectedRoute staffOnly><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/guests" element={<Guests />} />
          <Route path="/billing" element={<Billing />} />
        </Route>

        {/* Guest portal */}
        <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
          <Route path="/portal" element={<PortalRooms />} />
          <Route path="/portal/bookings" element={<PortalBookings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
