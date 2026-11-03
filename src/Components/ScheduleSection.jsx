const STATUS_LABELS = {
  full: 'Lleno',
  booked: 'Reservado',
  selected: 'Elegido',
  unavailable: 'No disponible',
  available: 'Disponible',
}

const STATUS_SYMBOLS = {
  full: '–',
  booked: '✓',
  selected: '✓',
  unavailable: '—',
  available: '+',
}

function ScheduleGuide() {
  return (
    <div className="schedule-guide" aria-label="Pasos para agendar una clase">
      <span className="guide-step"><b>1</b><strong>Elige tus horas</strong></span>
      <span className="guide-arrow" aria-hidden="true">→</span>
      <span className="guide-step"><b>2</b><strong>Revisa tu selección</strong></span>
      <span className="guide-arrow" aria-hidden="true">→</span>
      <span className="guide-step"><b>3</b><strong>Confirma</strong></span>
    </div>
  )
}

function TimeRail({ scheduleHours, formatHour }) {
  return (
    <div className="time-rail">
      <div className="rail-heading">Hora</div>
      {scheduleHours.map((hour) => (
        <div className="rail-hour" key={hour}>
          {formatHour(hour)} - {formatHour(hour + 1)}
        </div>
      ))}
    </div>
  )
}

function DayColumn({ day, dateLabel, daySlots, scheduleHours, getSlotStatus, onSlotToggle }) {
  return <div className="day-column">
    <div className="day-heading"><strong>{day}<small>{dateLabel}</small></strong><span>{daySlots.length} bloques</span></div>
    <div className="slot-list">{scheduleHours.map((hour) => {
      const slot = daySlots.find((daySlot) => daySlot.hour === hour)
      const status = getSlotStatus(slot)
      return <button aria-label={`${day}, ${slot ? slot.time : 'No disponible'}`} aria-pressed={status === 'selected' || status === 'booked'} className={`time-slot ${status}`} disabled={status === 'full' || status === 'booked' || status === 'unavailable'} key={`${day}-${hour}`} onClick={() => onSlotToggle(slot)} type="button"><em className="slot-time">{slot ? slot.time : ''}</em><span aria-hidden="true">{STATUS_SYMBOLS[status]}</span><small>{STATUS_LABELS[status]}</small></button>
    })}</div>
  </div>
}

export default function ScheduleSection({ selectableDates, scheduleHours, slotsByDate, formatHour, getSlotStatus, onSlotToggle }) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = selectableDates[0]
  const headingDay = date.date.toDateString() === tomorrow.toDateString() ? 'Mañana' : date.day

  return <section className="schedule-section" aria-labelledby="schedule-title">
    <div className="schedule-header"><div><span className="eyebrow">PRÓXIMA FECHA DISPONIBLE</span><h2 id="schedule-title">{headingDay}</h2><p>{date.label}</p></div><div className="schedule-rule">{`Reservando para ${date.day} ${date.label}`}</div></div>
    <ScheduleGuide />
    <div className="schedule-scroll"><div className={`schedule-grid days-${selectableDates.length}`}><TimeRail scheduleHours={scheduleHours} formatHour={formatHour} />{selectableDates.map((date) => <DayColumn dateLabel={date.label} day={date.day} daySlots={slotsByDate[date.key]} getSlotStatus={getSlotStatus} key={date.key} onSlotToggle={onSlotToggle} scheduleHours={scheduleHours} />)}</div></div>
    <div className="schedule-legend" aria-label="Leyenda de disponibilidad"><span><i className="legend-dot available-dot" />Disponible</span><span><i className="legend-dot selected-dot" />Seleccionado / reservado</span><span><i className="legend-dot full-dot" />Sin cupo</span></div>
  </section>
}
