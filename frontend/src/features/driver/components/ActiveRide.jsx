import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCurrentRide,
  startRide,
  completeRide,
  cancelRide,
} from '../../../services/api/ridesApi'
import { getErrorMessage } from '../../../shared/lib/errors'
import { StatusView } from '../../../shared/ui/StatusView'

function ActionButton({ onClick, disabled, loading, children, variant = 'primary' }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  )
}

export function ActiveRide() {
  const queryClient = useQueryClient()

  const { data: currentRide, isLoading, isError, error } = useQuery({
    queryKey: ['current-ride'],
    queryFn: getCurrentRide,
    refetchInterval: 3000, // Refetch every 3 seconds
  })

  const startMutation = useMutation({
    mutationFn: startRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
    },
  })

  if (isLoading) {
    return <StatusView title="Loading current ride..." />
  }

  if (isError) {
    return (
      <StatusView
        title="Could not load ride"
        message={getErrorMessage(error)}
      />
    )
  }

  if (!currentRide) {
    return (
      <StatusView
        title="No Active Ride"
        message="Accept a ride to get started."
      />
    )
  }

  const getStatusColor = (status) => {
    const statusMap = {
      requested: '#fbbf24',
      matched: '#60a5fa',
      in_progress: '#34d399',
      completed: '#10b981',
      cancelled: '#ef4444',
    }
    return statusMap[status?.toLowerCase()] || '#111827'
  }

  const canStart = currentRide.status?.toUpperCase() === 'MATCHED'
  const canComplete = currentRide.status?.toUpperCase() === 'IN_PROGRESS'
  const canCancel = ['REQUESTED', 'MATCHED'].includes(currentRide.status?.toUpperCase())

  return (
    <section className="card active-ride">
      <h2>Current Ride</h2>

      <div className="ride-status-section">
        <div className="status-display">
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(currentRide.status) }}
          >
            {currentRide.status}
          </span>
          <span className="ride-id">Ride #{currentRide.id}</span>
        </div>
      </div>

      <div className="ride-locations">
        <div className="location-item">
          <div className="location-label">Pickup Location</div>
          <div className="location-name">
            {currentRide.pickupLocation?.displayName || 'Loading...'}
          </div>
          {currentRide.pickupLocation?.latitude && (
            <div className="location-coords">
              {currentRide.pickupLocation.latitude.toFixed(4)}, {currentRide.pickupLocation.longitude.toFixed(4)}
            </div>
          )}
        </div>

        <div className="location-item">
          <div className="location-label">Destination</div>
          <div className="location-name">
            {currentRide.destinationLocation?.displayName || 'Loading...'}
          </div>
          {currentRide.destinationLocation?.latitude && (
            <div className="location-coords">
              {currentRide.destinationLocation.latitude.toFixed(4)}, {currentRide.destinationLocation.longitude.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      <div className="ride-details-grid">
        {currentRide.distanceKm && (
          <div className="detail-item">
            <strong>Distance</strong>
            <span>{currentRide.distanceKm.toFixed(2)} km</span>
          </div>
        )}
        {currentRide.price && (
          <div className="detail-item">
            <strong>Estimated Fare</strong>
            <span>${currentRide.price.toFixed(2)}</span>
          </div>
        )}
        {currentRide.createdAt && (
          <div className="detail-item">
            <strong>Request Time</strong>
            <span>{new Date(currentRide.createdAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="ride-actions">
        {canStart && (
          <ActionButton
            onClick={() => startMutation.mutate(currentRide.id)}
            loading={startMutation.isPending}
            variant="primary"
          >
            Start Ride
          </ActionButton>
        )}

        {canComplete && (
          <ActionButton
            onClick={() => completeMutation.mutate(currentRide.id)}
            loading={completeMutation.isPending}
            variant="success"
          >
            Complete Ride
          </ActionButton>
        )}

        {canCancel && (
          <ActionButton
            onClick={() => cancelMutation.mutate(currentRide.id)}
            loading={cancelMutation.isPending}
            variant="danger"
          >
            Cancel Ride
          </ActionButton>
        )}
      </div>

      {(startMutation.isError || completeMutation.isError || cancelMutation.isError) && (
        <div className="error-message">
          {startMutation.isError && getErrorMessage(startMutation.error)}
          {completeMutation.isError && getErrorMessage(completeMutation.error)}
          {cancelMutation.isError && getErrorMessage(cancelMutation.error)}
        </div>
      )}
    </section>
  )
}
