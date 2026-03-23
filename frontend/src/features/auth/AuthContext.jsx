import { useEffect, useMemo, useState } from 'react'
import * as authApi from '../../services/api/authApi'
import { tokenStorage } from '../../shared/lib/tokenStorage'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenStorage.get())
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('bootstrapping')

  useEffect(() => {
    async function bootstrap() {
      const existingToken = tokenStorage.get()
      if (!existingToken) {
        setStatus('ready')
        return
      }
      try {
        const me = await authApi.getMe()
        setToken(existingToken)
        setUser(me)
      } catch {
        tokenStorage.clear()
        setToken(null)
        setUser(null)
      } finally {
        setStatus('ready')
      }
    }

    bootstrap()
  }, [])

  async function login(payload) {
    const tokenResponse = await authApi.login(payload)
    tokenStorage.set(tokenResponse.access_token)
    setToken(tokenResponse.access_token)
    const me = await authApi.getMe()
    setUser(me)
    return me
  }

  async function register(payload) {
    const tokenResponse = await authApi.register(payload)
    tokenStorage.set(tokenResponse.access_token)
    setToken(tokenResponse.access_token)
    const me = await authApi.getMe()
    setUser(me)
    return me
  }

  function logout() {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ token, user, status, login, register, logout }),
    [token, user, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
