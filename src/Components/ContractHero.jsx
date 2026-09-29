import CurrentDateTime from './CurrentDateTime'

export default function ContractHero({ student, selectedCount, studentHours, attendanceMode, onAttendanceModeChange }) {
  const remainingHours = studentHours - selectedCount
  const progressPercent = studentHours > 0 ? (selectedCount / studentHours) * 100 : 0
  const contract = student?.contract
  const modality = contract?.modality || 'Sin contrato activo'
  const startDate = contract?.startDate ? new Date(`${contract.startDate}T00:00:00`).toLocaleDateString('es-MX') : 'No disponible'
  const endDate = contract?.endDate ? new Date(`${contract.endDate}T00:00:00`).toLocaleDateString('es-MX') : 'No disponible'

  return (
    <section className="contract-hero" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <span className="eyebrow">PORTAL DEL ESTUDIANTE / AGENDA SEMANAL</span>
        <h1 id="welcome-title">Bienvenido de nuevo, {student?.name}</h1>
        <p>Selecciona tus próximas clases. El sistema habilita únicamente los días permitidos según la fecha y hora actuales.</p>
        <div className="hero-visual" aria-hidden="true"><span>ENGLISH</span><strong>LEARNING</strong><i>✦</i></div>
      </div>
      <div className="contract-details">
        <div className="section-heading compact-heading"><span>Resumen de contrato</span><span className="lock-icon" aria-label="Solo lectura">⌑</span></div>
        <div className="contract-grid">
          <div className="contract-item"><span>Vigencia del Curso</span><strong>{startDate} - {endDate}</strong></div>
          <div className="contract-item"><span>Modalidad Asignada</span>{modality === 'Hibrida' ? <div className="modality-picker" role="group" aria-label="Modalidad de la reserva"><label className={attendanceMode === 'in-person' ? 'chosen' : ''}><input type="radio" name="attendance-mode" checked={attendanceMode === 'in-person'} onChange={() => onAttendanceModeChange('in-person')} />Presencial</label><label className={attendanceMode === 'online' ? 'chosen' : ''}><input type="radio" name="attendance-mode" checked={attendanceMode === 'online'} onChange={() => onAttendanceModeChange('online')} />En línea</label></div> : <strong className="modality-value">{modality}</strong>}</div>
          <div className="contract-item"><span>Matrícula</span><strong>{student?.matricula}</strong></div>
        </div>
      </div>
      <CurrentDateTime />
      <div className="hours-meter">
        <div className="meter-copy"><span>Horas semanales asignadas</span><strong><b>{selectedCount}</b> de {studentHours} Horas</strong><small>{remainingHours === 0 ? 'Contrato semanal completo' : `Te restan ${remainingHours} horas por asignar`}</small></div>
        <div className="progress-ring" style={{ '--progress': `${progressPercent}%` }}><div><strong>{selectedCount}/{studentHours}</strong><span>hrs</span></div></div>
      </div>
    </section>
  )
}
