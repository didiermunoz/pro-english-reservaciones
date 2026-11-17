export const RECEPTION_TV_TOKEN_STORAGE_KEY = 'pro-english-reception-tv-token'

export const getReceptionTvTokenExpiration = (token) => {
  try {
    const encodedPayload = token.split('.')[1]
    if (!encodedPayload) return null
    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')))
    const expiration = Number(payload.exp) * 1000
    return Number.isFinite(expiration) && expiration > 0 ? expiration : null
  } catch {
    return null
  }
}

export const getStoredReceptionTvToken = () => {
  let storedToken
  try {
    storedToken = JSON.parse(localStorage.getItem(RECEPTION_TV_TOKEN_STORAGE_KEY))
  } catch {
    localStorage.removeItem(RECEPTION_TV_TOKEN_STORAGE_KEY)
    return ''
  }

  if (!storedToken || typeof storedToken.token !== 'string') {
    if (storedToken !== null) localStorage.removeItem(RECEPTION_TV_TOKEN_STORAGE_KEY)
    return ''
  }

  const tokenExpiration = getReceptionTvTokenExpiration(storedToken.token)
  if (!tokenExpiration || storedToken.expiresAt !== tokenExpiration || tokenExpiration <= Date.now()) {
    localStorage.removeItem(RECEPTION_TV_TOKEN_STORAGE_KEY)
    return ''
  }

  return storedToken.token
}
