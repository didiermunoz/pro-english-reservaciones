import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { clearAuthSession, getStoredAuthSession, saveAuthSession } from './auth'
import { StudentContext } from './StudentContextBase'

const isInvalidSessionError = (error) => (
  error?.status === 401 || (error?.status === 403 && error?.code === 'AUTH_INVALID')
)

const updateIfChanged = (ref, setter, value) => {
  if (JSON.stringify(ref.current) === JSON.stringify(value)) return false
  ref.current = value
  setter(value)
  return true
}

export function StudentProvider({ children }) {
  const [session, setSession] = useState(getStoredAuthSession)
  const [user, setUser] = useState(session?.user || null)
  const [reservations, setReservations] = useState([])
  const [loadingSession, setLoadingSession] = useState(Boolean(session?.token))
  const sessionRef = useRef(session)
  const userRef = useRef(user)
  const reservationsRef = useRef(reservations)
  const lastSyncAt = useRef(0)

  const acceptSession = useCallback((payload) => {
    const nextSession = { token: payload.token, user: payload.user }
    updateIfChanged(sessionRef, setSession, nextSession)
    updateIfChanged(userRef, setUser, payload.user)
    updateIfChanged(reservationsRef, setReservations, payload.reservations || [])
    saveAuthSession(nextSession)
  }, [])

  const logout = useCallback(() => {
    updateIfChanged(sessionRef, setSession, null)
    updateIfChanged(userRef, setUser, null)
    updateIfChanged(reservationsRef, setReservations, [])
    setLoadingSession(false)
    clearAuthSession()
  }, [])

  const token = session?.token || null

  const refreshSession = useCallback(async () => {
    if (!token) {
      setLoadingSession(false)
      return
    }
    try {
      const payload = await api.me(token)
      updateIfChanged(userRef, setUser, payload.user)
      updateIfChanged(reservationsRef, setReservations, payload.reservations || [])
      const nextSession = { ...(sessionRef.current || { token }), user: payload.user }
      updateIfChanged(sessionRef, setSession, nextSession)
      if (JSON.stringify(getStoredAuthSession()) !== JSON.stringify(nextSession)) {
        saveAuthSession(nextSession)
      }
    } catch (error) {
      if (isInvalidSessionError(error)) logout()
    }
  }, [token, logout])

  const createReservations = useCallback(async (slots, modality) => {
    const payload = await api.createReservations(token, slots, modality)
    updateIfChanged(reservationsRef, setReservations, payload.reservations || [])
    return payload.reservations || []
  }, [token])

  const cancelReservations = useCallback(async (ids) => {
    const payload = await api.cancelReservations(token, ids)
    updateIfChanged(reservationsRef, setReservations, payload.reservations || [])
    return payload.reservations || []
  }, [token])

  const updateProfile = useCallback(async (updates) => {
    const payload = await api.updateProfile(session.token, updates)
    const nextSession = { ...session, user: payload.user }
    updateIfChanged(userRef, setUser, payload.user)
    updateIfChanged(sessionRef, setSession, nextSession)
    if (JSON.stringify(getStoredAuthSession()) !== JSON.stringify(nextSession)) {
      saveAuthSession(nextSession)
    }
    return payload.user
  }, [session])

  useEffect(() => {
    const handleSessionChange = () => {
      const nextSession = getStoredAuthSession()
      const nextUser = nextSession?.user || null
      updateIfChanged(sessionRef, setSession, nextSession)
      updateIfChanged(userRef, setUser, nextUser)
      if (!nextSession) {
        updateIfChanged(reservationsRef, setReservations, [])
        setLoadingSession(false)
      } else if (nextUser) {
        setLoadingSession(false)
      }
    }
    window.addEventListener('pro-english-auth-change', handleSessionChange)
    return () => window.removeEventListener('pro-english-auth-change', handleSessionChange)
  }, [])

  useEffect(() => {
    let active = true
    if (!token) {
      setLoadingSession(false)
      return undefined
    }
    let initialSyncPending = true
    const syncWithApi = async () => {
      lastSyncAt.current = Date.now()
      const initialSync = initialSyncPending
      initialSyncPending = false
      try {
        const payload = await api.me(token)
        if (!active) return
        updateIfChanged(userRef, setUser, payload.user)
        if (payload.reservations) {
          updateIfChanged(reservationsRef, setReservations, payload.reservations)
        }
        const storedSession = getStoredAuthSession()
        const nextSession = { ...(storedSession || sessionRef.current || { token }), user: payload.user }
        updateIfChanged(sessionRef, setSession, nextSession)
        if (JSON.stringify(storedSession) !== JSON.stringify(nextSession)) {
          saveAuthSession(nextSession)
        }
      } catch (error) {
        if (active && isInvalidSessionError(error)) logout()
      } finally {
        if (active && initialSync) setLoadingSession(false)
      }
    }
    void syncWithApi()
    const interval = window.setInterval(() => syncWithApi(), 30000)
    const onFocus = () => {
      if (Date.now() - lastSyncAt.current >= 15000) void syncWithApi()
    }
    window.addEventListener('focus', onFocus)
    const onRefresh = () => { void syncWithApi() }
    window.addEventListener('pro-english-refresh', onRefresh)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pro-english-refresh', onRefresh)
    }
  }, [token, logout])

  const value = useMemo(() => ({
    user,
    currentStudent: user?.role === 'student' ? user : null,
    token,
    role: user?.role || null,
    reservations,
    loadingSession,
    acceptSession,
    refreshSession,
    logout,
    setReservations,
    createReservations,
    cancelReservations,
    updateProfile,
  }), [user, token, reservations, loadingSession, acceptSession, refreshSession, logout, createReservations, cancelReservations, updateProfile])

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}