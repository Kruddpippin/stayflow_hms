import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/ui/Spinner'

export default function ProtectedRoute({ children, staffOnly = false, adminOnly = false }) {
  const { session, profile, loading, isStaff, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader label="Checking your session…" />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile) return <PageLoader label="Loading your workspace…" />
  if (adminOnly && !isAdmin) return <Navigate to="/portal" replace />
  if (staffOnly && !isStaff) return <Navigate to="/portal" replace />
  if (staffOnly && !profile.onboarded && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return children
}
