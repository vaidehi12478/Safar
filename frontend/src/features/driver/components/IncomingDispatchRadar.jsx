import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAvailableRides, acceptRide } from '../../../services/api/ridesApi'
import { apiClient, getAuthConfig } from '../../../services/api/client'
import { formatCurrency, formatDistance } from '../../../entities/ride'
import { useToast } from '../../../shared/ui/Toast'
import { getErrorMessage } from '../../../shared/lib/errors'

export function IncomingDispatchRadar({ driverStatus }) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [countdown, setCountdown] = useState(30)

  // Fetch dispatched rides for this driver
  const { data: availableRides, isLoading } = useQuery({
    queryKey: ['available-rides'],
    queryFn: getAvailableRides,
    enabled: driverStatus === 'ONLINE',
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  })

  // Accept ride mutation
  const acceptMutation = useMutation({
    mutationFn: (ride) => {
      if (ride.carpoolGroupId) {
        return apiClient.post(`/api/drivers/carpool/${ride.carpoolGroupId}/accept`, {}, getAuthConfig())
      }
      return acceptRide(ride.id)
    },
    onSuccess: () => {
      addToast({
        title: 'Ride Accepted!',
        message: 'You have accepted the dispatch. Check your Active Trip panel below.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
      queryClient.invalidateQueries({ queryKey: ['current-ride'] })
    },
    onError: (err) => {
      addToast({
        title: 'Acceptance Failed',
        message: getErrorMessage(err),
        variant: 'error',
      })
    },
  })

  // Decline ride mutation
  const declineMutation = useMutation({
    mutationFn: (ride) => {
      if (ride.carpoolGroupId) {
        return apiClient.post(`/api/drivers/carpool/${ride.carpoolGroupId}/decline`, {}, getAuthConfig())
      }
      return apiClient.post(`/api/drivers/rides/${ride.id}/decline`, {}, getAuthConfig())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-rides'] })
    },
  })

  // 15-second visual countdown timer when an incoming dispatch is active
  const incomingRide = availableRides && availableRides.length > 0 ? availableRides[0] : null

  useEffect(() => {
    if (!incomingRide) {
      setCountdown(30)
      return
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Timeout auto-declines locally
          queryClient.invalidateQueries({ queryKey: ['available-rides'] })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [incomingRide?.id, queryClient])

  if (driverStatus !== 'ONLINE') {
    return (
      <div className="dispatch-panel card" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }} aria-hidden="true">
          ⏸️
        </div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', color: '#0f172a' }}>
          You Are Currently Offline
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
          Switch your status to <strong>Online & Ready</strong> in the header to start receiving ride dispatches.
        </p>
      </div>
    )
  }

  // Incoming Dispatch Pending Acceptance
  if (incomingRide) {
    const isCarpool = incomingRide.rideType === 'CARPOOL' || Boolean(incomingRide.carpoolGroupId)
    const driverEarnings = incomingRide.price ? incomingRide.price * 0.8 : null

    const pickupAddress =
      incomingRide.pickupLocation?.displayName ||
      incomingRide.pickupLocation?.name ||
      incomingRide.pickup_location?.displayName ||
      incomingRide.pickup_location?.display_name ||
      'Pickup location'

    const dropoffAddress =
      incomingRide.destinationLocation?.displayName ||
      incomingRide.destinationLocation?.name ||
      incomingRide.destination_location?.displayName ||
      incomingRide.destination_location?.display_name ||
      'Drop-off destination'

    return (
      <div className="dispatch-incoming-card" role="alert" aria-live="assertive">
        <div className="dispatch-timer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="active-pulse-dot" style={{ backgroundColor: '#2563eb' }} />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Incoming Dispatch Request
            </span>
          </div>

          <div className="countdown-pill tabular-nums">
            <span>⏱️ 0:{countdown < 10 ? `0${countdown}` : countdown}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
              {isCarpool ? 'Carpool Group Trip' : 'Solo Ride Request'}
            </h2>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Ride #{incomingRide.id}</span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>
              {driverEarnings !== null ? formatCurrency(driverEarnings) : '—'}
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase' }}>
              Your Net Payout (80%)
            </span>
          </div>
        </div>

        {/* Route Details */}
        <div className="dispatch-route-card">
          <div className="dispatch-stop-row">
            <div className="stop-marker-col">
              <span className="stop-dot stop-dot-pickup" aria-hidden="true" />
              <span className="stop-vertical-line" aria-hidden="true" />
            </div>
            <div className="stop-text-col">
              <span className="stop-subheading">Pickup Location</span>
              <div className="stop-address-main" title={pickupAddress}>
                {pickupAddress}
              </div>
            </div>
          </div>

          <div className="dispatch-stop-row">
            <div className="stop-marker-col">
              <span className="stop-dot stop-dot-dest" aria-hidden="true" />
            </div>
            <div className="stop-text-col">
              <span className="stop-subheading">Drop-off Destination</span>
              <div className="stop-address-main" title={dropoffAddress}>
                {dropoffAddress}
              </div>
            </div>
          </div>
        </div>

        {incomingRide.distanceKm && (
          <div className="tabular-nums" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Total route distance: <strong>{formatDistance(incomingRide.distanceKm)}</strong>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn-primary-action"
            style={{ justifyContent: 'center', backgroundColor: '#059669' }}
            onClick={() => acceptMutation.mutate(incomingRide)}
            disabled={acceptMutation.isPending || declineMutation.isPending}
          >
            <span>{acceptMutation.isPending ? 'Accepting…' : 'Accept Trip'}</span>
            <span aria-hidden="true">✓</span>
          </button>

          <button
            type="button"
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              minHeight: '44px',
            }}
            onClick={() => declineMutation.mutate(incomingRide)}
            disabled={acceptMutation.isPending || declineMutation.isPending}
          >
            <span>{declineMutation.isPending ? 'Declining…' : 'Decline'}</span>
          </button>
        </div>
      </div>
    )
  }

  // Scanning Idle State
  return (
    <div className="dispatch-panel card" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="radar-scanner" aria-hidden="true">
        <span className="radar-circle circle-1" />
        <span className="radar-circle circle-2" />
        <span className="radar-icon">📡</span>
      </div>

      <h3 style={{ margin: '14px 0 6px 0', fontSize: '1.125rem', color: '#0f172a' }}>
        Scanning for Nearby Passenger Requests…
      </h3>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', marginInline: 'auto', lineHeight: 1.5 }}>
        You will receive incoming dispatch alerts with a 15-second acceptance window. Please keep this browser window active.
      </p>
    </div>
  )
}

