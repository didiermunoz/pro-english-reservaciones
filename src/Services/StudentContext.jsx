import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { clearAuthSession, getStoredAuthSession, saveAuthSession } from './auth'
import { StudentContext } from './StudentContextBase'

export function StudentProvider({ children }) {
  const [session, setSession] = useState(getStoredAuthSession)
  const [user, setUser] = useState(session?.user || null)
  const [reservations, setReservations] = useState([])
  const [resolvedToken, setResolvedToken] = useState(null)
  const loadingSession = Boolean(session?.token && resolvedToken !== session.token)

  const acceptSession = useCallback((payload) => {
    const nextSession = { token: payload.token, user: payload.user }
    saveAuthSession(nextSession)
    setSession(nextSession)
    setUser(payload.user)
    setReservations(payload.reservations || [])
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setSession(null)
    setUser(null)
    setReservations([])
    setResolvedToken(null)
  }, [])

  const token = session?.token || null

  const refreshSession = useCallback(async () => {
    if (!token) return
    const payload = await api.me(token)
    setUser(payload.user)
    setReservations(payload.reservations || [])
    const nextSession = { ...session, user: payload.user }
    saveAuthSession(nextSession)
    setSession(nextSession)
    setResolvedToken(token)
  }, [session, token])

  const createReservations = useCallback(async (slots, modality) => {
    const payload = await api.createReservations(token, slots, modality)
    setReservations(payload.reservations || [])
    return payload.reservations || []
  }, [token])

  const cancelReservations = useCallback(async (ids) => {
    const payload = await api.cancelReservations(token, ids)
    setReservations(payload.reservations || [])
    return payload.reservations || []
  }, [token])

  const updateProfile = useCallback(async (updates) => {
    const payload = await api.updateProfile(session.token, updates)
    setUser(payload.user)
    const nextSession = { ...session, user: payload.user }
    saveAuthSession(nextSession)
    setSession(nextSession)
    return payload.user
  }, [session])

  useEffect(() => {
    const handleSessionChange = () => {
      const nextSession = getStoredAuthSession()
      setSession(nextSession)
      setUser(nextSession?.user || null)
      if (!nextSession) {
        setReservations([])
        setResolvedToken(null)
      }
    }
    window.addEventListener('pro-english-auth-change', handleSessionChange)
    return () => window.removeEventListener('pro-english-auth-change', handleSessionChange)
  }, [])

  useEffect(() => {
    let active = true
    if (!token) return undefined
    const syncWithApi = () => {
      api.me(token)
        .then((payload) => {
          if (!active) return
          setUser(payload.user)
          if (payload.reservations) setReservations(payload.reservations)
          const storedSession = getStoredAuthSession()
          const nextSession = { ...storedSession, user: payload.user }
          saveAuthSession(nextSession)
          setSession(nextSession)
          setResolvedToken(token)
        })
        .catch(() => { if (active) logout() })
    }
    syncWithApi()
    const interval = window.setInterval(() => syncWithApi(), 30000)
    const onFocus = () => syncWithApi()
    window.addEventListener('focus', onFocus)
    window.addEventListener('pro-english-refresh', onFocus)
    setLoadingSession(true)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pro-english-refresh', onFocus)
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