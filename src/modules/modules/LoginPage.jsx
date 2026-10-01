import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './login.module.css'
import logopro from '../../assets/logo_og.png'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'

export default function LoginPage() {
  const navigate = useNavigate()
  const { acceptSession } = useStudent()
  const [matricula, setMatricula] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('reception')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!matricula.trim() || !password) {
      setError('Campos obligatorios incompletos.')
      return
    }
    setLoading(true)
    try {
      const payload = await api.login({ matricula: matricula.trim(), password, role: mode })
      acceptSession(payload)
      if (payload.user.mustChangePassword) {
        setError('Debes cambiar tu contraseña temporal antes de continuar.')
        navigate('/actualizar-password', { replace: true })
        return
      }
      navigate(payload.user.role === 'reception' ? '/recepcion' : '/home', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  const isReceptionMode = mode === 'reception'
  const toggleLabel = isReceptionMode ? 'Iniciar como estudiante' : 'Iniciar como recepción'

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="Pro English Academy">
        <div className={styles.brandHeader}>
          <img className={styles.logo} src={logopro} alt="Pro English Academy" />
        </div>
      
        <div className={styles.brandContent}>
          <p className={styles.eyebrow}>South Branch</p>
          <h1>Accede ahora para reservar</h1>
        </div>

        <div className={styles.brandFooter}>
          <span>Aprende inglés</span>
          <span>con confianza</span>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formWrapper}>
          <div className={styles.mobileBrand}>Pro English Academy</div>

          <header className={styles.heading}>
            <p className={styles.kicker}>Bienvenido</p>
            <h2>Inicia sesión</h2>
            <p>Ingresa tus datos para continuar.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <p className={styles.loginAlert} role="alert">{error}</p>}
            <label htmlFor="matricula">
              {isReceptionMode ? 'Usuario de recepción' : 'Matrícula (ID)'}
              <input
                id="matricula"
                name="matricula"
                type="text"
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                placeholder={isReceptionMode ? 'Ingresa tu usuario' : 'Ingresa tu matrícula'}
                autoComplete="username"
                required
              />
            </label>

            <label htmlFor="password">
              Contraseña
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />
            </label>

            <button className={styles.submitButton} type="submit" disabled={loading}>
              {loading ? 'Validando...' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              className={styles.modeToggle}
              onClick={() => {
                setMode((currentMode) => currentMode === 'reception' ? 'student' : 'reception')
                setMatricula('')
                setPassword('')
                setError('')
              }}
            >
              {toggleLabel}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}