import { useEffect, useRef, useState, useCallback } from 'react'
import { tokenStorage } from '../../shared/lib/tokenStorage'

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? 'ws://127.0.0.1:8000'

/**
 * useRideTracking — connects to the WebSocket for a ride and provides:
 *   - driverLocation: { latitude, longitude, accuracy, timestamp }
 *   - locationHistory: array of [lat, lng] for drawing the path
 *   - isConnected: boolean
 *   - sendLocation(lat, lng, accuracy): function (for drivers to push updates)
 *   - lastStatusEvent: { status, message, ride_id } — latest ride status change
 *   - onStatusChange: callback setter for status change events
 */
export function useRideTracking(rideId) {
  const [driverLocation, setDriverLocation] = useState(null)
  const [locationHistory, setLocationHistory] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastStatusEvent, setLastStatusEvent] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const statusCallbackRef = useRef(null)

  const connect = useCallback(() => {
    if (!rideId) return

    const token = tokenStorage.get()
    if (!token) return

    const url = `${WS_BASE}/ws/track/${rideId}?token=${token}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setIsConnected(true)
      console.log(`[WS] Connected to ride #${rideId}`)
    }

    ws.onmessage = (event) => {
      if (ws !== wsRef.current) return;
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'driver_location') {
          const loc = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: data.timestamp || new Date().toISOString(),
          }
          setDriverLocation(loc)
          setLocationHistory((prev) => [...prev, [data.latitude, data.longitude]])
        }

        if (data.type === 'ride_status') {
          setLastStatusEvent(data)
          // Call the registered callback if any
          if (statusCallbackRef.current) {
            statusCallbackRef.current(data)
          }
        }
      } catch (err) {
        console.error('[WS] Parse error:', err)
      }
    }

    ws.onclose = (event) => {
      if (ws !== wsRef.current) return;
      setIsConnected(false)
      console.log(`[WS] Disconnected from ride #${rideId}`, event.code)
      // Auto-reconnect after 3 seconds (unless intentionally closed or unauthorized)
      if (event.code !== 1000 && event.code !== 4001) {
        reconnectTimer.current = setTimeout(() => connect(), 3000)
      }
    }

    ws.onerror = (err) => {
      if (ws !== wsRef.current) return;
      console.error('[WS] Error:', err)
    }

    wsRef.current = ws
  }, [rideId])

  // Send location update (used by driver)
  const sendLocation = useCallback((latitude, longitude, accuracy) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'location',
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
        })
      )
    }
  }, [])

  // Register a callback for status change events
  const onStatusChange = useCallback((callback) => {
    statusCallbackRef.current = callback
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.close(1000, 'Intentional unmount')
        wsRef.current = null
      }
    }
  }, [connect])

  return {
    driverLocation,
    locationHistory,
    isConnected,
    sendLocation,
    lastStatusEvent,
    onStatusChange,
  }
}
