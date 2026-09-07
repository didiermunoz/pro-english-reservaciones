import React, { useMemo, useState } from 'react'
import './HomePage.css'

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const studentHours = 6
const fullSlots = new Set(['Lunes-9', 'Martes-13', 'Miércoles-17', 'Jueves-8', 'Viernes-19', 'Sábado-11'])

const formatHour = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`
}

const createSlots = (day, startHour, endHour) => Array.from({ length: endHour - startHour }, (_, index) => {
  const hour = startHour + index
  return { id: `${day}-${hour}`, day, hour, time: `${formatHour(hour)} - ${formatHour(hour + 1)}` }
})

export default function HomePage() {
  const [selectedSlots, setSelectedSlots] = useState([])
  const [confirmed, setConfirmed] = useState(false)

  const slotsByDay = useMemo(() => weekDays.reduce((slots, day) => {
    slots[day] = createSlots(day, day === 'Sábado' ? 8 : 7, day === 'Sábado' ? 15 : 20)
    return slots
  }, {}), [])

  const toggleSlot = (slot) => {
    if (fullSlots.has(slot.id) || confirmed) return
    setSelectedSlots((currentSlots) => {
      if (currentSlots.some((currentSlot) => currentSlot.id === slot.id)) {
        return currentSlots.filter((currentSlot) => currentSlot.id !== slot.id)
      }
      return currentSlots.length < studentHours ? [...currentSlots, slot] : currentSlots
    })
  }

  const getSlotStatus = (slot) => {
    if (fullSlots.has(slot.id)) return 'full'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    return 'available'
  }

  return (
    <div className="student-portal">
      <header className="student-navbar">
        <a className="student-brand" href="/dashboard" aria-label="Flex English Academy, inicio">
          <span className="brand-mark" aria-hidden="true">⚡</span>
          <span>FLEX ENGLISH <strong>ACADEMY</strong></span>
        </a>
        <nav className="student-nav" aria-label="Navegación principal">
          <a className="active" href="/dashboard">Inicio / Agenda</a>
          <a href="/plan-de-estudios">Mi Plan de Estudios</a>
          <a href="/mis-clases">Mis Clases Confirmadas</a>
          <a href="/mi-contrato">Detalles de Contrato</a>
          <a href="/soporte">Contacto Recepción</a>
        </nav>
        <div className="student-account">
          <div className="student-avatar" aria-hidden="true">CM</div>
          <div className="student-identity"><strong>Carlos Mendoza</strong><span>ID: #ST-8092</span></div>
          <button className="logout-button" type="button">Cerrar Sesión</button>
        </div>
      </header>

      <main className="student-main">
        <section className="contract-hero" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <span className="eyebrow">PORTAL DEL ESTUDIANTE / AGENDA SEMANAL</span>
            <h1 id="welcome-title">Bienvenido de nuevo, Carlos</h1>
            <p>Selecciona tus horas de la semana. Recuerda que tus límites y modalidad están definidos por tu contrato físico.</p>
          </div>
          <div className="contract-details">
            <div className="section-heading compact-heading"><span>Resumen de contrato</span><span className="lock-icon" aria-label="Solo lectura">⌑</span></div>
            <div className="contract-grid">
              <div className="contract-item"><span>Vigencia del Curso</span><strong>12 Oct 2026 - 12 Abr 2027</strong></div>
              <div className="contract-item"><span>Modalidad Asignada</span><strong className="contract-chip">Presencial / En Línea - Híbrido</strong></div>
              <div className="contract-item"><span>Siguiente Clase Requerida</span><strong className="lesson-badge">Lección 4: Past Continuous</strong></div>
            </div>
          </div>
          <div className="hours-meter">
            <div className="meter-copy"><span>Horas semanales asignadas</span><strong><b>{selectedSlots.length}</b> de {studentHours} Horas</strong><small>{selectedSlots.length === studentHours ? 'Contrato semanal completo' : `Te restan ${studentHours - selectedSlots.length} horas por asignar`}</small></div>
            <div className="progress-ring" style={{ '--progress': `${(selectedSlots.length / studentHours) * 100}%` }}><div><strong>{selectedSlots.length}/{studentHours}</strong><span>hrs</span></div></div>
          </div>
        </section>

        <section className="schedule-section" aria-labelledby="schedule-title">
          <div className="schedule-header">
            <div><span className="eyebrow">PLANIFICACIÓN FLEXIBLE</span><h2 id="schedule-title">Agenda tus Clases para la Semana</h2><p>Selecciona hasta 6 bloques disponibles. Cada bloque representa una hora de clase.</p></div>
            <label className="week-picker"><span>Semana activa</span><select defaultValue="12-oct"><option value="12-oct">12 - 18 Oct 2026</option><option value="19-oct">19 - 25 Oct 2026</option></select></label>
          </div>
          <div className="schedule-scroll"><div className="schedule-grid">
            {weekDays.map((day) => <div className="day-column" key={day}>
              <div className="day-heading"><strong>{day}</strong><span>{slotsByDay[day].length} bloques</span></div>
              <div className="slot-list">{slotsByDay[day].map((slot) => {
                const status = getSlotStatus(slot)
                return <button className={`time-slot ${status}`} disabled={status === 'full' || confirmed} key={slot.id} onClick={() => toggleSlot(slot)} type="button"><span>{slot.time}</span><small>{status === 'full' ? 'Lleno' : status === 'selected' ? 'Seleccionado' : 'Disponible'}</small></button>
              })}</div>
            </div>)}
          </div></div>
          <div className="schedule-legend" aria-label="Leyenda de disponibilidad"><span><i className="legend-dot available-dot" />Disponible</span><span><i className="legend-dot selected-dot" />Seleccionado por ti</span><span><i className="legend-dot full-dot" />Sin cupo / Agotado</span></div>
        </section>
      </main>

      {selectedSlots.length > 0 && <aside className="action-bar" aria-label="Resumen del horario seleccionado">
        <div className="selection-summary"><div className="selection-count"><strong>{selectedSlots.length}/{studentHours}</strong><span>horas elegidas</span></div><div className="selection-list">{selectedSlots.map((slot) => <span key={slot.id}>{slot.day} {formatHour(slot.hour)}</span>)}</div></div>
        <button className="confirm-button" disabled={selectedSlots.length !== studentHours || confirmed} onClick={() => setConfirmed(true)} type="button">{confirmed ? 'Horario Confirmado' : 'Confirmar Horario Semanal'}</button>
      </aside>}
    </div>
  )
}
