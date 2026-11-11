import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCurrentRide, startRide, completeRide, cancelRide } from '../../../services/api/ridesApi'
import { formatCurrency, formatDistance } from '../../../entities/ride'
import { useToast } from '../../../shared/ui/Toast'
import { getErrorMessage } from '../../../shared/lib/errors'

export function ActiveTripManager() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: currentRide, isLoading } = useQuery({
    queryKey: ['current-ride'],
    queryFn: getCurrentRide,
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  })

  const startMutation = useMutation({
    mutationFn: startRide,
    onSuccess: () => {
      addToast({
        title: 'Trip Started!',
        message: 'Drive safely to the passenger’s destination.',
        variant: 'ride',
      })
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
    },
    onError: (err) => {
      addToast({ title: 'Could not start trip', message: getErrorMessage(err), variant: 'error' })
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeRide,
    onSuccess: () => {
      addToast({
        title: '🎉 Trip Completed!',
        message: 'Your earnings have been added to your wallet balance.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
    },
    onError: (err) => {
      addToast({ title: 'Could not complete trip', message: getErrorMessage(err), variant: 'error' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelRide,
    onSuccess: () => {
      addToast({
        title: 'Trip Cancelled',
        message: 'You have cancelled this assignment.',
        variant: 'info',
      })
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
    },
    onError: (err) => {
      addToast({ title: 'Could not cancel trip', message: getErrorMessage(err), variant: 'error' })
    },
  })

  if (!currentRide) return null

  const isMatched = currentRide.status?.toUpperCase() === 'MATCHED'
  const isInProgress = currentRide.status?.toUpperCase() === 'IN_PROGRESS'
  const isCarpool = currentRide.rideType === 'CARPOOL' || Boolean(currentRide.carpoolGroupId)
  const driverEarnings = currentRide.price ? currentRide.price * 0.8 : null

  return (
    <div className="active-trip-card" role="region" aria-label="Active passenger trip">
      <div className="active-trip-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="active-pulse-dot" style={{ backgroundColor: isInProgress ? '#10b981' : '#3b82f6' }} />
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isInProgress ? 'Trip In Progress' : 'Passenger Matched — Pickup En Route'}
          </span>
        </div>

        <div className="tabular-nums" style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
          Trip #{currentRide.id} • {isCarpool ? 'Carpool' : 'Solo'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Passenger Route</span>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: '#f8fafc' }}>
            {currentRide.pickupLocation?.displayName}
          </div>
        </div>

        <div className="tabular-nums" style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
            {driverEarnings !== null ? formatCurrency(driverEarnings) : '—'}
          </span>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Payout (80%)</div>
        </div>
      </div>

      <div className="active-hero-route" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="active-route-stop">
          <span className="active-stop-indicator active-stop-pickup" aria-hidden="true" />
          <span className="active-stop-label">Pickup:</span>
          <span className="active-stop-address">{currentRide.pickupLocation?.displayName}</span>
        </div>
        <div className="active-route-stop">
          <span className="active-stop-indicator active-stop-dest" aria-hidden="true" />
          <span className="active-stop-label">Drop-off:</span>
          <span className="active-stop-address">{currentRide.destinationLocation?.displayName}</span>
        </div>
      </div>

      {currentRide.distanceKm && (
        <div className="tabular-nums" style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
          Total Distance: {formatDistance(currentRide.distanceKm)}
        </div>
      )}

      {/* Driver Controls */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
        {isMatched && (
          <>
            <button
              type="button"
              className="btn-primary-action"
              style={{ flex: 2, justifyContent: 'center', backgroundColor: '#2563eb' }}
              onClick={() => startMutation.mutate(currentRide.id)}
              disabled={startMutation.isPending}
            >
              <span>{startMutation.isPending ? 'Starting Trip…' : 'Start Trip (Passenger Onboard)'}</span>
              <span aria-hidden="true">🏎️</span>
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                minHeight: '44px',
              }}
              onClick={() => cancelMutation.mutate(currentRide.id)}
              disabled={cancelMutation.isPending}
            >
              <span>{cancelMutation.isPending ? 'Cancelling…' : 'Cancel'}</span>
            </button>
          </>
        )}

        {isInProgress && (
          <button
            type="button"
            className="btn-primary-action"
            style={{ width: '100%', justifyContent: 'center', backgroundColor: '#059669' }}
            onClick={() => completeMutation.mutate(currentRide.id)}
            disabled={completeMutation.isPending}
          >
            <span>{completeMutation.isPending ? 'Completing Trip…' : 'Complete Trip & Collect Fare'}</span>
            <span aria-hidden="true">✓</span>
          </button>
        )}
      </div>
    </div>
  )
}

