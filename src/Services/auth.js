const AUTH_STORAGE_KEY = 'pro-english-session'

export const saveAuthSession = (session, remember) => {
  const targetStorage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage
  otherStorage.removeItem(AUTH_STORAGE_KEY)
  targetStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event('pro-english-auth-change'))
}

export const shouldRememberAuthSession = () => Boolean(localStorage.getItem(AUTH_STORAGE_KEY))

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem('pro-english-auth')
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem('pro-english-auth')
  window.dispatchEvent(new Event('pro-english-auth-change'))
}

export const getStoredAuthSession = () => {
  const readSession = (storage) => {
    try {
      return JSON.parse(storage.getItem(AUTH_STORAGE_KEY))
    } catch {
      return null
    }
  }
  return readSession(localStorage) || readSession(sessionStorage)
}