import { Link, useNavigate } from 'react-router-dom'
import StudentBrand from './StudentBrand'
import { useStudent } from '../Services/useStudent'

const navigationItems = [['Inicio / Agenda', '/home'], ['Mi perfil', '/perfil']]

export default function StudentNavbar({ onNavigate }) {
  const navigate = useNavigate()
  const { currentStudent, logout } = useStudent()

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
      <nav className="student-nav" aria-label="Navegación principal">
        {navigationItems.map(([label, href]) => <Link className={window.location.pathname === href ? 'active' : ''} to={href} key={href}>{label}</Link>)}
      </nav>
      <div className="student-account">
        <div className="student-avatar" aria-hidden="true">{currentStudent?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div>
        <div className="student-identity"><strong>{currentStudent?.name}</strong><span>Matrícula: {currentStudent?.matricula}</span></div>
        <button
          className="account-button"
          type="button"
          onClick={handleGoToProfile}
        >
          Mi cuenta
        </button>
        <button className="logout-button" type="button" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Cerrar Sesión</button>
      </div>
    </header>
  )
}
