import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getRideById, getRideStatus, getRideRoute, cancelRideByRider } from '../../../services/api/ridesApi'
import { useRideTracking } from '../../../services/ws/useRideTracking'
import { getErrorMessage } from '../../../shared/lib/errors'
import { StatusView } from '../../../shared/ui/StatusView'
import { LiveMap } from '../../../shared/ui/LiveMap'
import { useToast } from '../../../shared/ui/Toast'
import { RatingModal } from '../components/RatingModal'
import { useState } from 'react'

const STATUS_TOAST_CONFIG = {
  MATCHED:     { title: '🚗 Driver Found!',     variant: 'success', duration: 6000 },
  IN_PROGRESS: { title: '🏎️ Ride Started!',     variant: 'ride',    duration: 6000 },
  COMPLETED:   { title: '🎉 Ride Completed!',   variant: 'success', duration: 8000 },
  CANCELLED:   { title: '❌ Ride Cancelled',     variant: 'error',   duration: 8000 },
}

export function RideDetailPage() {
  const { rideId } = useParams()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [hasReviewed, setHasReviewed] = useState(false)

  const rideQuery = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => getRideById(rideId),
  })

  const statusQuery = useQuery({
    queryKey: ['ride-status', rideId],
    queryFn: () => getRideStatus(rideId),
    refetchInterval: 7000,
  })

  // Fetch the driving route path from GraphHopper via backend
  const routeQuery = useQuery({
    queryKey: ['ride-route', rideId],
    queryFn: () => getRideRoute(rideId),
    enabled: !!rideQuery.data, // only fetch after ride data is loaded
    staleTime: 5 * 60 * 1000, // route won't change, cache for 5 mins
  })

  // Cancellation Mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelRideByRider(rideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride', rideId] })
      queryClient.invalidateQueries({ queryKey: ['ride-status', rideId] })
    },
    onError: (error) => {
      addToast({ title: 'Cancel Failed', message: getErrorMessage(error), variant: 'error' })
    }
  })

  // Connect to WebSocket for live driver tracking
  const { driverLocation, locationHistory, isConnected, onStatusChange } = useRideTracking(rideId)

  // Show toast notifications when ride status changes via WebSocket
  useEffect(() => {
    onStatusChange((event) => {
      const config = STATUS_TOAST_CONFIG[event.status?.toUpperCase()]
      if (config) {
        addToast({
          title: config.title,
          message: event.message || `Ride status changed to ${event.status}`,
          variant: config.variant,
          duration: config.duration,
        })
      }

      // Auto-refresh ride data so the page updates immediately
      queryClient.invalidateQueries({ queryKey: ['ride', rideId] })
      queryClient.invalidateQueries({ queryKey: ['ride-status', rideId] })
    })
  }, [onStatusChange, addToast, queryClient, rideId])

  if (rideQuery.isLoading) {
    return <StatusView title="Loading ride..." />
  }

  if (rideQuery.isError) {
    return <StatusView title="Could not load ride" message={getErrorMessage(rideQuery.error)} />
  }

  if (!rideQuery.data) {
    return <StatusView title="Ride not found" />
  }

  const ride = rideQuery.data
  const currentStatus = statusQuery.data?.status ?? ride.status
  const isActiveRide = ['MATCHED', 'IN_PROGRESS'].includes(currentStatus?.toUpperCase())

  // The driving route path from GraphHopper (shortest path between pickup & destination)
  const routePath = routeQuery.data?.path || []

  // Build markers for the map
  const markers = []

  // Pickup location marker
  if (ride.pickupLocation?.latitude) {
    markers.push({
      position: [ride.pickupLocation.latitude, ride.pickupLocation.longitude],
      popup: `📍 Pickup: ${ride.pickupLocation.displayName}`,
      type: 'pickup',
    })
  }

  // Destination location marker
  if (ride.destinationLocation?.latitude) {
    markers.push({
      position: [ride.destinationLocation.latitude, ride.destinationLocation.longitude],
      popup: `🏁 Destination: ${ride.destinationLocation.displayName}`,
      type: 'destination',
    })
  }

  // Driver live location marker
  if (driverLocation) {
    markers.push({
      position: [driverLocation.latitude, driverLocation.longitude],
      popup: '🚗 Driver (Live)',
      type: 'driver',
    })
  }

  // Map center: prefer driver location, then pickup
  const mapCenter = driverLocation
    ? [driverLocation.latitude, driverLocation.longitude]
    : ride.pickupLocation?.latitude
    ? [ride.pickupLocation.latitude, ride.pickupLocation.longitude]
    : null

  const statusColors = {
    REQUESTED: '#f59e0b',
    MATCHED: '#3b82f6',
    IN_PROGRESS: '#10b981',
    COMPLETED: '#6b7280',
    CANCELLED: '#ef4444',
  }

  return (
    <section className="ride-detail-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>Ride #{ride.id}</h1>
          <span
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: statusColors[currentStatus?.toUpperCase()] || '#6b7280',
            }}
          >
            {currentStatus}
          </span>
        </div>

        {/* Live Tracking Map with Route Path */}
        {mapCenter && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>🗺️ Live Tracking</h3>
              {isActiveRide && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: isConnected ? '#dcfce7' : '#fef2f2',
                    color: isConnected ? '#166534' : '#991b1b',
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                    display: 'inline-block',
                    animation: isConnected ? 'pulse 2s infinite' : 'none',
                  }}></span>
                  {isConnected ? 'Live' : 'Connecting...'}
                </span>
              )}
              {routeQuery.isLoading && (
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Loading route...</span>
              )}
            </div>
            <LiveMap
              center={mapCenter}
              zoom={13}
              markers={markers}
              path={routePath}
              height="420px"
              autoCenter={!!driverLocation}
            />
            {routePath.length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.8rem',
                color: '#6b7280',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '20px', height: '3px', backgroundColor: '#3b82f6', display: 'inline-block', borderRadius: '2px' }}></span>
                  Driving Route
                </span>
                <span>📍 Pickup</span>
                <span>🏁 Destination</span>
                {driverLocation && <span>🚗 Driver (Live)</span>}
              </div>
            )}
          </div>
        )}

        {/* Ride Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>📍 Pickup</div>
            <div style={{ fontWeight: 600, color: '#166534' }}>{ride.pickupLocation?.displayName || 'Unknown'}</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>🏁 Destination</div>
            <div style={{ fontWeight: 600, color: '#1e40af' }}>{ride.destinationLocation?.displayName || 'Unknown'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <strong>Distance:</strong>{' '}
            <span>{ride.distanceKm ? `${ride.distanceKm.toFixed(2)} km` : 'N/A'}</span>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <strong>Price:</strong>{' '}
            <span>{ride.price ? `₹${ride.price.toFixed(2)}` : 'N/A'}</span>
          </div>
        </div>

        {/* Live driver info */}
        {ride.driver && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Driver</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{ride.driver.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>{ride.driver.vehicleType}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fbbf24', fontSize: '1.25rem', fontWeight: 800 }}>
                {ride.driver.rating.toFixed(1)} ★
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {ride.driver.numRatings || 0} reviews
              </div>
            </div>
          </div>
        )}

        {driverLocation && isActiveRide && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.85rem' }}>
            <strong>🚗 Driver is at:</strong>{' '}
            {driverLocation.latitude.toFixed(5)}, {driverLocation.longitude.toFixed(5)}
            <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
              (updated {new Date(driverLocation.timestamp).toLocaleTimeString()})
            </span>
          </div>
        )}

        {/* Rider Cancel Button */}
        {['REQUESTED', 'MATCHED'].includes(currentStatus?.toUpperCase()) && (
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: cancelMutation.isPending ? '#f87171' : '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: cancelMutation.isPending ? 'wait' : 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2), 0 2px 4px -1px rgba(220, 38, 38, 0.1)'
              }}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Ride'}
            </button>
          </div>
        )}
      </div>

      {currentStatus?.toUpperCase() === 'COMPLETED' && !hasReviewed && (
        <RatingModal 
          rideId={rideId} 
          onComplete={() => setHasReviewed(true)} 
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  )
}
