import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../Services/api'
import { getLevel } from '../../Services/levels'
import { useStudent } from '../../Services/useStudent'
import './daily-room-assignments.css'
import './hourly-room-assignments.css'

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`

// Mismo horario que la API: lunes a viernes 7–21 h, sábado 8–15 h, domingo sin clases.
const getClassHours = (dateKey) => {
  const day = new Date(`${dateKey}T12:00:00`).getDay()
  if (day === 0) return []
  const [start, end] = day === 6 ? [8, 15] : [7, 21]
  return Array.from({ length: end - start }, (_, index) => start + index)
}

// Por defecto, la siguiente hora: a las 12:50 se acomoda a quienes tienen clase a la 1.
const getDefaultHour = (dateKey) => {
  const hours = getClassHours(dateKey)
  if (!hours.length) return null
  if (dateKey !== toDateKey(new Date())) return hours[0]
  const next = new Date().getHours() + 1
  return Math.min(Math.max(next, hours[0]), hours[hours.length - 1])
}

const studentTitle = (student) => `${student.name}${student.level ? ` · Nivel ${student.level} (${getLevel(student.level)?.name || ''})` : ''}`

function StudentChip({ student, selected, onToggle, onRemove, draggable }) {
  const warning = student.hasReservation === false
  return (
    <span className={`hourly-chip${selected ? ' is-selected' : ''}${warning ? ' is-warning' : ''}`} title={warning ? `${studentTitle(student)} — ya no tiene reserva a esta hora` : studentTitle(student)}>
      <button
        type="button"
        className="hourly-chip-main"
        aria-pressed={onToggle ? selected : undefined}
        draggable={draggable}
        onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(student.id)); event.dataTransfer.effectAllowed = 'move' }}
        onClick={onToggle}
      >
        <strong>{student.matricula}</strong>
        {student.level && <small className="reception-level-badge" data-level={student.level}>{student.level}</small>}
      </button>
      {onRemove && <button type="button" className="hourly-chip-remove" aria-label={`Quitar ${student.matricula} del salón`} onClick={onRemove}>×</button>}
    </span>
  )
}

export default function DailyRoomAssignments() {
  const { token, user } = useStudent()
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [hour, setHour] = useState(() => getDefaultHour(toDateKey(new Date())))
  const [rooms, setRooms] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [rosettaRooms, setRosettaRooms] = useState([])
  const [lessons, setLessons] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [dropTarget, setDropTarget] = useState(null)
  const hours = useMemo(() => getClassHours(date), [date])

  const applyData = (result) => {
    setRooms(result.rooms || [])
    setUnassigned(result.unassigned || [])
    setRosettaRooms(result.rosettaRooms || [])
    setLessons(result.lessons || [])
    setSelectedIds([])
    setDirty(false)
  }

  const loadHour = useCallback(async () => {
    if (hour === null) { setLoading(false); return }
    try {
      applyData(await api.receptionHourlyAssignments(token, date, hour))
    } catch (error) {
      setNotice(error.message)
      setNoticeIsError(true)
    } finally {
      setLoading(false)
    }
  }, [token, date, hour])

  useEffect(() => {
    if (hour === null) return undefined
    let active = true
    api.receptionHourlyAssignments(token, date, hour)
      .then((result) => { if (active) applyData(result) })
      .catch((error) => {
        if (!active) return
        setNotice(error.message)
        setNoticeIsError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, date, hour])

  // Refresca cada minuto para ver reservas nuevas, solo si no hay cambios sin guardar.
  useEffect(() => {
    if (dirty) return undefined
    const interval = window.setInterval(loadHour, 60000)
    return () => window.clearInterval(interval)
  }, [dirty, loadHour])

  const confirmDiscard = () => !dirty || window.confirm('Hay cambios sin guardar en esta hora. ¿Descartarlos?')
  const changeDate = (value) => {
    if (!value || !confirmDiscard()) return
    setNotice('')
    setLoading(true)
    setDate(value)
    setHour(getDefaultHour(value))
  }
  const changeHour = (value) => {
    if (!confirmDiscard()) return
    setNotice('')
    setLoading(true)
    setHour(Number(value))
  }
  const toggleSelected = (studentId) => {
    setSelectedIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId])
  }
  const placeStudents = (roomId, studentIds) => {
    const room = rooms.find((item) => item.id === roomId)
    if (!room || !studentIds.length) return
    const free = room.capacity - room.students.length
    if (free <= 0) {
      setNotice(`${room.name} ya está lleno (aforo ${room.capacity}).`)
      setNoticeIsError(true)
      return
    }
    const moving = unassigned.filter((student) => studentIds.includes(student.id)).slice(0, free)
    if (moving.length < studentIds.length) {
      setNotice(`Solo cupieron ${moving.length} en ${room.name} (aforo ${room.capacity}). El resto sigue en la barra.`)
      setNoticeIsError(true)
    } else {
      setNotice('')
    }
    const movingIds = moving.map((student) => student.id)
    setRooms((current) => current.map((item) => item.id === roomId ? { ...item, students: [...item.students, ...moving] } : item))
    setUnassigned((current) => current.filter((student) => !movingIds.includes(student.id)))
    setSelectedIds((current) => current.filter((id) => !movingIds.includes(id)))
    setDirty(true)
  }

  const removeStudent = (roomId, student) => {
    setRooms((current) => current.map((item) => item.id === roomId ? { ...item, students: item.students.filter((s) => s.id !== student.id) } : item))
    // Solo regresan a la barra quienes tienen reserva a esta hora.
    if (student.hasReservation !== false) setUnassigned((current) => [...current, student].sort((a, b) => String(a.matricula).localeCompare(String(b.matricula), 'es', { numeric: true })))
    setDirty(true)
  }

  const moveBetweenRooms = (studentId, targetRoomId) => {
    const source = rooms.find((room) => room.students.some((student) => student.id === studentId))
    const target = rooms.find((room) => room.id === targetRoomId)
    if (!source || !target || source.id === target.id) return
    if (target.students.length >= target.capacity) {
      setNotice(`${target.name} ya está lleno (aforo ${target.capacity}).`)
      setNoticeIsError(true)
      return
    }
    const student = source.students.find((item) => item.id === studentId)
    setRooms((current) => current.map((room) => {
      if (room.id === source.id) return { ...room, students: room.students.filter((item) => item.id !== studentId) }
      if (room.id === target.id) return { ...room, students: [...room.students, student] }
      return room
    }))
    setDirty(true)
  }

  const handleDrop = (event, roomId) => {
    event.preventDefault()
    setDropTarget(null)
    const studentId = Number(event.dataTransfer.getData('text/plain'))
    if (!studentId) return
    if (unassigned.some((student) => student.id === studentId)) {
      placeStudents(roomId, selectedIds.includes(studentId) ? selectedIds : [studentId])
    } else {
      moveBetweenRooms(studentId, roomId)
    }
  }

  const updateRoom = (roomId, updates) => {
    setRooms((current) => current.map((room) => room.id === roomId ? { ...room, ...updates } : room))
    setDirty(true)
  }

  const saveHour = async () => {
    setSaving(true)
    setNotice('')
    try {
      const payload = rooms.map((room) => ({
        roomId: room.id,
        teacher: room.teacher || '',
        lessonId: room.lessonId || null,
        studentIds: room.students.map((student) => student.id),
      }))
      const result = await api.saveReceptionHourlyAssignments(token, date, hour, payload)
      setNotice(`${result.message} La pantalla TV se actualizará en menos de 30 segundos.`)
      setNoticeIsError(false)
      applyData(await api.receptionHourlyAssignments(token, date, hour))
    } catch (error) {
      setNotice(error.message)
      setNoticeIsError(true)
    } finally {
      setSaving(false)
    }
  }

  const shiftLabel = hour >= 13 ? 'tarde' : 'mañana'
  const assignedCount = rooms.reduce((total, room) => total + room.students.length, 0)

  return (
    <main className="daily-assignments-page hourly-page">
      <header className="daily-assignments-header">
        <div>
          <p className="daily-eyebrow">RECEPCIÓN / OPERACIÓN DIARIA</p>
          <h1>Asignación de salones por hora</h1>
          <p>Acomoda en los salones a los alumnos que tienen clase en la hora elegida. Selecciona matrículas y pulsa «Colocar aquí», o arrástralas al salón.</p>
        </div>
        <div className="daily-header-actions">
          <Link className="daily-secondary-action" to="/recepcion">Volver a Recepción</Link>
          <Link className="daily-primary-action" to="/recepcion/pantalla-tv">Abrir pantalla TV</Link>
        </div>
      </header>

      <div className="daily-toolbar">
        <label htmlFor="assignment-date">Fecha</label>
        <input id="assignment-date" type="date" value={date} onChange={(event) => changeDate(event.target.value)} />
        <label htmlFor="assignment-hour">Hora de clase</label>
        <select id="assignment-hour" value={hour ?? ''} disabled={!hours.length} onChange={(event) => changeHour(event.target.value)}>
          {hours.length ? hours.map((value) => <option key={value} value={value}>{hourLabel(value)} – {hourLabel(value + 1)}</option>) : <option value="">Sin clases (domingo)</option>}
        </select>
        <span>{user?.name}</span>
        <button type="button" onClick={() => { if (confirmDiscard()) { setLoading(true); setNotice(''); loadHour() } }} disabled={loading}>{loading ? 'Consultando...' : 'Actualizar'}</button>
      </div>

      {notice && <p className={`daily-notice ${noticeIsError ? 'is-error' : 'is-success'}`} role={noticeIsError ? 'alert' : 'status'}>{notice}</p>}
      {hour === null ? <p className="daily-empty">No hay clases ese día.</p> : loading ? <p className="daily-empty">Cargando asignaciones...</p> : <>
        <section className="hourly-pool" aria-labelledby="hourly-pool-title">
          <div className="hourly-pool-heading">
            <h2 id="hourly-pool-title">Con clase a las {hourLabel(hour)} · sin salón <span className="hourly-count">{unassigned.length}</span></h2>
            <div className="hourly-pool-actions">
              <button type="button" disabled={!unassigned.length} onClick={() => setSelectedIds(selectedIds.length === unassigned.length ? [] : unassigned.map((student) => student.id))}>
                {selectedIds.length === unassigned.length && unassigned.length ? 'Quitar selección' : 'Seleccionar todos'}
              </button>
              {selectedIds.length > 0 && <span>{selectedIds.length} seleccionados</span>}
            </div>
          </div>
          {unassigned.length === 0
            ? <p className="hourly-pool-empty">{assignedCount ? 'Todos los alumnos de esta hora ya tienen salón.' : 'Nadie tiene clase reservada a esta hora.'}</p>
            : <div className="hourly-chip-list">{unassigned.map((student) => <StudentChip key={student.id} student={student} draggable selected={selectedIds.includes(student.id)} onToggle={() => toggleSelected(student.id)} />)}</div>}
        </section>

        {rooms.length === 0 ? <p className="daily-empty">No hay salones registrados. Regístralos en Recepción → Salones.</p> : (
          <div className="hourly-room-grid">
            {rooms.map((room) => {
              const full = room.students.length >= room.capacity
              return (
                <section
                  key={room.id}
                  className={`hourly-room${dropTarget === room.id ? ' is-drop-target' : ''}${full ? ' is-full' : ''}`}
                  aria-labelledby={`room-${room.id}-title`}
                  onDragOver={(event) => { event.preventDefault(); setDropTarget(room.id) }}
                  onDragLeave={() => setDropTarget((current) => current === room.id ? null : current)}
                  onDrop={(event) => handleDrop(event, room.id)}
                >
                  <header className="hourly-room-heading">
                    <h2 id={`room-${room.id}-title`}>{room.name}</h2>
                    <span className={`hourly-capacity${full ? ' is-full' : ''}`}>{room.students.length}/{room.capacity}</span>
                  </header>
                  <div className="hourly-room-fields">
                    <label>Maestro ({shiftLabel})<input maxLength="100" value={room.teacher} onChange={(event) => updateRoom(room.id, { teacher: event.target.value })} placeholder="Nombre del maestro" /></label>
                    <label>Lección (opcional)
                      <select value={room.lessonId || ''} onChange={(event) => updateRoom(room.id, { lessonId: event.target.value ? Number(event.target.value) : null })}>
                        <option value="">Sin lección</option>
                        {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.order}. {lesson.title}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="hourly-chip-list hourly-room-students">
                    {room.students.length ? room.students.map((student) => <StudentChip key={student.id} student={student} draggable onRemove={() => removeStudent(room.id, student)} />) : <span className="hourly-room-empty">Sin alumnos</span>}
                  </div>
                  <button type="button" className="hourly-place-button" disabled={!selectedIds.length || full} onClick={() => placeStudents(room.id, selectedIds)}>
                    {full ? 'Salón lleno' : selectedIds.length ? `Colocar aquí (${selectedIds.length})` : 'Selecciona matrículas arriba'}
                  </button>
                </section>
              )
            })}
          </div>
        )}

        {rosettaRooms.map((room) => (
          <section key={room.id} className="hourly-rosetta" aria-label={`Rosetta a las ${hourLabel(hour)}`}>
            <header className="hourly-room-heading"><h2>{/rosetta/i.test(room.name) ? room.name : `${room.name} · Rosetta`}</h2><span className="hourly-capacity">{room.students.length}/{room.capacity}</span></header>
            <p>Los alumnos de Rosetta van directo a este salón (se muestran en la pantalla TV automáticamente).</p>
            <div className="hourly-chip-list">{room.students.length ? room.students.map((student) => <StudentChip key={student.id} student={student} />) : <span className="hourly-room-empty">Nadie reservó Rosetta a esta hora</span>}</div>
          </section>
        ))}

        <div className="daily-save-row">
          <span>{dirty ? 'Tienes cambios sin guardar.' : `Asignación de las ${hourLabel(hour)} sin cambios pendientes.`}</span>
          <button className="daily-save-button" type="button" onClick={saveHour} disabled={saving || !dirty}>{saving ? 'Guardando...' : `Guardar asignación de las ${hourLabel(hour)}`}</button>
        </div>
      </>}
    </main>
  )
}
