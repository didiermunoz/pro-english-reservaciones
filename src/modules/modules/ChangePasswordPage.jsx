import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'
import styles from './ChangePasswordPage.module.css'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { token, currentStudent, refreshSession, logout } = useStudent()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(currentStudent?.mustChangePassword ? 'Debes cambiar tu contraseña temporal antes de continuar.' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!password || !confirmation) {
      setError('Campos obligatorios incompletos.')
      return
    }
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await api.changePassword(token, password)
      await refreshSession()
      navigate('/home', { replace: true })
    } catch (changeError) {
      setError(changeError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <span className={styles.eyebrow}>SEGURIDAD DE CUENTA</span>
        <h1>Actualiza tu contraseña</h1>
        <p>Debes reemplazar tu contraseña temporal para continuar.</p>
        {error && <div className={styles.alert} role="alert">{error}</div>}
        <label htmlFor="new-password">Nueva contraseña
          <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label htmlFor="confirm-password">Confirmar contraseña
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar contraseña'}</button>
        <button className={styles.logout} type="button" onClick={logout}>Cerrar sesión</button>
      </form>
    </main>
  )
}