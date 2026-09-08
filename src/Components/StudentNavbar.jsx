import StudentBrand from './StudentBrand'

const navigationItems = [
  ['Inicio / Agenda', '/dashboard', true],
  ['Mi Plan de Estudios', '/plan-de-estudios'],
  ['Mis Clases Confirmadas', '/mis-clases'],
  ['Detalles de Contrato', '/mi-contrato'],
  ['Contacto Recepción', '/soporte'],
]

export default function StudentNavbar() {
  return (
    <header className="student-navbar">
      <StudentBrand />
      <nav className="student-nav" aria-label="Navegación principal">
        {navigationItems.map(([label, href, active]) => <a className={active ? 'active' : ''} href={href} key={href}>{label}</a>)}
      </nav>
      <div className="student-account">
        <div className="student-avatar" aria-hidden="true">DM</div>
        <div className="student-identity"><strong>Didier Muñoz</strong><span>ID: 8992</span></div>
        <button className="logout-button" type="button">Cerrar Sesión</button>
      </div>
    </header>
  )
}
