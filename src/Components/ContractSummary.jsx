import { useState } from 'react'
import { getLevel } from '../Services/levels'
import { formatModality } from '../Services/scheduleUtils'

const formatContractDate = (date) => (
  date ? new Date(`${date}T00:00:00`).toLocaleDateString('es-MX') : 'No disponible'
)

export default function ContractSummary({ student }) {
  const [expanded, setExpanded] = useState(false)
  const contract = student?.contract
  const level = student?.level ? getLevel(student.level) : null

  return (
    <section className="contract-summary" aria-label="Resumen del contrato">
      <button
        className="contract-summary-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls="contract-summary-content"
        onClick={() => setExpanded((current) => !current)}
      >
        Ver resumen de contrato
      </button>
      <div
        className={`contract-summary-content${expanded ? ' is-open' : ''}`}
        id="contract-summary-content"
        aria-hidden={!expanded}
      >
        {expanded && (contract ? (
            <dl>
              <div><dt>Vigencia del curso</dt><dd>{formatContractDate(contract.startDate)} – {formatContractDate(contract.endDate)}</dd></div>
              <div><dt>Modalidad</dt><dd>{formatModality(contract.modality)}</dd></div>
              <div><dt>Matrícula</dt><dd>{student?.matricula || 'No disponible'}</dd></div>
              <div><dt>Nivel</dt><dd>{level ? `${student.level} · ${level.name}` : 'Sin asignar'}</dd></div>
              <div><dt>Horas semanales</dt><dd>{contract.weeklyHours ?? 'No disponible'}</dd></div>
            </dl>
          ) : <p>Sin contrato activo</p>)}
      </div>
    </section>
  )
}
