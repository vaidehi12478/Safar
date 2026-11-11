import axios from 'axios'
import { tokenStorage } from '../../shared/lib/tokenStorage'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000',
  timeout: 15000,
  withCredentials: true, // Enables HttpOnly cookie transmission across ports
})

export function getAuthConfig() {
  const token = tokenStorage.get()
  if (!token) {
    return {}
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

// Request Interceptor: Attach current Access Token
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Queue state for silent concurrent refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response Interceptor: Catch 401 Unauthorized and Silently Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const url = originalRequest?.url || ''

      // Do not attempt to refresh if the request was an auth attempt itself
      if (
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/register') ||
        url.includes('/api/auth/refresh') ||
        url.includes('/api/auth/logout')
      ) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Another refresh request is already in-flight; queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Send refresh request with cookie and fallback JSON body
        const fallbackRefreshToken = tokenStorage.getRefreshToken()
        const { data } = await apiClient.post('/api/auth/refresh', {
          refresh_token: fallbackRefreshToken,
        })

        const newAccessToken = data.access_token
        tokenStorage.set(newAccessToken)

        if (data.refresh_token) {
          tokenStorage.setRefreshToken(data.refresh_token)
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        processQueue(null, newAccessToken)
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStorage.clear()

        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=1'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
