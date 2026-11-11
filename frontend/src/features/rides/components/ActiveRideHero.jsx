import { Link } from 'react-router-dom'
import { formatCurrency, formatDistance } from '../../../entities/ride'

export function ActiveRideHero({ ride }) {
  if (!ride) return null

  const isMatchedOrInProgress = ride.status === 'MATCHED' || ride.status === 'IN_PROGRESS'
  const statusLabel =
    ride.status === 'REQUESTED'
      ? 'Finding Nearby Driver…'
      : ride.status === 'MATCHED'
      ? 'Driver Confirmed & En Route'
      : 'Ride in Progress'

  return (
    <section className="active-hero-banner" aria-label="Current active ride">
      <div className="active-hero-top">
        <div className="active-pulse-badge">
          <span className="active-pulse-dot" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
        <div className="active-hero-meta tabular-nums">
          <span>Ride #{ride.id}</span>
          <span>•</span>
          <span>{ride.rideType === 'CARPOOL' ? 'Carpool (30% off)' : 'Solo Ride'}</span>
          {ride.price ? (
            <>
              <span>•</span>
              <strong style={{ color: '#ffffff' }}>{formatCurrency(ride.price)}</strong>
            </>
          ) : null}
        </div>
      </div>

      <div className="active-hero-route">
        <div className="active-route-stop">
          <span className="active-stop-indicator active-stop-pickup" aria-hidden="true" />
          <span className="active-stop-label">Pickup</span>
          <span
            className="active-stop-address"
            title={ride.pickupLocation?.displayName ?? 'Pickup location'}
          >
            {ride.pickupLocation?.displayName ?? 'Pickup location'}
          </span>
        </div>
        <div className="active-route-stop">
          <span className="active-stop-indicator active-stop-dest" aria-hidden="true" />
          <span className="active-stop-label">Drop-off</span>
          <span
            className="active-stop-address"
            title={ride.destinationLocation?.displayName ?? 'Destination location'}
          >
            {ride.destinationLocation?.displayName ?? 'Destination location'}
          </span>
        </div>
      </div>

      <div className="active-hero-actions">
        <div className="active-driver-info">
          {ride.distanceKm ? (
            <span className="tabular-nums">Estimated distance: {formatDistance(ride.distanceKm)}</span>
          ) : (
            <span>Live route calculation active</span>
          )}
        </div>
        <Link
          to={`/rides/${ride.id}`}
          className="btn-track-live"
          aria-label={`Open live tracking for ride number ${ride.id}`}
        >
          <span>Track in Real Time</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

