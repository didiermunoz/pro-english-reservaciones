function SelectionList({ selectedSlots, formatHour }) {
  if (selectedSlots.length === 0) {
    return <span className="empty-selection">Selecciona tus primeros horarios en la tabla</span>
  }

  return selectedSlots.map((slot) => (
    <span key={slot.id}>{slot.day} {formatHour(slot.hour)}</span>
  ))
}

export default function SelectionActionBar({ selectedSlots, studentHours, formatHour, confirmed, onConfirm }) {
  const remainingHours = studentHours - selectedSlots.length
  const buttonLabel = confirmed ? 'Horario Confirmado' : remainingHours === 0 ? 'Confirmar Horario Semanal' : `Elige ${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'} más`

  return (
    <aside className="action-bar" aria-label="Resumen del horario seleccionado">
      <div className="selection-summary">
        <div className="selection-count">
          <strong>{selectedSlots.length}/{studentHours}</strong>
          <span>horas elegidas</span>
        </div>
        <div className="selection-list">
          <SelectionList selectedSlots={selectedSlots} formatHour={formatHour} />
        </div>
      </div>
      <button
        className="confirm-button"
        disabled={remainingHours !== 0 || confirmed}
        onClick={onConfirm}
        type="button"
      >
        {buttonLabel}
      </button>
    </aside>
  )
}
