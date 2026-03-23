import axios from 'axios'
import { tokenStorage } from '../../shared/lib/tokenStorage'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000',
  timeout: 15000,
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

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
