export default function ContractHero({ selectedCount, studentHours, modality, onModalityChange }) {
  const remainingHours = studentHours - selectedCount

  return (
    <section className="contract-hero" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <span className="eyebrow">PORTAL DEL ESTUDIANTE / AGENDA SEMANAL</span>
        <h1 id="welcome-title">Bienvenido de nuevo, Didier</h1>
        <p>Selecciona tus horas de la semana. Recuerda que tus límites y modalidad están definidos por tu contrato físico.</p>
        <div className="hero-visual" aria-hidden="true"><span>ENGLISH</span><strong>LEARNING</strong><i>✦</i></div>
      </div>
      <div className="contract-details">
        <div className="section-heading compact-heading"><span>Resumen de contrato</span><span className="lock-icon" aria-label="Solo lectura">⌑</span></div>
        <div className="contract-grid">
          <div className="contract-item"><span>Vigencia del Curso</span><strong>12 Oct 2026 - 12 Abr 2027</strong></div>
          <div className="contract-item"><span>Modalidad Asignada</span><div className="modality-picker" role="group" aria-label="Modalidad de clases"><label className={modality === 'presencial' ? 'chosen' : ''}><input checked={modality === 'presencial'} name="modality" onChange={() => onModalityChange('presencial')} type="radio" />Presencial</label><label className={modality === 'online' ? 'chosen' : ''}><input checked={modality === 'online'} name="modality" onChange={() => onModalityChange('online')} type="radio" />En Línea</label></div></div>
          <div className="contract-item"><span>Siguiente Clase Requerida</span><strong className="lesson-badge">Lección 4: Past Continuous</strong></div>
        </div>
      </div>
      <div className="hours-meter">
        <div className="meter-copy"><span>Horas semanales asignadas</span><strong><b>{selectedCount}</b> de {studentHours} Horas</strong><small>{remainingHours === 0 ? 'Contrato semanal completo' : `Te restan ${remainingHours} horas por asignar`}</small></div>
        <div className="progress-ring" style={{ '--progress': `${(selectedCount / studentHours) * 100}%` }}><div><strong>{selectedCount}/{studentHours}</strong><span>hrs</span></div></div>
      </div>
    </section>
  )
}
