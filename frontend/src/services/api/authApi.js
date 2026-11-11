import { apiClient } from './client'
import { normalizeUser, tokenSchema } from '../../entities/user'
import { tokenStorage } from '../../shared/lib/tokenStorage'

export async function register(payload) {
  const { data } = await apiClient.post('/api/auth/register', payload)
  return tokenSchema.parse(data)
}

export async function login(payload) {
  const { data } = await apiClient.post('/api/auth/login', payload)
  return tokenSchema.parse(data)
}

export async function getMe() {
  const { data } = await apiClient.get('/api/auth/me')
  return normalizeUser(data)
}

export async function logout() {
  try {
    const refreshToken = tokenStorage.getRefreshToken()
    await apiClient.post('/api/auth/logout', { refresh_token: refreshToken })
  } finally {
    tokenStorage.clear()
  }
}
