export default function SelectionActionBar({ selectedSlots, studentHours, formatHour, onConfirm, loading }) {
  const buttonLabel = loading ? 'Guardando...' : studentHours === 0 ? 'Sin horas disponibles' : 'Confirmar'

  return <aside className={`action-bar${selectedSlots.length === 0 ? ' is-empty' : ''}`} aria-label="Resumen del horario seleccionado"><div className="selection-summary"><div className="selection-count"><strong>{selectedSlots.length} {selectedSlots.length === 1 ? 'hora' : 'horas'}</strong><span>de {studentHours} disponibles</span></div><div className="selection-list">{selectedSlots.length > 0 ? selectedSlots.map((slot) => <span key={slot.id}>{slot.day} {formatHour(slot.hour)}</span>) : <span className="empty-selection">Selecciona tus horas en la lista</span>}</div></div><button className="confirm-button" disabled={selectedSlots.length < 1 || loading || studentHours === 0} onClick={onConfirm} type="button">{buttonLabel}</button></aside>
}
