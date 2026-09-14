import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './login.module.css'
import logopro from '../../assets/logo_og.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const [matricula, setMatricula] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    console.log({ matricula, password, rememberMe })
    navigate('/perfil')
  }

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
            <label htmlFor="matricula">
              Matrícula (ID)
              <input
                id="matricula"
                name="matricula"
                type="text"
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                placeholder="Ejemplo: (3244)"
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

            <div className={styles.rememberRow}>
              <label className={styles.checkboxLabel} htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Recordarme</span>
              </label>
            </div>

            <button className={styles.submitButton} type="submit">
              Iniciar sesión
            </button>
          </form>

          {/* TODO: quitar este acceso directo cuando exista login con roles reales (alumno vs recepción) */}
          <div style={{ marginTop: '0.95rem', textAlign: 'center' }}>
            <Link
              to="/recepcion"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted, #64748b)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Acceso Recepción (temporal)
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}