import { useState } from 'react'
import { useDriver } from '../DriverContext'
import { useAuth } from '../../auth/useAuth'

export function DriverShiftHeader({ stats }) {
  const { user } = useAuth()
  const { status, updateStatus, location, isTracking } = useDriver()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async (newStatus) => {
    if (status === newStatus || isUpdating) return
    setIsUpdating(true)
    try {
      await updateStatus(newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const isOnline = status === 'ONLINE'
  const isOnRide = status === 'ON_RIDE'

  return (
    <header className="driver-shift-header" aria-label="Driver shift control">
      <div className="driver-identity-group">
        <div className="driver-avatar-ring">
          <span>🚗</span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#0f172a' }}>
              {user?.name || 'Driver'}
            </h1>
            <span className="tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.875rem', fontWeight: 600, color: '#d97706' }}>
              <span>{Number(stats?.rating || 5.0).toFixed(1)}</span>
              <span aria-hidden="true">★</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.8125rem', color: '#64748b' }}>
            <span>Shift Mode: {status}</span>
            <span>•</span>
            <span className="tabular-nums">
              GPS: {isTracking && location ? `±${Math.round(location.accuracy || 10)}m` : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      <div className="shift-toggle-controls">
        {isOnRide ? (
          <div className="shift-badge-on-ride">
            <span className="active-pulse-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>Currently on Active Trip</span>
          </div>
        ) : (
          <div className="shift-button-group" role="group" aria-label="Toggle driver shift status">
            <button
              type="button"
              className={`shift-pill-btn ${!isOnline ? 'active-offline' : ''}`}
              onClick={() => handleToggle('OFFLINE')}
              disabled={isUpdating}
              aria-pressed={!isOnline}
            >
              <span>Offline</span>
            </button>
            <button
              type="button"
              className={`shift-pill-btn ${isOnline ? 'active-online' : ''}`}
              onClick={() => handleToggle('ONLINE')}
              disabled={isUpdating}
              aria-pressed={isOnline}
            >
              <span className={isOnline ? 'active-pulse-dot' : ''} aria-hidden="true" />
              <span>{isUpdating ? 'Updating…' : 'Online & Ready'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

