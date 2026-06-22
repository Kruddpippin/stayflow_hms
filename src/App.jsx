import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PortalLayout from '@/components/layout/PortalLayout'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'

const Login = lazy(() => import('@/pages/auth/Login'))
const Signup = lazy(() => import('@/pages/auth/Signup'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const Reservations = lazy(() => import('@/pages/reservations/Reservations'))
const Rooms = lazy(() => import('@/pages/rooms/Rooms'))
const Guests = lazy(() => import('@/pages/guests/Guests'))
const Billing = lazy(() => import('@/pages/billing/Billing'))
const PortalRooms = lazy(() => import('@/pages/portal/PortalRooms'))
const PortalBookings = lazy(() => import('@/pages/portal/PortalBookings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

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
