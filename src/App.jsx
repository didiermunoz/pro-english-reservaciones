import React from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './modules/modules/LoginPage.jsx'
import { Profile } from './modules/modules/profile_page/Profile.jsx'
import Reception from './modules/reception/reception.jsx'
import HomePage from './Pages/HomePage.jsx'
import { StudentProvider } from './Services/StudentContext.jsx'
import { useStudent } from './Services/useStudent.js'
import ChangePasswordPage from './modules/modules/ChangePasswordPage.jsx'

function NotFoundPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>404 - Página no encontrada</h2>
      <Link to="/login">Volver al login</Link>
    </div>
  )
}

function ProtectedRoute({ children, role, allowPasswordChange = false }) {
  const { user, loadingSession } = useStudent()
  if (loadingSession) return <main className="route-loading" aria-live="polite">Cargando sesión...</main>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    const message = role === 'reception' ? 'No tienes permisos de Recepción para acceder a este módulo.' : 'No tienes permisos para acceder a este módulo.'
    return <main className="route-denied"><p role="alert">{message}</p><Link to={user.role === 'reception' ? '/recepcion' : '/home'}>Volver a mi panel</Link></main>
  }
  if (user.role === 'student' && user.mustChangePassword && !allowPasswordChange) return <Navigate to="/actualizar-password" replace />
  return children
}

export default function App() {
  return <StudentProvider>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/actualizar-password" element={<ProtectedRoute role="student" allowPasswordChange><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />
      <Route path="/recepcion" element={<ProtectedRoute role="reception"><Reception /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute role="student"><HomePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </StudentProvider>
}