export default function SelectionActionBar({ selectedSlots, studentHours, rosettaRemaining, formatHour, onConfirm, loading }) {
  const buttonLabel = loading ? 'Guardando...' : 'Confirmar'
  const available = rosettaRemaining === null || rosettaRemaining === undefined ? `de ${studentHours} disponibles` : `${studentHours} h de clase · ${rosettaRemaining} h de Rosetta`

  return <aside className={`action-bar${selectedSlots.length === 0 ? ' is-empty' : ''}`} aria-label="Resumen del horario seleccionado"><div className="selection-summary"><div className="selection-count"><strong>{selectedSlots.length} {selectedSlots.length === 1 ? 'hora' : 'horas'}</strong><span>{available}</span></div><div className="selection-list">{selectedSlots.length > 0 ? selectedSlots.map((slot) => <span className={slot.type === 'Rosetta' ? 'is-rosetta' : undefined} key={slot.id}>{slot.type === 'Rosetta' ? 'Rosetta · ' : ''}{slot.day} {formatHour(slot.hour)}</span>) : <span className="empty-selection">Selecciona tus horas en la lista</span>}</div></div><button className="confirm-button" disabled={selectedSlots.length < 1 || loading} onClick={onConfirm} type="button">{buttonLabel}</button></aside>
}
