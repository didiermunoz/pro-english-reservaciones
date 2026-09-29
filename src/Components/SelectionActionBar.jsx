export default function SelectionActionBar({ selectedSlots, studentHours, formatHour, confirmed, onConfirm, loading }) {
  const remainingHours = studentHours - selectedSlots.length
  const buttonLabel = loading ? 'Guardando...' : confirmed ? 'Horario Confirmado' : studentHours === 0 ? 'Sin horas disponibles' : remainingHours === 0 ? 'Confirmar Horario Semanal' : `Elige ${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'} más`

  return <aside className="action-bar" aria-label="Resumen del horario seleccionado"><div className="selection-summary"><div className="selection-count"><strong>{selectedSlots.length}/{studentHours}</strong><span>horas elegidas</span></div><div className="selection-list">{selectedSlots.length > 0 ? selectedSlots.map((slot) => <span key={slot.id}>{slot.day} {formatHour(slot.hour)}</span>) : <span className="empty-selection">Selecciona tus horarios en la tabla</span>}</div></div><button className="confirm-button" disabled={remainingHours !== 0 || confirmed || selectedSlots.length === 0 || loading || studentHours === 0} onClick={onConfirm} type="button">{buttonLabel}</button></aside>
}
