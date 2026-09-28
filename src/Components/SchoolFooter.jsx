import StudentBrand from './StudentBrand'

const FOOTER_LINK_GROUPS = [
  {
    title: 'Portal',
    links: [
      { label: 'Agenda semanal', href: '/dashboard' },
      { label: 'Mis clases', href: '/mis-clases' },
      { label: 'Mi contrato', href: '/mi-contrato' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { label: 'Contacto Recepción', href: '/soporte' },
      { label: 'recepcion@flexenglish.academy', href: 'mailto:recepcion@flexenglish.academy' },
      { label: '+34 900 123 456', href: 'tel:+34900123456' },
    ],
  },
]

const FOOTER_SCHOOL_DETAILS = [
  'Lun - Vie, 7:00 - 20:00',
  'Av. de la Educación 24',
  'Madrid, España',
]

export default function SchoolFooter() {
  return (
    <footer className="school-footer">
      <div className="footer-brand">
        <StudentBrand footer />
        <p>Aprende inglés con flexibilidad, acompañamiento y objetivos claros.</p>
      </div>
      {FOOTER_LINK_GROUPS.map(({ title, links }) => (
        <div className="footer-column" key={title}>
          <strong>{title}</strong>
          {links.map(({ label, href }) => <a href={href} key={href}>{label}</a>)}
        </div>
      ))}
      <div className="footer-column">
        <strong>Escuela</strong>
        {FOOTER_SCHOOL_DETAILS.map((detail) => <span key={detail}>{detail}</span>)}
      </div>
      <div className="footer-bottom">© 2026 Pro English Academy. Todos los derechos reservados.</div>
    </footer>
  )
}
