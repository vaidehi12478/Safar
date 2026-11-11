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

// Driver-specific API functions
export async function getAvailableRides() {
  const { data } = await apiClient.get('/api/drivers/rides/available', getAuthConfig())
  return data.map(normalizeRide)
}

export async function getCurrentRide() {
  const { data } = await apiClient.get('/api/drivers/rides/current', getAuthConfig())
  return data ? normalizeRide(data) : null
}

export async function acceptRide(rideId) {
  const { data } = await apiClient.post(
    `/api/drivers/rides/${rideId}/accept`,
    {},
    getAuthConfig()
  )
  return data
}

export async function startRide(rideId) {
  const { data } = await apiClient.post(
    `/api/drivers/rides/${rideId}/start`,
    {},
    getAuthConfig()
  )
  return data
}

export async function completeRide(rideId) {
  const { data } = await apiClient.post(
    `/api/drivers/rides/${rideId}/complete`,
    {},
    getAuthConfig()
  )
  return data
}

export async function cancelRide(rideId) {
  const { data } = await apiClient.post(
    `/api/drivers/rides/${rideId}/cancel`,
    {},
    getAuthConfig()
  )
  return data
}

// Driver location and status functions
export async function updateDriverLocation(latitude, longitude) {
  const { data } = await apiClient.patch(
    '/api/drivers/location',
    { latitude, longitude },
    getAuthConfig()
  )
  return data
}

export async function updateDriverStatus(status) {
  const { data } = await apiClient.patch(
    '/api/drivers/status',
    { status },
    getAuthConfig()
  )
  return data
}

export async function getRideRoute(rideId) {
  const { data } = await apiClient.get(`/api/rides/${rideId}/route`, getAuthConfig())
  return data
}

export async function estimateRideFare(payload) {
  const { data } = await apiClient.post('/api/rides/estimate', payload, getAuthConfig())
  return data
}

export async function cancelRideByRider(rideId) {
  const { data } = await apiClient.post(`/api/rides/${rideId}/cancel`, {}, getAuthConfig())
  return normalizeRide(data)
}

export async function submitRideReview(rideId, payload) {
  const { data } = await apiClient.post(`/api/rides/${rideId}/review`, payload, getAuthConfig())
  return data
}


export async function reverseGeocodeLocation(lat, lng) {
  const { data } = await apiClient.get('/api/rides/reverse-geocode', {
    params: { lat, lng },
    ...getAuthConfig(),
  })
  return data
}

export async function autocompletePlaces(q = '', lat = null, lng = null) {
  const params = {}
  if (q) params.q = q
  if (lat != null) params.lat = lat
  if (lng != null) params.lng = lng

  const { data } = await apiClient.get('/api/rides/places/autocomplete', {
    params,
    ...getAuthConfig(),
  })
  return data
}

export async function createRazorpayOrder(rideId) {
  const { data } = await apiClient.post(
    '/api/payments/razorpay/create-order',
    { ride_id: Number(rideId) },
    getAuthConfig()
  )
  return data
}

export async function verifyRazorpayPayment(payload) {
  const { data } = await apiClient.post(
    '/api/payments/razorpay/verify',
    payload,
    getAuthConfig()
  )
  return data
}
