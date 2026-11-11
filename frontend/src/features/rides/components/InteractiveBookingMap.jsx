import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix default Leaflet icon paths
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Google Maps Style Vibrant Teardrop SVG Markers
const pickupIcon = L.divIcon({
  html: `
    <div class="gmap-pin gmap-pin-pickup">
      <div class="gmap-pin-head">
        <span class="gmap-pin-center"></span>
      </div>
      <div class="gmap-pin-tip"></div>
      <div class="gmap-pin-pulse"></div>
    </div>
  `,
  className: 'gmap-marker-container',
  iconSize: [36, 48],
  iconAnchor: [18, 46],
  popupAnchor: [0, -46],
})

const destinationIcon = L.divIcon({
  html: `
    <div class="gmap-pin gmap-pin-destination">
      <div class="gmap-pin-head">
        <span class="gmap-pin-icon">🏁</span>
      </div>
      <div class="gmap-pin-tip"></div>
      <div class="gmap-pin-pulse"></div>
    </div>
  `,
  className: 'gmap-marker-container',
  iconSize: [36, 48],
  iconAnchor: [18, 46],
  popupAnchor: [0, -46],
})

// Map click event listener
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

// Invalidate size on mount to ensure tiles render immediately without blank areas
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    // Initial resize trigger
    map.invalidateSize()

    // Subsequent resize triggers after DOM paints
    const timer1 = setTimeout(() => {
      map.invalidateSize()
    }, 100)

    const timer2 = setTimeout(() => {
      map.invalidateSize()
    }, 400)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [map])
  return null
}

// Fit bounds automatically when route or markers change
function MapBoundsFitter({ points }) {
  const map = useMap()
  const prevPointsRef = useRef('')

  useEffect(() => {
    const validPoints = points.filter(
      (p) => Array.isArray(p) && p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])
    )
    if (validPoints.length === 0) return

    const key = JSON.stringify(validPoints.slice(0, 4))
    if (key === prevPointsRef.current) return
    prevPointsRef.current = key

    if (validPoints.length === 1) {
      map.flyTo(validPoints[0], 14, { animate: true, duration: 1 })
    } else {
      const bounds = L.latLngBounds(validPoints)
      map.fitBounds(bounds, { padding: [50, 50], animate: true })
    }
  }, [points, map])

  return null
}

// Floating "Recenter to My GPS Location" control
function LocateMeControl({ onLocate }) {
  const map = useMap()

  return (
    <button
      type="button"
      className="btn-map-locate-me"
      onClick={() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = [pos.coords.latitude, pos.coords.longitude]
              map.flyTo(coords, 15, { animate: true, duration: 1.2 })
              if (onLocate) onLocate(coords)
            },
            () => {},
            { timeout: 8000, enableHighAccuracy: true }
          )
        }
      }}
      title="Recenter to my location"
      aria-label="Recenter map to current location"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
        <line x1="12" y1="2" x2="12" y2="5"></line>
        <line x1="12" y1="19" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="5" y2="12"></line>
        <line x1="19" y1="12" x2="22" y2="12"></line>
      </svg>
    </button>
  )
}

export function InteractiveBookingMap({
  pickupCoords,
  destinationCoords,
  routePath = [],
  pickupAddress,
  destinationAddress,
  pinMode, // 'pickup' | 'destination'
  onPinModeChange,
  onMapClick,
  onMarkerDragEnd,
}) {
  // Default center: coordinates or Delhi NCR / India center
  const defaultCenter = pickupCoords || destinationCoords || [28.6139, 77.2090]
  const indiaBounds = [
    [6.5, 68.0],   // Southwest corner of India
    [37.5, 97.5],  // Northeast corner of India
  ]

  const boundsPoints = []
  if (pickupCoords) boundsPoints.push(pickupCoords)
  if (destinationCoords) boundsPoints.push(destinationCoords)
  if (routePath && routePath.length > 0) {
    boundsPoints.push(...routePath)
  }

  return (
    <div className="booking-map-wrapper">
      {/* Floating Mode Header Bar */}
      <div className="map-control-bar">
        <div className="map-mode-selector" role="group" aria-label="Map click pin target">
          <button
            type="button"
            className={`map-mode-btn ${pinMode === 'pickup' ? 'active active-pickup' : ''}`}
            onClick={() => onPinModeChange('pickup')}
            aria-pressed={pinMode === 'pickup'}
          >
            <span className="mode-dot dot-pickup"></span>
            <span>Click to Set Pickup</span>
          </button>

          <button
            type="button"
            className={`map-mode-btn ${pinMode === 'destination' ? 'active active-dest' : ''}`}
            onClick={() => onPinModeChange('destination')}
            aria-pressed={pinMode === 'destination'}
          >
            <span className="mode-dot dot-dest"></span>
            <span>Click to Set Destination</span>
          </button>
        </div>

        <div className="map-instruction-pill">
          <span className="cursor-indicator" aria-hidden="true">👆</span>
          <span>
            {pinMode === 'pickup'
              ? 'Click map or drag green pin to choose pickup spot'
              : 'Click map or drag red pin to choose drop-off destination'}
          </span>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="interactive-map-canvas">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '560px', width: '100%', cursor: 'crosshair' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapClickHandler onMapClick={onMapClick} />
          <MapBoundsFitter points={boundsPoints} />
          <MapResizer />
          <LocateMeControl />

          {/* Draggable Pickup Marker */}
          {pickupCoords && (
            <Marker
              position={pickupCoords}
              icon={pickupIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latLng = e.target.getLatLng()
                  if (onMarkerDragEnd) {
                    onMarkerDragEnd('pickup', [latLng.lat, latLng.lng])
                  }
                },
              }}
            >
              <Popup autoPan={false}>
                <div className="gmap-popup">
                  <span className="popup-label pickup-label">📍 Pickup Location</span>
                  <strong className="popup-address">{pickupAddress || 'Selected pickup spot'}</strong>
                  <span className="popup-drag-hint">💡 Drag this marker to adjust exact pickup location</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Draggable Destination Marker */}
          {destinationCoords && (
            <Marker
              position={destinationCoords}
              icon={destinationIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latLng = e.target.getLatLng()
                  if (onMarkerDragEnd) {
                    onMarkerDragEnd('destination', [latLng.lat, latLng.lng])
                  }
                },
              }}
            >
              <Popup autoPan={false}>
                <div className="gmap-popup">
                  <span className="popup-label dest-label">🏁 Drop-off Destination</span>
                  <strong className="popup-address">{destinationAddress || 'Selected destination'}</strong>
                  <span className="popup-drag-hint">💡 Drag this marker to adjust exact drop-off spot</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Driving Route Polyline */}
          {routePath && routePath.length > 1 && (
            <Polyline
              positions={routePath}
              pathOptions={{
                color: '#2563eb',
                weight: 6,
                opacity: 0.9,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}
