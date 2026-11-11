import { formatCurrency, formatDistance } from '../../../entities/ride'

export function RiderMetrics({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="metrics-strip" aria-label="Loading rider statistics">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="metric-card">
            <div className="skeleton-box" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton-box" style={{ width: '70%', height: '28px' }} />
          </div>
        ))}
      </div>
    )
  }

  const completedTrips = stats?.total_rides ?? 0
  const totalDistance = stats?.total_distance_km ?? 0
  const totalSpent = stats?.total_spent ?? 0
  const rating = stats?.rating ?? 5.0
  const numRatings = stats?.num_ratings ?? 0

  return (
    <div className="metrics-strip" aria-label="Rider travel statistics">
      <div className="metric-card">
        <span className="metric-label">Completed Trips</span>
        <span className="metric-value tabular-nums">{completedTrips}</span>
        <span className="metric-hint">All-time journeys</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Distance Traveled</span>
        <span className="metric-value tabular-nums">{formatDistance(totalDistance)}</span>
        <span className="metric-hint">Total ground covered</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Total Spend</span>
        <span className="metric-value tabular-nums">{formatCurrency(totalSpent)}</span>
        <span className="metric-hint">Fares & transit fees</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Rider Rating</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span className="metric-value tabular-nums">{Number(rating).toFixed(1)}</span>
          <span style={{ color: '#d97706', fontSize: '1.25rem' }} aria-hidden="true">★</span>
        </div>
        <span className="metric-hint tabular-nums">Based on {numRatings} {numRatings === 1 ? 'review' : 'reviews'}</span>
      </div>
    </div>
  )
}

