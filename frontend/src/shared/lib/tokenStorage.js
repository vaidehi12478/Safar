const TOKEN_KEY = 'safar.access_token'
const REFRESH_TOKEN_KEY = 'safar.refresh_token'
const FALLBACK_KEYS = ['access_token', 'token', 'authToken']

function normalizeToken(rawValue) {
  if (!rawValue) {
    return null
  }
  // Handle accidentally stringified values like "\"eyJ...\""
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    try {
      return JSON.parse(rawValue)
    } catch {
      return rawValue
    }
  }
  return rawValue
}

export const tokenStorage = {
  get() {
    const primary = normalizeToken(localStorage.getItem(TOKEN_KEY))
    if (primary) {
      return primary
    }
    for (const key of FALLBACK_KEYS) {
      const fallback = normalizeToken(localStorage.getItem(key))
      if (fallback) {
        return fallback
      }
    }
    return null
  },
  set(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  },
  getRefreshToken() {
    return normalizeToken(localStorage.getItem(REFRESH_TOKEN_KEY))
  },
  setRefreshToken(token) {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    for (const key of FALLBACK_KEYS) {
      localStorage.removeItem(key)
    }
  },
}
