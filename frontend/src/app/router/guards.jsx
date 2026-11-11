import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { AppSkeletonScreen } from '../../shared/ui/SkeletonScreens'

export function ProtectedRoute() {
  const { status, token } = useAuth()

  if (status === 'bootstrapping') {
    return <AppSkeletonScreen />
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function RoleRoute({ allowedRoles }) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { token, status } = useAuth()

  if (status === 'bootstrapping') {
    return <AppSkeletonScreen />
  }

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
