import { apiClient, getAuthConfig } from './client'

export async function updateUserProfile(payload) {
  const { data } = await apiClient.patch('/api/users/me', payload, getAuthConfig())
  return data
}

export async function getUserStats() {
  const { data } = await apiClient.get('/api/users/me/stats', getAuthConfig())
  return data
}
