import CurrentDateTime from './CurrentDateTime'

export default function ContractHero({ student, selectedCount, studentHours, rosettaRemaining }) {
  const remainingHours = Math.max(0, studentHours - selectedCount)
  const progress = studentHours > 0 ? Math.min(selectedCount / studentHours, 1) : 0
  const circumference = 2 * Math.PI * 34
  const firstName = student?.name?.trim().split(/\s+/)[0] || ''

  return (
    <section className="contract-hero" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <h1 id="welcome-title">Hola, {firstName}</h1>
      </div>
      <CurrentDateTime />
      <p className="contract-modality">Modalidad de tu contrato: {student?.contract?.modality || 'No disponible'}</p>
      <div className="hours-summary">
        <div className="hours-meter" role="img" aria-label={`${selectedCount} de ${studentHours} horas reservadas o seleccionadas esta semana`}>
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle className="hours-ring-track" cx="40" cy="40" r="34" />
            <circle
              className="hours-ring-progress"
              cx="40"
              cy="40"
              r="34"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <span className="hours-ring-label"><strong>{selectedCount}</strong><small>de {studentHours} h</small></span>
        </div>
        <p className="hours-remaining">Te quedan {remainingHours} h para reservar esta semana</p>
      </div>
      {student?.rosetta?.plan === 'paquete' && <p className="rosetta-remaining">Rosetta: te quedan <strong>{rosettaRemaining ?? student.rosetta.remainingHours} de {student.rosetta.totalHours} h</strong> (no se descuentan de tus clases)</p>}
      {student?.rosetta?.plan === 'ilimitado' && <p className="rosetta-remaining">Rosetta ilimitado: cada hora se descuenta de tus horas de la semana</p>}
    </section>
  )
}
