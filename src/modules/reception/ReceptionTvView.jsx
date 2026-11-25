import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'
import { getReceptionTvTokenExpiration, getStoredReceptionTvToken, RECEPTION_TV_TOKEN_STORAGE_KEY } from './receptionTvToken'
import './reception-tv.css'

const getTodayKey = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const displayDate = (date) => {
  const text = new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const formatHour = (value) => {
  if (!value) return ''
  const hour = Number(value.slice(0, 2))
  return `${hour % 12 || 12}:00 ${hour >= 12 ? 'p.m.' : 'a.m.'}`
}

// Tamaño de letra según cuántos salones hay que mostrar a la vez.
const densityFor = (count) => (count <= 2 ? 'xl' : count <= 4 ? 'lg' : count <= 6 ? 'md' : 'sm')
// Columnas para que las tarjetas queden parejas: 4 → 2×2, 5–6 → 3×2, 7–8 → 4×2, 9 → 3×3.
const columnsFor = (count) => (count <= 3 ? count : count === 4 ? 2 : count <= 6 ? 3 : count === 9 ? 3 : 4)

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return <time className="tvs-clock" dateTime={now.toISOString()}>{now.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}</time>
}

export default function ReceptionTvView({ onTokenIssued }) {
  const { token } = useStudent()
  const [date, setDate] = useState(getTodayKey)
  const [tvToken, setTvToken] = useState(getStoredReceptionTvToken)
  const [selectedHour, setSelectedHour] = useState('')
  const [summary, setSummary] = useState({ rooms: [], hours: [], hour: null })
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const gridRef = useRef(null)

  useEffect(() => {
    const storedTvToken = getStoredReceptionTvToken()
    if (storedTvToken) return undefined
    if (!token) return undefined
    let active = true
    api.receptionTvToken(token)
      .then((result) => {
        if (!active) return
        const expiresAt = getReceptionTvTokenExpiration(result.token)
        if (!expiresAt) {
          setError('No fue posible verificar la vigencia del token de la pantalla.')
          return
        }
        localStorage.setItem(RECEPTION_TV_TOKEN_STORAGE_KEY, JSON.stringify({ token: result.token, expiresAt }))
        setTvToken(result.token)
        onTokenIssued()
      })
      .catch((tokenError) => { if (active) setError(tokenError.message) })
    return () => { active = false }
  }, [token, onTokenIssued])

  useEffect(() => {
    if (!tvToken) return undefined
    let active = true
    const refresh = () => api.receptionTvSummary(tvToken, date, selectedHour)
      .then((result) => {
        if (!active) return
        setSummary(result)
        setUpdatedAt(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
        setError('')
      })
      .catch((refreshError) => {
        if (!active) return
        if (refreshError.status === 401) {
          localStorage.removeItem(RECEPTION_TV_TOKEN_STORAGE_KEY)
          setTvToken('')
          setError('El token de la pantalla dejó de ser válido. Recepción debe volver a abrir la pantalla.')
          return
        }
        setError(refreshError.message)
      })
    refresh()
    // En modo automático la hora cambia sola (desde el minuto 40 muestra la siguiente clase).
    const interval = window.setInterval(refresh, 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [tvToken, date, selectedHour])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen?.()
  }

  const rooms = summary.rooms || []
  // Ajusta el tamaño del texto hasta que todas las matrículas quepan en su tarjeta (sin cortes en ninguna TV).
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return undefined
    const fit = () => {
      let scale = 1
      grid.style.setProperty('--tvs-scale', scale)
      const overflowing = () => [...grid.children].some((card) => card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1)
      while (scale > 0.45 && overflowing()) {
        scale = Math.round((scale - 0.05) * 100) / 100
        grid.style.setProperty('--tvs-scale', scale)
      }
    }
    fit()
    window.addEventListener('resize', fit)
    document.addEventListener('fullscreenchange', fit)
    return () => {
      window.removeEventListener('resize', fit)
      document.removeEventListener('fullscreenchange', fit)
    }
  }, [summary, isFullscreen])

  const studentCount = rooms.reduce((total, room) => total + room.students.length, 0)

  return (
    <main className={`tvs-page${isFullscreen ? ' is-fullscreen' : ''}`}>
      <header className="tvs-header">
        <div className="tvs-title">
          <span className="tvs-eyebrow">PRO ENGLISH ACADEMY · ¿A QUÉ SALÓN VOY?</span>
          <h1>{summary.hour ? <>Clase de las <strong>{formatHour(summary.hour)}</strong></> : 'Sin clases'}</h1>
          <p>{displayDate(date)}{summary.hour && !summary.isCurrentHour && date === getTodayKey() && !selectedHour ? ' · Próxima clase' : ''}</p>
        </div>
        <LiveClock />
        <div className="tvs-controls" aria-label="Controles de la pantalla">
          <label>Fecha<input type="date" value={date} onChange={(event) => { setDate(event.target.value || getTodayKey()); setSelectedHour('') }} /></label>
          <label>Hora
            <select value={selectedHour} onChange={(event) => setSelectedHour(event.target.value)}>
              <option value="">Automática</option>
              {(summary.hours || []).map((hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
            </select>
          </label>
          <button type="button" onClick={toggleFullscreen}>{isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</button>
          <Link to="/recepcion/asignacion-diaria">Administrar</Link>
        </div>
      </header>

      {error && <p className="tvs-error" role="alert">{error}</p>}
      {rooms.length === 0 ? (
        <section className="tvs-empty">
          <strong>{summary.hour ? `Aún no hay salones asignados para las ${formatHour(summary.hour)}` : 'No hay clases este día'}</strong>
          <span>Si tienes clase, pregunta en recepción.</span>
        </section>
      ) : (
        <div ref={gridRef} className={`tvs-grid density-${densityFor(rooms.length)}`} style={{ '--tvs-columns': columnsFor(rooms.length) }}>
          {rooms.map((room) => (
            <article className={`tvs-room${room.isRosetta ? ' is-rosetta' : ''}`} key={`${room.isRosetta ? 'r' : 'c'}-${room.id}`}>
              <header className="tvs-room-header">
                <span className="tvs-room-label">{room.isRosetta ? 'ROSETTA' : 'SALÓN'}</span>
                <h2>{room.name}</h2>
              </header>
              <p className="tvs-teacher"><span>Maestro</span><strong>{room.isRosetta ? (room.teacher && room.teacher !== room.name ? room.teacher : 'Rosetta') : room.teacher || 'Por asignar'}</strong></p>
              {room.lessonTitle && !room.isRosetta && <p className="tvs-lesson">{room.lessonTitle}</p>}
              <ul className="tvs-students" aria-label={`Matrículas en ${room.name}`}>
                {room.students.map((student) => <li key={student.id}>{student.matricula}</li>)}
              </ul>
            </article>
          ))}
        </div>
      )}
      <footer className="tvs-footer">
        <span>{studentCount} {studentCount === 1 ? 'alumno' : 'alumnos'} · {rooms.length} {rooms.length === 1 ? 'salón' : 'salones'}</span>
        <span>Se actualiza sola cada 30 segundos · Última actualización {updatedAt || '...'}</span>
      </footer>
    </main>
  )
}
