import StudentBrand from './StudentBrand'

const navigationItems = [
  ['Perfil', 'profile'],
  ['Reservar', 'home'],
]

export default function StudentNavbar({ activeView = 'home', onNavigate, onLogout, user }) {
  return (
    <header className="student-navbar">
      <StudentBrand />
      <nav className="student-nav" aria-label="Navegación principal">
        {navigationItems.map(([label, view]) => <a className={activeView === view ? 'active' : ''} href={`#${view}`} key={label} onClick={(event) => {
          event.preventDefault()
          onNavigate(view)
        }}>{label}</a>)}
      </nav>
      <div className="student-account">
        <div className="student-avatar" aria-hidden="true">{user.name.split(' ').map((name) => name[0]).join('')}</div>
        <div className="student-identity"><strong>{user.name}</strong><span>ID: {user.id}</span></div>
        <button className="logout-button" onClick={onLogout} type="button">Cerrar Sesión</button>
      </div>
    </header>
  )
}