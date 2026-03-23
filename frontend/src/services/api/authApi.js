import { apiClient } from './client'
import { normalizeUser, tokenSchema } from '../../entities/user'

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
