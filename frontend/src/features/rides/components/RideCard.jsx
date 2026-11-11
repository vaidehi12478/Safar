import { Link } from 'react-router-dom'
import { formatCurrency, formatDistance, formatRideDate } from '../../../entities/ride'

export function RideCard({ ride }) {
  const statusClass = `ride-status-${ride.status.toLowerCase()}`
  const isCarpool = ride.rideType === 'CARPOOL'

  const readableStatus =
    ride.status === 'REQUESTED'
      ? 'Requested'
      : ride.status === 'MATCHED'
      ? 'Driver Matched'
      : ride.status === 'IN_PROGRESS'
      ? 'In Progress'
      : ride.status === 'COMPLETED'
      ? 'Completed'
      : ride.status === 'CANCELLED'
      ? 'Cancelled'
      : ride.status

  const pickupAddress = ride.pickupLocation?.displayName ?? 'Pickup location'
  const destinationAddress = ride.destinationLocation?.displayName ?? 'Destination location'

  return (
    <article className="ride-card-enhanced" aria-label={`Trip number ${ride.id}`}>
      <div className="ride-card-header">
        <div className="ride-card-id-group">
          <span className="ride-id-tag tabular-nums">#{ride.id}</span>
          <span className={`ride-type-tag ${isCarpool ? 'ride-type-carpool' : 'ride-type-solo'}`}>
            {isCarpool ? 'Carpool (30% off)' : 'Solo'}
          </span>
          <span className={`ride-status-pill ${statusClass}`}>{readableStatus}</span>
        </div>

        {ride.createdAt ? (
          <time className="ride-date-time tabular-nums" dateTime={ride.createdAt}>
            {formatRideDate(ride.createdAt)}
          </time>
        ) : null}
      </div>

      <div className="ride-card-route-visual">
        <div className="route-track-dots" aria-hidden="true">
          <span className="route-dot route-dot-pickup" />
          <span className="route-track-line" />
          <span className="route-dot route-dot-dest" />
        </div>

        <div className="route-addresses-column">
          <div className="route-address-block">
            <div className="route-address-label">Pickup</div>
            <div className="route-address-text" title={pickupAddress}>
              {pickupAddress}
            </div>
          </div>

          <div className="route-address-block">
            <div className="route-address-label">Drop-off</div>
            <div className="route-address-text" title={destinationAddress}>
              {destinationAddress}
            </div>
          </div>
        </div>
      </div>

      <div className="ride-card-footer">
        <div className="ride-fare-distance tabular-nums">
          <span className="ride-fare-amount">
            {ride.price !== null ? formatCurrency(ride.price) : 'Fare pending'}
          </span>
          {ride.distanceKm ? (
            <span className="ride-distance-km">
              ({formatDistance(ride.distanceKm)})
            </span>
          ) : null}
        </div>

        <Link
          to={`/rides/${ride.id}`}
          className="btn-card-action"
          aria-label={`View details and route for ride number ${ride.id}`}
        >
          <span>View Details & Route</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

