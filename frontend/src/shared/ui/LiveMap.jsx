import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon issue with bundlers (Vite/Webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Custom driver icon (car emoji as a div icon)
const driverIcon = L.divIcon({
  html: '<div style="font-size:28px;text-align:center;line-height:1;">🚗</div>',
  className: 'driver-marker-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
})

const pickupIcon = L.divIcon({
  html: '<div style="font-size:24px;text-align:center;line-height:1;">📍</div>',
  className: 'pickup-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

const destinationIcon = L.divIcon({
  html: '<div style="font-size:24px;text-align:center;line-height:1;">🏁</div>',
  className: 'destination-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

// Component that auto-pans the map when position changes
function MapAutoCenter({ position, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, zoom ?? map.getZoom(), { animate: true })
    }
  }, [position, zoom, map])

  return null
}

// Component that fits map bounds to show full route path + markers
function MapFitBounds({ path, markers }) {
  const map = useMap()
  const hasFitted = useRef(false)

  useEffect(() => {
    if (hasFitted.current) return
    // Collect all points: path + marker positions
    const allPoints = [...path]
    markers.forEach((m) => {
      if (m.position) allPoints.push(m.position)
    })
    if (allPoints.length >= 2) {
      const bounds = L.latLngBounds(allPoints)
      map.fitBounds(bounds, { padding: [40, 40], animate: true })
      hasFitted.current = true
    }
  }, [path, markers, map])

  return null
}

/**
 * Reusable LiveMap component.
 *
 * Props:
 *   - center:   [lat, lng] – map center
 *   - zoom:     number (default 15)
 *   - markers:  array of { position: [lat, lng], popup: string, type: 'driver'|'pickup'|'destination'|'default' }
 *   - accuracy: number (meters) – optional accuracy circle radius around first marker
 *   - height:   CSS height string (default '350px')
 *   - autoCenter: boolean – auto-pan when center changes (default true)
 *   - path:     array of [lat, lng] – polyline path to draw (driver trail)
 */
export function LiveMap({
  center,
  zoom = 15,
  markers = [],
  accuracy,
  height = '350px',
  autoCenter = true,
  path = [],
}) {
  if (!center || !center[0] || !center[1]) {
    return null
  }

  const iconMap = {
    driver: driverIcon,
    pickup: pickupIcon,
    destination: destinationIcon,
  }

  return (
    <div className="live-map-container" style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {autoCenter && <MapAutoCenter position={center} zoom={zoom} />}
        {path.length > 1 && <MapFitBounds path={path} markers={markers} />}

        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            icon={iconMap[marker.type] || new L.Icon.Default()}
          >
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}

        {accuracy && markers[0] && (
          <Circle
            center={markers[0].position}
            radius={accuracy}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f680',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        )}

        {path.length > 1 && (
          <Polyline
            positions={path}
            pathOptions={{
              color: '#3b82f6',
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
