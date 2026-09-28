import { useNavigate } from 'react-router-dom'
import StudentBrand from './StudentBrand'

const NAVIGATION_ITEMS = [
  { label: 'Inicio / Agenda', href: '/dashboard', isActive: true },
  { label: 'Mi Plan de Estudios', href: '/plan-de-estudios', isActive: false },
  { label: 'Mis Clases Confirmadas', href: '/mis-clases', isActive: false },
  { label: 'Detalles de Contrato', href: '/mi-contrato', isActive: false },
  { label: 'Contacto Recepción', href: '/soporte', isActive: false },
]

export default function StudentNavbar({ onNavigate }) {
  const navigate = useNavigate()

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
        {NAVIGATION_ITEMS.map(({ label, href, isActive }) => (
          <a className={isActive ? 'active' : ''} href={href} key={href}>{label}</a>
        ))}
      </nav>
      <div className="student-account">
        <div className="student-avatar" aria-hidden="true">DM</div>
        <div className="student-identity"><strong>Didier Muñoz</strong><span>ID: 8992</span></div>
        <button
          className="account-button"
          type="button"
          onClick={handleGoToProfile}
        >
          Mi cuenta
        </button>
        <button className="logout-button" type="button">Cerrar Sesión</button>
      </div>
    </header>
  )
}
