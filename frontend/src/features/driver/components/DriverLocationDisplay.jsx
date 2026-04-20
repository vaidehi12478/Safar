import { useEffect, useState, useRef } from 'react'
import { useDriver } from '../DriverContext'
import { LiveMap } from '../../../shared/ui/LiveMap'

export function DriverLocationDisplay() {
  const { location, isTracking, error, startTracking, stopTracking, status } = useDriver()
  const [address, setAddress] = useState(null)
  const lastFetched = useRef({ lat: 0, lon: 0 })

  useEffect(() => {
    // Auto-start tracking when status is ONLINE
    if (status === 'ONLINE' && !isTracking) {
      startTracking()
    }
  }, [status, isTracking, startTracking])

  // Reverse Geocoding to get text address
  useEffect(() => {
    if (!location) return;

    const latDelta = Math.abs(location.latitude - lastFetched.current.lat);
    const lonDelta = Math.abs(location.longitude - lastFetched.current.lon);
    
    // Only fetch if moved more than ~111 meters (0.001 degrees) to avoid spamming the free API
    if (latDelta > 0.001 || lonDelta > 0.001) {
      lastFetched.current = { lat: location.latitude, lon: location.longitude };
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`)
        .then(res => res.json())
        .then(data => {
            if(data && data.display_name) {
                setAddress(data.display_name);
            }
        })
        .catch(err => console.error("Geocoding error", err));
    }
  }, [location]);


  if (!location && !isTracking) {
    return (
      <div className="location-display card">
        <h3>Location Status</h3>
        <div className="location-status-idle">
          <p>Turn driver status to ONLINE to start GPS tracking.</p>
        </div>
      </div>
    )
  }

  const mapCenter = location ? [location.latitude, location.longitude] : null
  const mapMarkers = location
    ? [
        {
          position: [location.latitude, location.longitude],
          popup: address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
          type: 'driver',
        },
      ]
    : []

  return (
    <div className="location-display card">
      <div className="location-header">
        <h3>Live Location</h3>
        <span className={`tracking-indicator ${isTracking ? 'active' : ''}`}>
          {isTracking ? '🔴 Tracking' : '⚪ Not Tracking'}
        </span>
      </div>

      {location ? (
        <div className="location-content">
          {/* Interactive Map */}
          <LiveMap
            center={mapCenter}
            zoom={16}
            markers={mapMarkers}
            accuracy={location.accuracy}
            height="300px"
          />

          <div className="location-coords" style={{ marginTop: '1rem' }}>
            <div className="coord-item">
              <span className="coord-label">Latitude</span>
              <span className="coord-value">{location.latitude.toFixed(6)}</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">Longitude</span>
              <span className="coord-value">{location.longitude.toFixed(6)}</span>
            </div>
          </div>
          
          {address && (
              <div className="location-address" style={{marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '0.9rem', color: '#166534', border: '1px solid #bbf7d0'}}>
                  <strong>📌 Current Address:</strong>
                  <p style={{margin: '0.25rem 0 0 0'}}>{address}</p>
              </div>
          )}

          <div className="location-meta">
            {location.accuracy && (
              <div className="meta-item">
                <strong>Accuracy:</strong>
                <span>{location.accuracy.toFixed(1)} meters</span>
              </div>
            )}
            {location.timestamp && (
              <div className="meta-item">
                <strong>Last Update:</strong>
                <span>{location.timestamp.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="location-loading">
          <p>Acquiring GPS signal...</p>
          <div className="spinner"></div>
        </div>
      )}

      {error && (
        <div className="error-message">
          Location Error: {error}
        </div>
      )}

      {isTracking && (
        <div className="tracking-note">
          <small>📍 Your location is being updated every 5 seconds</small>
        </div>
      )}
    </div>
  )
}

