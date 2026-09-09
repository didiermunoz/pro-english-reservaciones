import StudentBrand from './StudentBrand'

export default function SchoolFooter() {
  return <footer className="school-footer">
    <div className="footer-brand"><StudentBrand footer /><p>Aprende inglés con flexibilidad, acompañamiento y objetivos claros.</p></div>
    <div className="footer-column"><strong>Portal</strong><a href="/dashboard">Agenda semanal</a><a href="/mis-clases">Mis clases</a><a href="/mi-contrato">Mi contrato</a></div>
    <div className="footer-column"><strong>Ayuda</strong><a href="/soporte">Contacto Recepción</a><a href="mailto:recepcion@flexenglish.academy">recepcion@flexenglish.academy</a><a href="tel:+34900123456">+34 900 123 456</a></div>
    <div className="footer-column"><strong>Escuela</strong><span>Lun - Vie, 7:00 - 20:00</span><span>Av. de la Educación 24</span><span>Madrid, España</span></div>
    <div className="footer-bottom">© 2026 Pro English Academy. Todos los derechos reservados.</div>
  </footer>
}