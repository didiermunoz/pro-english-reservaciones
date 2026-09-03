import { useState } from 'react'
import './LoginPage.css'
import heroImage from '../assets/hero.png'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    window.setTimeout(() => setIsSubmitting(false), 900)
  }

  return (
    <main className="pea-login-page">
      <section className="pea-login-visual" aria-label="Pro English Academy SOUTH">
        <div className="pea-login-brand">Pro English Academy SOUTH</div>
        <div className="pea-login-visual-content">
          <h1>Tu ingles, Tu ritmo</h1>
          <p>Reserva clases personalizadas ahora</p>
        </div>
        <img className="pea-login-art" src={heroImage} alt="" />
        <div className="pea-login-visual-footer">PRO ENGLISH ACADEMY SOUTH <span>•</span> APRENDE SIN LÍMITES</div>
      </section>

      <section className="pea-login-panel">
        <div className="pea-login-form-wrap">
          <div className="pea-login-mobile-brand">Pro English Academy SOUTH</div>
          <div className="pea-login-heading">
            <span className="pea-login-kicker">Bienvenido de nuevo</span>
            <h2>Inicia sesión</h2>
            <p>Ingresa tus datos para continuar con tus reservas.</p>
          </div>

          <form className="pea-login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" placeholder="nombre@ejemplo.com" autoComplete="email" required />

            <div className="pea-login-password-label">
              <label htmlFor="password">Contraseña</label>
              <a href="#forgot-password">¿La olvidaste?</a>
            </div>
            <div className="pea-login-password-field">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contraseña" autoComplete="current-password" required />
              <button type="button" className="pea-login-show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <label className="pea-login-remember">
              <input type="checkbox" name="remember" />
              <span>Recordar sesión</span>
            </label>

            <button className="pea-login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando...' : 'Entrar a mi cuenta'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="pea-login-signup">¿Aún no tienes una cuenta? <a href="#register">Regístrate gratis</a></p>
          <p className="pea-login-legal">Al continuar, aceptas nuestros <a href="#terms">términos de uso</a> y <a href="#privacy">política de privacidad</a>.</p>
        </div>
      </section>
    </main>
  )
}
