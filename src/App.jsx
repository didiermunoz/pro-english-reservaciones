import React from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './modules/modules/LoginPage.jsx'
import { Profile } from './modules/modules/profile_page/Profile.jsx'
import Reception from './modules/reception/reception.jsx'
import HomePage from './Pages/HomePage.jsx'

function NotFoundPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>404 - Página no encontrada</h2>
      <Link to="/login">Volver al login</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      {/* TODO: proteger esta ruta cuando exista autenticación real */}
      <Route path="/perfil" element={<Profile />} />
      {/* TODO: proteger esta ruta cuando exista autenticación real */}
      <Route path="/recepcion" element={<Reception />} />
      {/* TODO: proteger esta ruta cuando exista autenticación real */}
      <Route path="/home" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}