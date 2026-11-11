import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { requestRide, estimateRideFare, reverseGeocodeLocation } from '../../../services/api/ridesApi'
import { formatCurrency, formatDistance } from '../../../entities/ride'
import { getErrorMessage } from '../../../shared/lib/errors'
import { InteractiveBookingMap } from '../components/InteractiveBookingMap'
import { RideTypeSelector } from '../components/RideTypeSelector'
import { LocationSearchInput } from '../components/LocationSearchInput'

export function RequestRidePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Form inputs
  const [pickupQuery, setPickupQuery] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [rideType, setRideType] = useState('SOLO')

  // Map coordinates & route geometry
  const [pickupCoords, setPickupCoords] = useState(null)
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [routePath, setRoutePath] = useState([])
  const [pinMode, setPinMode] = useState('pickup')

  // UI state
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [mapNotice, setMapNotice] = useState(null)

  // 1. Fare Estimation Mutation
  const estimateMutation = useMutation({
    mutationFn: estimateRideFare,
    onSuccess: (data) => {
      if (data.pickup_coords) setPickupCoords(data.pickup_coords)
      if (data.destination_coords) setDestinationCoords(data.destination_coords)
      if (data.route_path) setRoutePath(data.route_path)
      setMapNotice(null)
    },
  })

  // 2. Ride Request / Booking Mutation
  const rideMutation = useMutation({
    mutationFn: requestRide,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-rides'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      if (data?.id) {
        navigate(`/rides/${data.id}`)
      }
    },
  })

  // Handle "Use Current Location" (Browser GPS)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setPickupCoords([lat, lng])

        try {
          const rev = await reverseGeocodeLocation(lat, lng)
          const name = rev.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          setPickupQuery(name)
        } catch {
          setPickupQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } finally {
          setGpsLoading(false)
          setPinMode('destination')
          estimateMutation.reset()
        }
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) {
          setGpsError('Location permission denied. You can select from the nearby hubs dropdown.')
        } else {
          setGpsError('Could not retrieve current GPS location. Please choose from dropdown.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Handle map click for pin placement (Google Maps UX)
  const handleMapClick = async ([lat, lng]) => {
    estimateMutation.reset()
    rideMutation.reset()

    if (pinMode === 'pickup') {
      setPickupCoords([lat, lng])
      setPickupQuery('Resolving pickup address…')
      setMapNotice('📍 Resolving pickup address…')
      try {
        const rev = await reverseGeocodeLocation(lat, lng)
        const name = rev.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        setPickupQuery(name)
      } catch {
        setPickupQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } finally {
        setMapNotice(null)
        setPinMode('destination')
      }
    } else {
      setDestinationCoords([lat, lng])
      setDestinationQuery('Resolving destination address…')
      setMapNotice('🏁 Resolving destination address…')
      try {
        const rev = await reverseGeocodeLocation(lat, lng)
        const name = rev.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        setDestinationQuery(name)
      } catch {
        setDestinationQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } finally {
        setMapNotice(null)
      }
    }
  }

  // Handle dragging pin directly on the map (Google Maps UX)
  const handleMarkerDragEnd = async (targetPin, [lat, lng]) => {
    estimateMutation.reset()
    rideMutation.reset()

    if (targetPin === 'pickup') {
      setPickupCoords([lat, lng])
      setPickupQuery('Updating pickup address…')
      try {
        const rev = await reverseGeocodeLocation(lat, lng)
        setPickupQuery(rev.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      } catch {
        setPickupQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    } else {
      setDestinationCoords([lat, lng])
      setDestinationQuery('Updating destination address…')
      try {
        const rev = await reverseGeocodeLocation(lat, lng)
        setDestinationQuery(rev.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      } catch {
        setDestinationQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    }
  }

  // Swap pickup and destination
  const handleSwapLocations = () => {
    const tempQ = pickupQuery
    setPickupQuery(destinationQuery)
    setDestinationQuery(tempQ)

    const tempCoords = pickupCoords
    setPickupCoords(destinationCoords)
    setDestinationCoords(tempCoords)

    estimateMutation.reset()
    rideMutation.reset()
  }

  // Calculate fare estimate
  const handleGetEstimate = (e) => {
    e.preventDefault()
    if (!pickupQuery.trim() || !destinationQuery.trim()) return

    if (pickupQuery.trim().toLowerCase() === destinationQuery.trim().toLowerCase()) {
      setGpsError('Pickup and drop-off cannot be identical.')
      return
    }

    setGpsError(null)
    estimateMutation.mutate({
      pickup_query: pickupQuery.trim(),
      destination_query: destinationQuery.trim(),
    })
  }

  // Confirm and book ride
  const handleConfirmRide = (e) => {
    e.preventDefault()
    rideMutation.mutate({
      pickup_query: pickupQuery.trim(),
      destination_query: destinationQuery.trim(),
      ride_type: rideType,
    })
  }

  const isEstimated = estimateMutation.isSuccess && estimateMutation.data
  const estimateData = estimateMutation.data
  const soloFare = estimateData?.estimated_fare ?? null
  const activeFare = isEstimated
    ? rideType === 'CARPOOL'
      ? soloFare * 0.7
      : soloFare
    : null

  return (
    <div className="request-ride-container">
      <div className="request-ride-top-nav">
        <Link to="/dashboard" className="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Return to Dashboard</span>
        </Link>
        <div className="flow-step-badge tabular-nums">
          {rideMutation.isSuccess ? 'Confirmed' : isEstimated ? 'Step 2: Choose Tier' : 'Step 1: Set Route'}
        </div>
      </div>

      <div className="request-ride-split">
        {/* Left Column: Booking Form & Options */}
        <div className="booking-form-card">
          <div className="booking-header">
            <span className="booking-eyebrow">Plan Your Trip</span>
            <h1 className="booking-title">Where are you going?</h1>
            <p className="booking-desc">Select nearby popular hubs from the dropdown or click anywhere on the map</p>
          </div>

          {/* Booking Success View */}
          {rideMutation.isSuccess ? (
            <div className="booking-success-card" role="status">
              <div className="success-header-row">
                <span className="active-pulse-dot" aria-hidden="true" />
                <h3>Ride Dispatched — Locating Nearby Drivers</h3>
              </div>
              <p className="success-subtext">
                Your request is live. Nearby drivers have received your ride card and are reviewing your pickup route.
              </p>
              <div className="success-trip-summary">
                <div className="summary-point">
                  <span className="summary-dot dot-pickup" />
                  <div>
                    <span className="summary-label">Pickup Point</span>
                    <strong className="summary-val">{rideMutation.data.pickupLocation?.displayName || pickupQuery}</strong>
                  </div>
                </div>
                <div className="summary-point">
                  <span className="summary-dot dot-dest" />
                  <div>
                    <span className="summary-label">Drop-off Destination</span>
                    <strong className="summary-val">{rideMutation.data.destinationLocation?.displayName || destinationQuery}</strong>
                  </div>
                </div>
                <div className="summary-fare-row tabular-nums">
                  <span className="summary-label">Locked Fare</span>
                  <strong className="summary-price">
                    {formatCurrency(rideMutation.data.price || activeFare)}
                    <span className="tier-tag">{rideType === 'CARPOOL' ? 'Carpool (30% Off)' : 'Solo Direct'}</span>
                  </strong>
                </div>
              </div>
              <Link
                to={`/rides/${rideMutation.data.id}`}
                className="btn-track-live"
              >
                <span>Enter Live Tracking Cockpit</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          ) : (
            <form onSubmit={isEstimated ? handleConfirmRide : handleGetEstimate} className="booking-form-element">
              {/* Connected Route Input Box */}
              <div className="connected-route-container">
                <div className="route-connector-line" aria-hidden="true">
                  <span className="connector-node-top" />
                  <span className="connector-dashed-stem" />
                  <span className="connector-node-bottom" />
                </div>

                <div className="route-inputs-stack">
                  {/* Pickup Search Input with Dropdown */}
                  <LocationSearchInput
                    id="pickup-query-input"
                    label="Pickup Location"
                    placeholder="Search pickup hub, or click directly on map…"
                    value={pickupQuery}
                    onChange={(val) => {
                      setPickupQuery(val)
                      estimateMutation.reset()
                    }}
                    onFocus={() => setPinMode('pickup')}
                    onSelectLocation={({ name, coords }) => {
                      setPickupCoords(coords)
                      setPinMode('destination')
                      estimateMutation.reset()
                    }}
                    userCoords={pickupCoords}
                    type="pickup"
                    onUseCurrentLocation={handleUseCurrentLocation}
                    loadingGps={gpsLoading}
                  />

                  {/* Swap Button */}
                  <div className="route-swap-row">
                    <button
                      type="button"
                      className="btn-swap-locations"
                      onClick={handleSwapLocations}
                      title="Swap pickup and drop-off"
                      aria-label="Swap pickup and drop-off locations"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                        <polyline points="17 14 12 9 7 14"></polyline>
                      </svg>
                    </button>
                  </div>

                  {/* Destination Search Input with Dropdown */}
                  <LocationSearchInput
                    id="destination-query-input"
                    label="Drop-off Destination"
                    placeholder="Search airport, mall, or click directly on map…"
                    value={destinationQuery}
                    onChange={(val) => {
                      setDestinationQuery(val)
                      estimateMutation.reset()
                    }}
                    onFocus={() => setPinMode('destination')}
                    onSelectLocation={({ name, coords }) => {
                      setDestinationCoords(coords)
                      estimateMutation.reset()
                    }}
                    userCoords={pickupCoords}
                    type="destination"
                  />
                </div>
              </div>

              {/* Status & Error Alerts */}
              {gpsError && (
                <div className="transit-alert alert-warning" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{gpsError}</span>
                </div>
              )}
              {mapNotice && (
                <div className="transit-alert alert-info">
                  <span className="dropdown-spinner" />
                  <span>{mapNotice}</span>
                </div>
              )}
              {estimateMutation.isError && (
                <div className="transit-alert alert-danger" role="alert">
                  <span>{getErrorMessage(estimateMutation.error)}</span>
                </div>
              )}
              {rideMutation.isError && (
                <div className="transit-alert alert-danger" role="alert">
                  <span>{getErrorMessage(rideMutation.error)}</span>
                </div>
              )}

              {/* Ride Type Selector (Solo vs Carpool) */}
              <RideTypeSelector
                selectedType={rideType}
                onChange={setRideType}
                soloFare={soloFare}
                currency={estimateData?.currency || 'USD'}
              />

              {/* Fare & Route Breakdown (once estimated) */}
              {isEstimated && (
                <div className="fare-breakdown-card">
                  <div className="breakdown-header">
                    <span>Trip Summary</span>
                    <span className="route-badge-live">Optimized Route</span>
                  </div>
                  <div className="breakdown-metrics-row">
                    <div className="metric-chip">
                      <span className="metric-label">Estimated Distance</span>
                      <strong className="metric-val tabular-nums">{formatDistance(estimateData.distance_km)}</strong>
                    </div>
                    <div className="metric-chip">
                      <span className="metric-label">Approximate Travel Time</span>
                      <strong className="metric-val tabular-nums">{Math.round((estimateData.distance_km / 35) * 60) || 12} mins</strong>
                    </div>
                  </div>
                  <div className="breakdown-total-row tabular-nums">
                    <div>
                      <span className="total-label">Total Upfront Fare</span>
                      {rideType === 'CARPOOL' && (
                        <span className="carpool-discount-tag">30% Shared Carpool Discount Applied</span>
                      )}
                    </div>
                    <strong className="total-price-figure">
                      {formatCurrency(activeFare, estimateData.currency)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Primary Actions */}
              {!isEstimated ? (
                <button
                  type="submit"
                  className="btn-primary-action btn-calculate"
                  disabled={estimateMutation.isPending || !pickupQuery || !destinationQuery}
                >
                  <span>{estimateMutation.isPending ? 'Calculating Highway Route…' : 'Calculate Upfront Fare & Route'}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              ) : (
                <div className="confirm-actions-stack">
                  <button
                    type="submit"
                    className="btn-primary-action btn-confirm-ride"
                    disabled={rideMutation.isPending}
                  >
                    <span>{rideMutation.isPending ? 'Dispatching Request…' : `Confirm & Request ${rideType === 'CARPOOL' ? 'Carpool' : 'Solo Ride'}`}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-link"
                    onClick={() => estimateMutation.reset()}
                  >
                    Adjust Route or Change Locations
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Right Column: Interactive Map */}
        <div className="map-column-wrapper">
          <InteractiveBookingMap
            pickupCoords={pickupCoords}
            destinationCoords={destinationCoords}
            routePath={routePath}
            pickupAddress={pickupQuery}
            destinationAddress={destinationQuery}
            pinMode={pinMode}
            onPinModeChange={setPinMode}
            onMapClick={handleMapClick}
            onMarkerDragEnd={handleMarkerDragEnd}
          />
        </div>
      </div>
    </div>
  )
}
