import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAvailableRides,
  acceptRide,
} from '../../../services/api/ridesApi'
import { getErrorMessage } from '../../../shared/lib/errors'
import { StatusView } from '../../../shared/ui/StatusView'

function RideCard({ ride, onAccept, isAccepting }) {
  return (
    <div className="ride-card">
      <div className="ride-header">
        <div>
          <h3>Ride #{ride.id}</h3>
          <p className="ride-time">
            {new Date(ride.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="ride-status">
          <span className={`status-badge status-${ride.status.toLowerCase()}`}>
            {ride.status}
          </span>
        </div>
      </div>

      <div className="ride-details">
        <div className="location">
          <strong>From:</strong>
          <p>{ride.pickupLocation?.displayName || 'Loading...'}</p>
        </div>
        <div className="location">
          <strong>To:</strong>
          <p>{ride.destinationLocation?.displayName || 'Loading...'}</p>
        </div>
      </div>

      <div className="ride-info">
        {ride.distanceKm && (
          <div>
            <strong>Distance:</strong> {ride.distanceKm.toFixed(2)} km
          </div>
        )}
        {ride.price && (
          <div>
            <strong>Estimated Fare:</strong> ${ride.price.toFixed(2)}
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={() => onAccept(ride.id)}
        disabled={isAccepting}
      >
        {isAccepting ? 'Accepting...' : 'Accept Ride'}
      </button>
    </div>
  )
}

export function AvailableRides() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['available-rides'],
    queryFn: getAvailableRides,
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const acceptMutation = useMutation({
    mutationFn: acceptRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
    },
  })

  if (isLoading) {
    return <StatusView title="Loading available rides..." />
  }

  if (isError) {
    return (
      <StatusView
        title="Could not load rides"
        message={getErrorMessage(error)}
      />
    )
  }

  if (!data?.length) {
    return (
      <StatusView
        title="No available rides"
        message="Check back soon for new ride requests."
      />
    )
  }

  return (
    <section className="card">
      <h2>Available Rides ({data.length})</h2>
      <div className="rides-list">
        {data.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            onAccept={acceptMutation.mutate}
            isAccepting={acceptMutation.isPending && acceptMutation.variables === ride.id}
          />
        ))}
      </div>
      {acceptMutation.isError && (
        <div className="error-message">
          Failed to accept ride: {getErrorMessage(acceptMutation.error)}
        </div>
      )}
    </section>
  )
}
