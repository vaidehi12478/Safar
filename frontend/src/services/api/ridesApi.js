import { apiClient, getAuthConfig } from './client'
import { normalizeRide } from '../../entities/ride'

export async function requestRide(payload) {
  const { data } = await apiClient.post('/api/rides/request', payload, getAuthConfig())
  return normalizeRide(data)
}

export async function getMyRides() {
  const { data } = await apiClient.get('/api/rides/', getAuthConfig())
  return data.map(normalizeRide)
}

export async function getRideById(rideId) {
  const { data } = await apiClient.get(`/api/rides/${rideId}`, getAuthConfig())
  if (Array.isArray(data)) {
    const found = data.find((item) => Number(item.id) === Number(rideId))
    // Backend currently can return an array even for /rides/{id}.
    // Prefer exact id match, otherwise fall back to first ride.
    const fallback = found ?? data[0]
    return fallback ? normalizeRide(fallback) : null
  }
  return normalizeRide(data)
}

export async function getRideStatus(rideId) {
  const { data } = await apiClient.get(`/api/rides/${rideId}/status`, getAuthConfig())
  return {
    id: data.id,
    status: data.status,
    createdAt: data.created_at ?? data.createdAt,
  }
}
