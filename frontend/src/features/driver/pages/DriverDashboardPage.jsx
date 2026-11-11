import { useQuery } from '@tanstack/react-query'
import { useDriver } from '../DriverContext'
import { getUserStats } from '../../../services/api/usersApi'
import { DriverShiftHeader } from '../components/DriverShiftHeader'
import { DriverEarningsStrip } from '../components/DriverEarningsStrip'
import { IncomingDispatchRadar } from '../components/IncomingDispatchRadar'
import { ActiveTripManager } from '../components/ActiveTripManager'
import { DriverLocationDisplay } from '../components/DriverLocationDisplay'

export function DriverDashboardPage() {
  const { status } = useDriver()

  // Fetch driver shift metrics (wallet balance, earnings, rating)
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: getUserStats,
    refetchInterval: 10000,
  })

  return (
    <div className="safar-dashboard">
      {/* 1. Driver Shift Controller & Telemetry */}
      <DriverShiftHeader stats={stats} />

      {/* 2. Driver Financial & Journey Stats Strip */}
      <DriverEarningsStrip stats={stats} isLoading={isStatsLoading} />

      {/* 3. Active Trip Manager (Promoted to top when trip is active) */}
      <ActiveTripManager />

      {/* 4. Dispatch Radar & Live GPS Display */}
      <div className="dashboard-grid">
        <div className="dispatch-section">
          <IncomingDispatchRadar driverStatus={status} />
        </div>

        <div className="location-section">
          <DriverLocationDisplay />
        </div>
      </div>
    </div>
  )
}
