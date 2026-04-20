import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { updateDriverLocation, updateDriverStatus, getCurrentRide } from '../../services/api/ridesApi'
import { useRideTracking } from '../../services/ws/useRideTracking'

export const DriverContext = createContext(null)

export function DriverProvider({ children }) {
  const { user } = useAuth()
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('OFFLINE')
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState(null)
  const [activeRideId, setActiveRideId] = useState(null)
  const locationWatchId = useRef(null)
  const updateTimeoutId = useRef(null)

  // Connect WebSocket for the active ride
  const { sendLocation, isConnected: wsConnected } = useRideTracking(activeRideId)

  // Fetch current active ride on mount / status change
  useEffect(() => {
    if (status === 'ONLINE' || status === 'ON_RIDE') {
      getCurrentRide()
        .then((ride) => {
          if (ride?.id) setActiveRideId(ride.id)
          else setActiveRideId(null)
        })
        .catch(() => setActiveRideId(null))
    }
  }, [status])

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser')
      return
    }

    if (!isTracking) {
      locationWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          setLocation({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(),
          })
          setError(null)

          // Push to WebSocket immediately (real-time for rider)
          sendLocation(latitude, longitude, accuracy)

          // Debounce HTTP location updates to backend DB (every 5 seconds)
          if (updateTimeoutId.current) clearTimeout(updateTimeoutId.current)
          updateTimeoutId.current = setTimeout(() => {
            updateDriverLocation(latitude, longitude).catch((err) => {
              console.error('Failed to update location:', err)
            })
          }, 5000)
        },
        (err) => {
          setError(err.message)
          console.error('Geolocation error:', err)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      )
      setIsTracking(true)
    }
  }, [isTracking, sendLocation])

  // Stop GPS tracking
  const stopTracking = () => {
    if (locationWatchId.current !== null) {
      navigator.geolocation.clearWatch(locationWatchId.current)
      locationWatchId.current = null
    }
    if (updateTimeoutId.current) clearTimeout(updateTimeoutId.current)
    setIsTracking(false)
    setLocation(null)
  }

  // Update driver status
  const updateStatus = async (newStatus) => {
    try {
      const result = await updateDriverStatus(newStatus)
      setStatus(newStatus)
      setError(null)

      // Auto-track location when going online
      if (newStatus === 'ONLINE' && !isTracking) {
        startTracking()
      }
      // Stop tracking when going offline
      else if (newStatus === 'OFFLINE' && isTracking) {
        stopTracking()
      }

      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Get location immediately (for initial location on app load)
  const getInitialLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
        })
      },
      (err) => console.error('Initial location error:', err)
    )
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current)
      }
      if (updateTimeoutId.current) clearTimeout(updateTimeoutId.current)
    }
  }, [])

  const value = {
    location,
    status,
    isTracking,
    error,
    startTracking,
    stopTracking,
    updateStatus,
    getInitialLocation,
    activeRideId,
    wsConnected,
  }

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  )
}

export function useDriver() {
  const context = useContext(DriverContext)
  if (!context) {
    throw new Error('useDriver must be used within DriverProvider')
  }
  return context
}
