import { useState } from 'react'
import styles from './login.module.css'
import logopro from '../../assets/logo_og.png'

export default function LoginPage() {
  const [matricula, setMatricula] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    console.log({ matricula, password })
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="Pro English Academy">
        <img className={styles.logo} src={logopro} alt="Pro English Academy" />
        <div className={styles.brand}>Pro English Academy</div>
        <div className={styles.brandContent}>
          <h1>Aprende a tu ritmo.</h1>
          <p>Accede a tu cuenta para reservar tus clases de inglés.</p>
        </div>
        <div className={styles.brandFooter}>Pro English Academy South</div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formWrapper}>
          <div className={styles.mobileBrand}>Pro English Academy</div>
          <header className={styles.heading}>
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
                placeholder="Ingresa tu matrícula"
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

            <button className={styles.submitButton} type="submit">
              Iniciar sesión
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}