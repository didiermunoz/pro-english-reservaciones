import { Link, useLocation, useNavigate } from 'react-router-dom'
import StudentBrand from './StudentBrand'
import { useStudent } from '../Services/useStudent'

const navigationItems = [['Inicio / Agenda', '/home'], ['Mi perfil', '/perfil']]

export default function StudentNavbar({ onNavigate, showLogout = true }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { currentStudent, logout } = useStudent()
  const isProfile = pathname === '/perfil'

  const handleGoToProfile = () => {
    if (onNavigate) {
      onNavigate('profile')
      return
    }

    navigate('/perfil')
  }

  return (
    <header className="student-navbar">
      <StudentBrand />
      <h1 className="mobile-page-title">{isProfile ? 'Mi cuenta' : 'Agenda'}</h1>
      <nav className="student-nav" aria-label="Navegación principal">
        {navigationItems.map(([label, href]) => <Link className={window.location.pathname === href ? 'active' : ''} to={href} key={href}>{label}</Link>)}
      </nav>
      <div className="student-account">
        <Link className="student-avatar-link" to="/perfil" aria-label="Ir a Mi cuenta">
          <span className="student-avatar" aria-hidden="true">{currentStudent?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</span>
        </Link>
        <div className="student-identity"><strong>{currentStudent?.name}</strong><span>Matrícula: {currentStudent?.matricula}</span></div>
        <button
          className="account-button"
          type="button"
          onClick={handleGoToProfile}
        >
          Mi cuenta
        </button>
        {showLogout && <button className="logout-button" type="button" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Cerrar Sesión</button>}
      </div>
      <nav className="student-tabbar" aria-label="Navegación inferior">
        <Link className={pathname === '/home' ? 'active' : ''} to="/home" aria-current={pathname === '/home' ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" /></svg>
          <span>Agenda</span>
        </Link>
        <Link className={isProfile ? 'active' : ''} to="/perfil" aria-current={isProfile ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.6-3.5 3.4-5.5 7.5-5.5s6.9 2 7.5 5.5" /></svg>
          <span>Mi cuenta</span>
        </Link>
      </nav>
    </header>
  )
}
