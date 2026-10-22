import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'
import './daily-room-assignments.css'

const getTodayKey = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function withStudentIds(room) {
  return {
    ...room,
    blocks: room.blocks.map((block) => ({
      ...block,
      studentIds: block.students.map((student) => student.id),
    })),
  }
}

export default function DailyRoomAssignments() {
  const { token, user } = useStudent()
  const [date, setDate] = useState(getTodayKey)
  const [rooms, setRooms] = useState([])
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)

  const fetchDayData = useCallback(() => Promise.all([
        api.receptionDailyRoomAssignments(token, date),
        api.receptionStudents(token),
        api.receptionLessons(token),
      ]), [token, date])

  const loadDay = useCallback(async () => {
    try {
      const [dailyResult, studentResult, lessonResult] = await fetchDayData()
      setRooms((dailyResult.rooms || []).map(withStudentIds))
      setStudents(studentResult.students || [])
      setLessons(lessonResult.lessons || [])
    } catch (error) {
      setNotice(error.message)
      setNoticeIsError(true)
    } finally {
      setLoading(false)
    }
  }, [fetchDayData])

  useEffect(() => {
    let active = true
    fetchDayData()
      .then(([dailyResult, studentResult, lessonResult]) => {
        if (!active) return
        setRooms((dailyResult.rooms || []).map(withStudentIds))
        setStudents(studentResult.students || [])
        setLessons(lessonResult.lessons || [])
      })
      .catch((error) => {
        if (!active) return
        setNotice(error.message)
        setNoticeIsError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fetchDayData])

  const updateRoom = (roomId, updates) => {
    setRooms((current) => current.map((room) => room.id === roomId ? { ...room, ...updates } : room))
  }

  const updateBlock = (roomId, blockIndex, updates) => {
    setRooms((current) => current.map((room) => room.id !== roomId ? room : {
      ...room,
      blocks: room.blocks.map((block, index) => index === blockIndex ? { ...block, ...updates } : block),
    }))
  }

  const addBlock = (roomId) => {
    setRooms((current) => current.map((room) => room.id === roomId ? {
      ...room,
      blocks: [...room.blocks, { lessonId: '', startTime: '', endTime: '', studentIds: [] }],
    } : room))
  }

  const removeBlock = (roomId, blockIndex) => {
    setRooms((current) => current.map((room) => room.id !== roomId ? room : {
      ...room,
      blocks: room.blocks.filter((_, index) => index !== blockIndex),
    }))
  }

  const toggleStudent = (roomId, blockIndex, studentId, checked) => {
    const room = rooms.find((item) => item.id === roomId)
    const block = room?.blocks[blockIndex]
    if (!block) return
    const studentIds = checked
      ? [...block.studentIds, studentId]
      : block.studentIds.filter((id) => id !== studentId)
    updateBlock(roomId, blockIndex, { studentIds })
  }

  const saveDay = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    setNoticeIsError(false)
    try {
      const payload = rooms.map((room) => ({
        roomId: room.id,
        morningTeacher: room.morningTeacher,
        afternoonTeacher: room.afternoonTeacher,
        blocks: room.blocks.map((block) => ({
          lessonId: block.lessonId,
          startTime: block.startTime,
          endTime: block.endTime,
          studentIds: block.studentIds,
        })),
      }))
      const result = await api.saveReceptionDailyRoomAssignments(token, date, payload)
      setRooms((result.rooms || []).map(withStudentIds))
      setNotice(result.message || 'Asignaciones del día guardadas.')
      setNoticeIsError(false)
    } catch (error) {
      setNotice(error.message)
      setNoticeIsError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="daily-assignments-page">
      <header className="daily-assignments-header">
        <div>
          <p className="daily-eyebrow">RECEPCIÓN / OPERACIÓN DIARIA</p>
          <h1>Asignación diaria de salones</h1>
          <p>Organiza profesores, clases y asistentes para una fecha específica.</p>
        </div>
        <div className="daily-header-actions">
          <Link className="daily-secondary-action" to="/recepcion">Volver a Recepción</Link>
          <Link className="daily-primary-action" to="/recepcion/pantalla-tv">Abrir pantalla TV</Link>
        </div>
      </header>

      <div className="daily-toolbar">
        <label htmlFor="assignment-date">Fecha de asignación</label>
        <input id="assignment-date" type="date" value={date} onChange={(event) => { setLoading(true); setNotice(''); setDate(event.target.value) }} />
        <span>{user?.name}</span>
        <button type="button" onClick={() => { setLoading(true); setNotice(''); loadDay() }} disabled={loading}>{loading ? 'Consultando...' : 'Actualizar'}</button>
      </div>

      {notice && <p className={`daily-notice ${noticeIsError ? 'is-error' : 'is-success'}`} role={noticeIsError ? 'alert' : 'status'}>{notice}</p>}
      {loading ? <p className="daily-empty">Cargando asignaciones del día...</p> : rooms.length === 0 ? <p className="daily-empty">No hay salones registrados. Registra al menos un salón para crear asignaciones.</p> : (
        <form onSubmit={saveDay}>
          <div className="daily-room-list">
            {rooms.map((room) => (
              <section className="daily-room-card" key={room.id}>
                <div className="daily-room-heading">
                  <div><span>Salón</span><h2>{room.name}</h2></div>
                  <span className="daily-capacity">Aforo {room.capacity}</span>
                </div>
                <div className="daily-teacher-grid">
                  <label>Profesor de mañana
                    <input maxLength="100" value={room.morningTeacher} onChange={(event) => updateRoom(room.id, { morningTeacher: event.target.value })} placeholder="Nombre del profesor" />
                  </label>
                  <label>Profesor de tarde
                    <input maxLength="100" value={room.afternoonTeacher} onChange={(event) => updateRoom(room.id, { afternoonTeacher: event.target.value })} placeholder="Nombre del profesor" />
                  </label>
                </div>

                <div className="daily-block-heading">
                  <div><h3>Bloques del día</h3><span>Los alumnos se asignan a cada bloque y salón.</span></div>
                  <button type="button" className="daily-add-block" onClick={() => addBlock(room.id)}>Agregar bloque</button>
                </div>
                {room.blocks.length === 0 ? <p className="daily-no-blocks">Todavía no hay clases asignadas a este salón.</p> : room.blocks.map((block, index) => (
                  <fieldset className="daily-block" key={block.id || `${room.id}-new-${index}`}>
                    <legend>Bloque {index + 1}</legend>
                    <div className="daily-block-fields">
                      <label>Lección
                        <select required value={block.lessonId} onChange={(event) => updateBlock(room.id, index, { lessonId: event.target.value })}>
                          <option value="" disabled>Selecciona una lección</option>
                          {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.order}. {lesson.title}</option>)}
                        </select>
                      </label>
                      <label>Hora de inicio<input type="time" required value={block.startTime} onChange={(event) => updateBlock(room.id, index, { startTime: event.target.value })} /></label>
                      <label>Hora de fin<input type="time" required value={block.endTime} onChange={(event) => updateBlock(room.id, index, { endTime: event.target.value })} /></label>
                      <button type="button" className="daily-remove-block" onClick={() => removeBlock(room.id, index)}>Quitar bloque</button>
                    </div>
                    <div className="daily-attendees">
                      <span className="daily-field-label">Alumnos asistentes <small>({block.studentIds.length}/{room.capacity})</small></span>
                      {students.length === 0 ? <p className="daily-no-blocks">No hay estudiantes registrados.</p> : (
                        <div className="daily-student-options">
                          {students.map((student) => {
                            const selected = block.studentIds.includes(student.id)
                            const atCapacity = block.studentIds.length >= room.capacity
                            return <label key={student.id}>
                              <input type="checkbox" checked={selected} disabled={!selected && atCapacity} onChange={(event) => toggleStudent(room.id, index, student.id, event.target.checked)} />
                              <span>{student.name}<small>{student.matricula}</small></span>
                            </label>
                          })}
                        </div>
                      )}
                    </div>
                  </fieldset>
                ))}
              </section>
            ))}
          </div>
          <div className="daily-save-row"><span>Los cambios se guardan en la base de datos para la fecha seleccionada.</span><button className="daily-save-button" type="submit" disabled={saving || loading}>{saving ? 'Guardando...' : 'Guardar asignaciones del día'}</button></div>
        </form>
      )}
    </main>
  )
}
