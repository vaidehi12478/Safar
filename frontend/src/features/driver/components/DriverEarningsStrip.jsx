import { formatCurrency, formatDistance } from '../../../entities/ride'

export function DriverEarningsStrip({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="metrics-strip" aria-label="Loading earnings">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="metric-card">
            <div className="skeleton-box" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton-box" style={{ width: '70%', height: '28px' }} />
          </div>
        ))}
      </div>
    )
  }

  const totalEarned = stats?.total_earned ?? 0
  const walletBalance = stats?.wallet_balance ?? 0
  const totalRides = stats?.total_rides ?? 0
  const totalDistance = stats?.total_distance_km ?? 0

  return (
    <div className="metrics-strip" aria-label="Driver shift and financial metrics">
      <div className="metric-card">
        <span className="metric-label">Total Earnings</span>
        <span className="metric-value tabular-nums" style={{ color: '#059669' }}>
          {formatCurrency(totalEarned)}
        </span>
        <span className="metric-hint">80% net driver split</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Wallet Balance</span>
        <span className="metric-value tabular-nums" style={{ color: '#1e40af' }}>
          {formatCurrency(walletBalance)}
        </span>
        <span className="metric-hint">Available for withdrawal</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Completed Trips</span>
        <span className="metric-value tabular-nums">
          {totalRides}
        </span>
        <span className="metric-hint">Lifetime completed</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Distance Covered</span>
        <span className="metric-value tabular-nums">
          {formatDistance(totalDistance)}
        </span>
        <span className="metric-hint">On passenger routes</span>
      </div>
    </div>
  )
}

