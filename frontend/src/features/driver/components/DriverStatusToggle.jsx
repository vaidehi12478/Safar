import { useState } from 'react'
import { useDriver } from '../DriverContext'

function StatusButton({ status, currentStatus, onClick, isLoading }) {
  const isActive = currentStatus === status
  const statusColors = {
    OFFLINE: '#ef4444',
    ONLINE: '#10b981',
    ON_RIDE: '#f59e0b',
  }

  return (
    <button
      className={`status-btn ${isActive ? 'active' : ''}`}
      onClick={onClick}
      disabled={isLoading}
      style={{
        backgroundColor: isActive ? statusColors[status] : '#e5e7eb',
        color: isActive ? '#fff' : '#111827',
      }}
    >
      <span className="status-indicator" style={{ backgroundColor: statusColors[status] }}></span>
      {status}
    </button>
  )
}

export function DriverStatusToggle() {
  const { status, updateStatus, error } = useDriver()
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus) => {
    if (status === newStatus) return
    setIsLoading(true)
    try {
      await updateStatus(newStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="status-toggle-container">
      <div className="status-toggle">
        <h3>Driver Status</h3>
        <div className="status-buttons">
          <StatusButton
            status="OFFLINE"
            currentStatus={status}
            onClick={() => handleStatusChange('OFFLINE')}
            isLoading={isLoading}
          />
          <StatusButton
            status="ONLINE"
            currentStatus={status}
            onClick={() => handleStatusChange('ONLINE')}
            isLoading={isLoading}
          />
          <StatusButton
            status="ON_RIDE"
            currentStatus={status}
            onClick={() => handleStatusChange('ON_RIDE')}
            isLoading={isLoading}
          />
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  )
}
