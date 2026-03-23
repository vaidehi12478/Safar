import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './guards'
import { AppLayout } from '../../shared/ui/AppLayout'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { RegisterPage } from '../../features/auth/pages/RegisterPage'
import { RiderDashboardPage } from '../../features/rides/pages/RiderDashboardPage'
import { RequestRidePage } from '../../features/rides/pages/RequestRidePage'
import { RideDetailPage } from '../../features/rides/pages/RideDetailPage'
import { DriverDashboardPage } from '../../features/driver/pages/DriverDashboardPage'
import { NotFoundPage } from '../../features/common/pages/NotFoundPage'
import { useAuth } from '../../features/auth/useAuth'

function HomePageRedirect() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'DRIVER' ? '/driver' : '/dashboard'} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<RiderDashboardPage />} />
          <Route path="/rides/new" element={<RequestRidePage />} />
          <Route path="/rides/:rideId" element={<RideDetailPage />} />
          <Route element={<RoleRoute allowedRoles={['DRIVER']} />}>
            <Route path="/driver" element={<DriverDashboardPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<HomePageRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
