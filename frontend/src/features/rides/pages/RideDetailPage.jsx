import { useEffect, useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { getRideById, getRideStatus, getRideRoute, cancelRideByRider, createRazorpayOrder, verifyRazorpayPayment } from '../../../services/api/ridesApi'
import { useAuth } from '../../auth/useAuth'
import { useRideTracking } from '../../../services/ws/useRideTracking'
import { getErrorMessage } from '../../../shared/lib/errors'
import { StatusView } from '../../../shared/ui/StatusView'
import { LiveMap } from '../../../shared/ui/LiveMap'
import { useToast } from '../../../shared/ui/Toast'
import { RatingModal } from '../components/RatingModal'
import { RideDetailSkeleton } from '../../../shared/ui/SkeletonScreens'
import { formatCurrency, formatDistance } from '../../../entities/ride'

const STATUS_TOAST_CONFIG = {
  MATCHED:     { title: '🎉 Driver Confirmed!',   variant: 'success', duration: 7000 },
  IN_PROGRESS: { title: '🏎️ Ride Started!',       variant: 'ride',    duration: 6000 },
  COMPLETED:   { title: '🎉 Ride Completed!',     variant: 'success', duration: 8000 },
  CANCELLED:   { title: '❌ Ride Cancelled',       variant: 'error',   duration: 8000 },
}

export function RideDetailPage() {
  const { rideId } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [hasReviewed, setHasReviewed] = useState(false)
  const [copiedPlate, setCopiedPlate] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const previousStatusRef = useRef(null)

  const rideQuery = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => getRideById(rideId),
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toUpperCase()
      if (!status || ['REQUESTED', 'MATCHED', 'IN_PROGRESS'].includes(status)) {
        return 2000
      }
      return false
    },
    refetchIntervalInBackground: true,
  })

  const statusQuery = useQuery({
    queryKey: ['ride-status', rideId],
    queryFn: () => getRideStatus(rideId),
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toUpperCase() || rideQuery.data?.status?.toUpperCase()
      if (!status || ['REQUESTED', 'MATCHED', 'IN_PROGRESS'].includes(status)) {
        return 2000
      }
      return false
    },
    refetchIntervalInBackground: true,
  })

  const routeQuery = useQuery({
    queryKey: ['ride-route', rideId],
    queryFn: () => getRideRoute(rideId),
    enabled: !!rideQuery.data,
    staleTime: 5 * 60 * 1000,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelRideByRider(rideId),
    onSuccess: () => {
      triggerStatusTransition('CANCELLED', 'Your ride request has been cancelled.')
    },
    onError: (error) => {
      addToast({ title: 'Cancel Failed', message: getErrorMessage(error), variant: 'error' })
    },
  })

  const handlePayWithRazorpay = async () => {
    try {
      setIsProcessingPayment(true)
      const order = await createRazorpayOrder(rideId)

      if (!window.Razorpay) {
        addToast({
          title: 'Gateway Unavailable',
          message: 'Razorpay checkout script not loaded. Please refresh your browser.',
          variant: 'error',
        })
        setIsProcessingPayment(false)
        return
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Safar Transit',
        description: `Fare payment for Trip #${rideId}`,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            await verifyRazorpayPayment({
              ride_id: Number(rideId),
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            await queryClient.invalidateQueries({ queryKey: ['ride', rideId] })
            addToast({
              title: '💳 Payment Received!',
              message: `Payment of ₹${(order.amount / 100).toFixed(2)} completed successfully!`,
              variant: 'success',
              duration: 8000,
            })
          } catch (verifyErr) {
            addToast({
              title: 'Verification Failed',
              message: getErrorMessage(verifyErr) || 'Payment verification could not be validated.',
              variant: 'error',
            })
          } finally {
            setIsProcessingPayment(false)
          }
        },
        prefill: {
          name: user?.name || user?.username || 'Safar Commuter',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (failResp) {
        setIsProcessingPayment(false)
        addToast({
          title: 'Payment Failed',
          message: failResp.error?.description || 'Transaction could not be completed.',
          variant: 'error',
        })
      })
      rzp.open()
    } catch (err) {
      setIsProcessingPayment(false)
      addToast({
        title: 'Order Creation Failed',
        message: getErrorMessage(err) || 'Unable to initialize Razorpay checkout.',
        variant: 'error',
      })
    }
  }

  // WebSocket for live driver tracking
  const { driverLocation, isConnected, onStatusChange } = useRideTracking(rideId)
  const notifiedSetRef = useRef(new Set())

  const triggerStatusTransition = useCallback((newStatus, customMessage) => {
    if (!newStatus) return
    const normalized = newStatus.toUpperCase()

    if (notifiedSetRef.current.has(normalized)) return
    notifiedSetRef.current.add(normalized)
    previousStatusRef.current = normalized

    const config = STATUS_TOAST_CONFIG[normalized]
    if (config) {
      const messageMap = {
        MATCHED: 'A nearby driver has accepted your ride and is en route!',
        IN_PROGRESS: 'Your trip has started! Driver is navigating to destination.',
        COMPLETED: 'You have safely reached your destination!',
        CANCELLED: 'This ride has been cancelled.',
      }
      addToast({
        title: config.title,
        message: customMessage || messageMap[normalized] || `Ride status updated to ${normalized}`,
        variant: config.variant,
        duration: config.duration,
      })
    }

    queryClient.invalidateQueries({ queryKey: ['ride', rideId] })
    queryClient.invalidateQueries({ queryKey: ['ride-status', rideId] })
    queryClient.invalidateQueries({ queryKey: ['my-rides'] })
    queryClient.invalidateQueries({ queryKey: ['user-stats'] })
  }, [addToast, queryClient, rideId])

  useEffect(() => {
    const current = (statusQuery.data?.status || rideQuery.data?.status)?.toUpperCase()
    if (current && !previousStatusRef.current) {
      previousStatusRef.current = current
      notifiedSetRef.current.add(current)
    }
  }, [statusQuery.data?.status, rideQuery.data?.status])

  useEffect(() => {
    onStatusChange((event) => {
      if (event?.status) {
        triggerStatusTransition(event.status, event.message)
      }
    })
  }, [onStatusChange, triggerStatusTransition])

  useEffect(() => {
    const current = (statusQuery.data?.status || rideQuery.data?.status)?.toUpperCase()
    if (!current) return

    if (previousStatusRef.current && previousStatusRef.current !== current) {
      triggerStatusTransition(current)
    }
  }, [statusQuery.data?.status, rideQuery.data?.status, triggerStatusTransition])

  if (rideQuery.isLoading) {
    return <RideDetailSkeleton />
  }

  if (rideQuery.isError) {
    return <StatusView title="Could not load ride" message={getErrorMessage(rideQuery.error)} />
  }

  if (!rideQuery.data) {
    return <StatusView title="Ride not found" />
  }

  const ride = rideQuery.data
  const currentStatus = (statusQuery.data?.status ?? ride.status)?.toUpperCase()
  const isActiveRide = ['MATCHED', 'IN_PROGRESS'].includes(currentStatus)
  const routePath = routeQuery.data?.path || []

  // Markers
  const markers = []
  if (ride.pickupLocation?.latitude) {
    markers.push({
      position: [ride.pickupLocation.latitude, ride.pickupLocation.longitude],
      popup: `📍 Pickup: ${ride.pickupLocation.displayName}`,
      type: 'pickup',
    })
  }

  if (ride.destinationLocation?.latitude) {
    markers.push({
      position: [ride.destinationLocation.latitude, ride.destinationLocation.longitude],
      popup: `🏁 Drop-off: ${ride.destinationLocation.displayName}`,
      type: 'destination',
    })
  }

  if (driverLocation) {
    markers.push({
      position: [driverLocation.latitude, driverLocation.longitude],
      popup: `🚗 Driver Location (Accuracy ±${Math.round(driverLocation.accuracy || 10)}m)`,
      type: 'driver',
    })
  }

  const mapCenter = driverLocation
    ? [driverLocation.latitude, driverLocation.longitude]
    : ride.pickupLocation?.latitude
    ? [ride.pickupLocation.latitude, ride.pickupLocation.longitude]
    : null

  const getStepStatus = (stepKey) => {
    const order = ['REQUESTED', 'MATCHED', 'IN_PROGRESS', 'COMPLETED']
    const currentIndex = order.indexOf(currentStatus)
    const stepIndex = order.indexOf(stepKey)

    if (currentStatus === 'CANCELLED') return 'cancelled'
    if (currentIndex > stepIndex) return 'done'
    if (currentIndex === stepIndex) return 'current'
    return 'pending'
  }

  const copyLicensePlate = (plate) => {
    if (plate) {
      navigator.clipboard.writeText(plate)
      setCopiedPlate(true)
      setTimeout(() => setCopiedPlate(false), 2000)
    }
  }

  return (
    <div className="live-trip-container">
      {/* Top Header Row */}
      <div className="trip-topbar-row">
        <Link to="/dashboard" className="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>All Trips</span>
        </Link>
        <div className="trip-id-pill tabular-nums">
          Trip #{ride.id} • {ride.rideType === 'CARPOOL' ? 'Carpool Shared' : 'Solo Direct'}
        </div>
      </div>

      <div className="live-trip-grid">
        {/* Left Column: Trip Sheet & Stepper */}
        <div className="trip-details-panel">
          {/* Status Stepper Card */}
          <div className="trip-sheet-card">
            <div className="stepper-header">
              <div>
                <span className="stepper-eyebrow">Trip Status</span>
                <h1 className="stepper-title">
                  {currentStatus === 'REQUESTED' && 'Locating Driver…'}
                  {currentStatus === 'MATCHED' && 'Driver En Route to Pickup'}
                  {currentStatus === 'IN_PROGRESS' && 'Trip In Transit'}
                  {currentStatus === 'COMPLETED' && 'Arrived at Destination'}
                  {currentStatus === 'CANCELLED' && 'Trip Cancelled'}
                </h1>
              </div>
              <span className={`status-badge-capsule status-${currentStatus.toLowerCase()}`}>
                {currentStatus}
              </span>
            </div>

            {/* Stepper Progress Visual Bar */}
            {currentStatus !== 'CANCELLED' ? (
              <div className="trip-stepper-progress" aria-label="Trip Progress">
                <div className={`stepper-step step-${getStepStatus('REQUESTED')}`}>
                  <div className="step-circle">
                    {getStepStatus('REQUESTED') === 'done' ? '✓' : '1'}
                  </div>
                  <span className="step-label">Requested</span>
                </div>
                <div className={`step-connector conn-${getStepStatus('MATCHED')}`} />

                <div className={`stepper-step step-${getStepStatus('MATCHED')}`}>
                  <div className="step-circle">
                    {getStepStatus('MATCHED') === 'done' ? '✓' : '2'}
                  </div>
                  <span className="step-label">Confirmed</span>
                </div>
                <div className={`step-connector conn-${getStepStatus('IN_PROGRESS')}`} />

                <div className={`stepper-step step-${getStepStatus('IN_PROGRESS')}`}>
                  <div className="step-circle">
                    {getStepStatus('IN_PROGRESS') === 'done' ? '✓' : '3'}
                  </div>
                  <span className="step-label">In Transit</span>
                </div>
                <div className={`step-connector conn-${getStepStatus('COMPLETED')}`} />

                <div className={`stepper-step step-${getStepStatus('COMPLETED')}`}>
                  <div className="step-circle">
                    {getStepStatus('COMPLETED') === 'done' ? '✓' : '4'}
                  </div>
                  <span className="step-label">Arrived</span>
                </div>
              </div>
            ) : (
              <div className="transit-alert alert-danger" style={{ marginTop: '12px' }}>
                <span>This ride request was cancelled. No fare has been charged.</span>
              </div>
            )}
          </div>

          {/* Assigned Driver Card */}
          {ride.driver && (
            <div className="assigned-driver-card">
              <div className="driver-header-wrap">
                <div className="driver-avatar-box">
                  <span className="driver-avatar-initial">
                    {(ride.driver.name || 'D').charAt(0).toUpperCase()}
                  </span>
                  <span className="driver-vehicle-badge">🚘</span>
                </div>
                <div className="driver-text-meta">
                  <span className="driver-card-label">Your Safar Pro Driver</span>
                  <strong className="driver-card-name">{ride.driver.name}</strong>
                  <span className="driver-card-model">{ride.driver.vehicleType || 'White Sedan (AC)'}</span>
                </div>
                <div className="driver-rating-box">
                  <div className="rating-pill tabular-nums">
                    <span className="rating-star">★</span>
                    <span>{Number(ride.driver.rating || 5.0).toFixed(1)}</span>
                  </div>
                  <span className="rating-count">{ride.driver.numRatings || 12} rides</span>
                </div>
              </div>

              {/* License Plate Banner */}
              <div className="driver-plate-strip">
                <div className="plate-tag-box">
                  <span className="plate-country-code">IND</span>
                  <span className="plate-number-text">{ride.driver.licensePlate || 'RJ 14 EA 9241'}</span>
                </div>
                <button
                  type="button"
                  className="btn-copy-plate"
                  onClick={() => copyLicensePlate(ride.driver.licensePlate || 'RJ 14 EA 9241')}
                  title="Copy Vehicle Number"
                >
                  {copiedPlate ? 'Copied ✓' : 'Copy Plate'}
                </button>
              </div>
            </div>
          )}

          {/* Route & Trip Details */}
          <div className="trip-sheet-card route-summary-card">
            <div className="route-timeline">
              <div className="route-timeline-point">
                <span className="timeline-dot dot-pickup" />
                <div className="timeline-content">
                  <span className="timeline-sub">Pickup Point</span>
                  <strong className="timeline-address" title={ride.pickupLocation?.displayName}>
                    {ride.pickupLocation?.displayName || 'Pickup Point'}
                  </strong>
                </div>
              </div>
              <div className="timeline-stem-line" />
              <div className="route-timeline-point">
                <span className="timeline-dot dot-dest" />
                <div className="timeline-content">
                  <span className="timeline-sub">Drop-off Destination</span>
                  <strong className="timeline-address" title={ride.destinationLocation?.displayName}>
                    {ride.destinationLocation?.displayName || 'Drop-off Destination'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="trip-metrics-grid">
              <div className="trip-metric-item">
                <span className="metric-title">Distance</span>
                <strong className="metric-data tabular-nums">
                  {ride.distanceKm ? formatDistance(ride.distanceKm) : 'Calculating…'}
                </strong>
              </div>
              <div className="trip-metric-item">
                <span className="metric-title">Fare Total</span>
                <strong className="metric-data tabular-nums" style={{ color: '#0f172a' }}>
                  {ride.price !== null ? formatCurrency(ride.price) : 'Fare pending'}
                </strong>
              </div>
              <div className="trip-metric-item">
                <span className="metric-title">Category</span>
                <strong className="metric-data">
                  {ride.rideType === 'CARPOOL' ? 'Carpool (30% off)' : 'Solo'}
                </strong>
              </div>
            </div>

            {/* Payment Section */}
            <div className="payment-action-card">
              <div className="payment-card-header">
                <div>
                  <span className="payment-eyebrow">Payment Status</span>
                  <div className="payment-status-row">
                    {ride.paymentStatus === 'PAID' ? (
                      <span className="badge-paid">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Paid via Razorpay
                      </span>
                    ) : (
                      <span className="badge-unpaid">Payment Pending</span>
                    )}
                  </div>
                </div>

                {ride.paymentStatus === 'PAID' && ride.razorpayPaymentId && (
                  <span className="payment-id-tag tabular-nums" title={`Razorpay Payment ID: ${ride.razorpayPaymentId}`}>
                    Ref: {ride.razorpayPaymentId}
                  </span>
                )}
              </div>

              {ride.paymentStatus === 'PAID' ? (
                <div className="payment-paid-details">
                  <div className="paid-success-callout">
                    <div className="callout-icon">✨</div>
                    <div className="callout-text">
                      <strong>Receipt Confirmed</strong>
                      <p>
                        Trip fare has been settled digitally. No cash payment needed upon drop-off.
                      </p>
                    </div>
                  </div>
                </div>
              ) : currentStatus !== 'CANCELLED' ? (
                <div className="payment-unpaid-actions">
                  <p className="payment-notice">
                    Pay securely using UPI (Google Pay, PhonePe, Paytm), Netbanking, or Debit/Credit Card.
                  </p>
                  <button
                    type="button"
                    className="btn-pay-razorpay"
                    onClick={handlePayWithRazorpay}
                    disabled={isProcessingPayment}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                      <line x1="2" y1="10" x2="22" y2="10"></line>
                    </svg>
                    <span>
                      {isProcessingPayment
                        ? 'Opening Razorpay Checkout…'
                        : `Pay ${ride.price !== null ? formatCurrency(ride.price) : 'Fare'} with Razorpay`}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Cancel Button */}
            {['REQUESTED', 'MATCHED'].includes(currentStatus) && (
              <button
                type="button"
                className="btn-cancel-trip"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling Trip…' : 'Cancel Ride'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Map */}
        <div className="live-map-panel">
          <div className="map-glass-card">
            <div className="map-status-pill-bar">
              <div className="live-pulse-container">
                <span className={`pulse-indicator ${isConnected ? 'live-on' : 'live-wait'}`} />
                <span className="pulse-text">
                  {isConnected ? 'Real-Time GPS Tracking Active' : 'Connecting to GPS…'}
                </span>
              </div>
            </div>

            {mapCenter && (
              <LiveMap
                center={mapCenter}
                zoom={14}
                markers={markers}
                path={routePath}
                height="560px"
                autoCenter={!!driverLocation}
              />
            )}
          </div>
        </div>
      </div>

      {currentStatus === 'COMPLETED' && !hasReviewed && (
        <RatingModal
          rideId={rideId}
          onComplete={() => setHasReviewed(true)}
        />
      )}
    </div>
  )
}
