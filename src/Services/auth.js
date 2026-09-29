const AUTH_STORAGE_KEY = 'pro-english-session'

export const saveAuthSession = (session) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event('pro-english-auth-change'))
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem('pro-english-auth')
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem('pro-english-auth')
  window.dispatchEvent(new Event('pro-english-auth-change'))
}

export const getStoredAuthSession = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))
  } catch {
    return null
  }
}