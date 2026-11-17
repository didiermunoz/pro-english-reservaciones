import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './login.module.css'
import logopro from '../../assets/logo_og.png'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'

const getRememberedUser = (role) => localStorage.getItem(`pro-english-remembered-${role}`) || ''

export default function LoginPage() {
  const navigate = useNavigate()
  const { acceptSession } = useStudent()
  const [matricula, setMatricula] = useState(() => getRememberedUser('student'))
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('student')
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedUser('student')))

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
      const rememberedUserKey = `pro-english-remembered-${mode}`
      if (rememberMe) localStorage.setItem(rememberedUserKey, matricula.trim())
      else localStorage.removeItem(rememberedUserKey)
      acceptSession(payload, rememberMe)
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
    <main className={`${styles.page} ${isReceptionMode ? styles.receptionPage : ''}`}>
      <section className={styles.brandPanel} aria-label="Pro English Academy">
        <div className={styles.brandHeader}>
          <img className={styles.logo} src={logopro} alt="Pro English Academy" />
        </div>
      
        <div className={styles.brandContent}>
          <p className={styles.eyebrow}>{isReceptionMode ? 'South Branch · Recepción' : 'South Branch'}</p>
          <h1>{isReceptionMode ? 'Coordina cada jornada con claridad' : 'Accede ahora para reservar'}</h1>
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
            <p className={styles.kicker}>{isReceptionMode ? 'Bienvenido, equipo de recepción' : 'Bienvenido'}</p>
            <h2>Inicia sesión</h2>
            <p>{isReceptionMode ? 'Ingresa tus credenciales para gestionar la academia.' : 'Ingresa tus datos para continuar.'}</p>
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
              <span className={styles.passwordField}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  className={styles.passwordToggle}
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <span className={`${styles.eyeIcon} ${showPassword ? styles.eyeVisible : ''}`} aria-hidden="true" />
                </button>
              </span>
            </label>

            <div className={styles.rememberRow}>
              <label className={styles.checkboxLabel} htmlFor="remember-me">
                <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(event) => {
                  const checked = event.target.checked
                  setRememberMe(checked)
                  if (!checked) localStorage.removeItem(`pro-english-remembered-${mode}`)
                }} />
                Recordarme
              </label>
            </div>

            <button className={styles.submitButton} type="submit" disabled={loading}>
              {loading ? 'Validando...' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              className={styles.modeToggle}
              onClick={() => {
                const nextMode = mode === 'reception' ? 'student' : 'reception'
                setMode(nextMode)
                setMatricula(getRememberedUser(nextMode))
                setRememberMe(Boolean(getRememberedUser(nextMode)))
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