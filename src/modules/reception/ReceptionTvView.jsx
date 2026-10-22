import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'
import './daily-room-assignments.css'

const getTodayKey = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const displayDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export default function ReceptionTvView() {
  const { token } = useStudent()
  const [date, setDate] = useState(getTodayKey)
  const [selectedHour, setSelectedHour] = useState('')
  const [summary, setSummary] = useState({ rooms: [], currentTime: '' })
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    let active = true
    const refresh = () => api.receptionTvSummary(token, date)
      .then((result) => {
        if (!active) return
        setSummary(result)
        setUpdatedAt(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
        setError('')
      })
      .catch((refreshError) => { if (active) setError(refreshError.message) })
    refresh()
    const interval = window.setInterval(refresh, 30000)
    return () => window.clearInterval(interval)
  }, [token, date])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen?.()
  }

  const availableHours = [...new Set(summary.rooms.flatMap((room) => room.blocks.map((block) => block.startTime)))].sort()
  const visibleRooms = summary.rooms
    .map((room) => ({
      ...room,
      blocks: room.blocks.filter((block) => !selectedHour || block.startTime === selectedHour),
    }))
    .filter((room) => room.blocks.length)

  return (
    <main className="reception-tv-page">
      <header className="tv-header">
        <div>
          <span className="tv-eyebrow">PRO ENGLISH ACADEMY / RECEPCIÓN</span>
          <h1>Asignación de salones</h1>
          <p>{displayDate(date)}{summary.currentTime ? ` · ${summary.currentTime}` : ''}</p>
        </div>
        <div className="tv-controls">
          <label>Fecha<input aria-label="Fecha para pantalla TV" type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelectedHour('') }} /></label>
          <label>Hora
            <select aria-label="Filtrar salones por hora" value={selectedHour} onChange={(event) => setSelectedHour(event.target.value)}>
              <option value="">Todas</option>
              {availableHours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
            </select>
          </label>
          <button type="button" onClick={toggleFullscreen}>Pantalla completa</button>
          <Link to="/recepcion/asignacion-diaria">Administrar</Link>
        </div>
      </header>

      {error && <p className="tv-error" role="alert">{error}</p>}
      {visibleRooms.length === 0 ? <section className="tv-empty"><strong>{selectedHour ? 'Sin clases para esta hora' : 'Sin asignaciones para este día'}</strong><span>{selectedHour ? 'Elige otra hora para consultar los salones.' : 'Recepción puede configurar salones, clases y alumnos desde Administración.'}</span></section> : (
        <div className="tv-room-grid">
          {visibleRooms.map((room) => {
            const currentBlock = room.blocks.find((block) => block.isCurrent)
            return <article className={`tv-room-card ${currentBlock ? 'is-active' : ''}`} key={room.id}>
              <header className="tv-room-title"><div><span>SALÓN</span><h2>{room.name}</h2></div><strong>{currentBlock ? 'EN CLASE' : `${room.blocks.length} BLOQUES`}</strong></header>
              <div className="tv-teachers">
                <p><span>Mañana</span><strong>{room.morningTeacher || 'Profesor por asignar'}</strong></p>
                <p><span>Tarde</span><strong>{room.afternoonTeacher || 'Profesor por asignar'}</strong></p>
              </div>
              <div className="tv-block-list">
                {room.blocks.map((block) => <section className={`tv-class-block ${block.isCurrent ? 'current-block' : ''}`} key={block.id}>
                  <div className="tv-block-time"><span>{block.startTime} - {block.endTime}</span>{block.isCurrent && <strong>AHORA</strong>}</div>
                  <h3>{block.lessonTitle}</h3>
                  <p className="tv-block-teacher">{block.teacher || 'Profesor por asignar'}</p>
                  <div className="tv-student-list">
                    {block.students.length ? block.students.map((student) => <span key={student.id}>{student.matricula || student.id}</span>) : <span>Sin alumnos asignados</span>}
                  </div>
                </section>)}
              </div>
            </article>
          })}
        </div>
      )}
      <footer className="tv-footer">Actualización automática cada 30 segundos · Última actualización: {updatedAt || 'consultando...'}</footer>
    </main>
  )
}
