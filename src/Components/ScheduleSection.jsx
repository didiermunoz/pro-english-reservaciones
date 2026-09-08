const statusLabels = {
  full: 'Lleno',
  selected: 'Elegido',
  unavailable: 'No disponible',
  available: 'Disponible',
}

const statusSymbols = {
  full: '×',
  selected: '✓',
  unavailable: '—',
  available: '+',
}

function ScheduleGuide() {
  return <div className="schedule-guide" aria-label="Pasos para agendar una clase"><span className="guide-step"><b>1</b><strong>Elige tus horarios</strong></span><span className="guide-arrow" aria-hidden="true">→</span><span className="guide-step"><b>2</b><strong>Revisa tu selección</strong></span><span className="guide-arrow" aria-hidden="true">→</span><span className="guide-step"><b>3</b><strong>Confirma 6 horas</strong></span></div>
}

function TimeRail({ scheduleHours, formatHour }) {
  return <div className="time-rail"><div className="rail-heading">Hora</div>{scheduleHours.map((hour) => <div className="rail-hour" key={hour}>{formatHour(hour)} - {formatHour(hour + 1)}</div>)}</div>
}

function DayColumn({ day, daySlots, scheduleHours, getSlotStatus, onSlotToggle, confirmed }) {
  return <div className="day-column">
    <div className="day-heading"><strong>{day}</strong><span>{daySlots.length} bloques</span></div>
    <div className="slot-list">{scheduleHours.map((hour) => {
      const slot = daySlots.find((daySlot) => daySlot.hour === hour)
      const status = getSlotStatus(slot)
      return <button aria-label={`${day}, ${slot ? slot.time : 'No disponible'}`} aria-pressed={status === 'selected'} className={`time-slot ${status}`} disabled={status === 'full' || status === 'unavailable' || confirmed} key={`${day}-${hour}`} onClick={() => onSlotToggle(slot)} type="button"><span>{statusSymbols[status]}</span><small>{statusLabels[status]}</small></button>
    })}</div>
  </div>
}

export default function ScheduleSection({ weekDays, scheduleHours, slotsByDay, formatHour, getSlotStatus, onSlotToggle, confirmed }) {
  return <section className="schedule-section" aria-labelledby="schedule-title">
    <div className="schedule-header"><div><span className="eyebrow">PLANIFICACIÓN FLEXIBLE</span><h2 id="schedule-title">Agenda tus Clases para la Semana</h2><p>Selecciona hasta 6 bloques disponibles. Cada bloque representa una hora de clase.</p></div><label className="week-picker"><span>Semana activa</span><select defaultValue="12-oct"><option value="12-oct">12 - 18 Oct 2026</option><option value="19-oct">19 - 25 Oct 2026</option></select></label></div>
    <ScheduleGuide />
    <div className="schedule-scroll"><div className="schedule-grid"><TimeRail scheduleHours={scheduleHours} formatHour={formatHour} />{weekDays.map((day) => <DayColumn confirmed={confirmed} day={day} daySlots={slotsByDay[day]} getSlotStatus={getSlotStatus} key={day} onSlotToggle={onSlotToggle} scheduleHours={scheduleHours} />)}</div></div>
    <div className="schedule-legend" aria-label="Leyenda de disponibilidad"><span><i className="legend-dot available-dot" />Disponible</span><span><i className="legend-dot selected-dot" />Seleccionado por ti</span><span><i className="legend-dot full-dot" />Sin cupo / Agotado</span></div>
  </section>
}
