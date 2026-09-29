import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../Services/api'
import { useStudent } from '../../Services/useStudent'
import './reception.css'
import './reception-api.css'

const todayKey = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const emptyForm = { matricula: '', name: '' }
const emptyRoomForm = { name: '', morningTeacher: '', afternoonTeacher: '', capacity: 10 }
const emptyLessonForm = { order: '', title: '', type: 'Leccion' }

export default function Reception() {
  const navigate = useNavigate()
  const { token, user, logout } = useStudent()
  const [tab, setTab] = useState('students')
  const [students, setStudents] = useState([])
  const [reservations, setReservations] = useState([])
  const [rooms, setRooms] = useState([])
  const [lessons, setLessons] = useState([])
  const [date, setDate] = useState(todayKey)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notice, setNotice] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roomForm, setRoomForm] = useState(emptyRoomForm)
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [pendingRoomDelete, setPendingRoomDelete] = useState(null)
  const [lessonForm, setLessonForm] = useState(emptyLessonForm)
  const [editingLessonId, setEditingLessonId] = useState(null)
  const [pendingLessonDelete, setPendingLessonDelete] = useState(null)

  const loadStudents = useCallback(async () => {
    const result = await api.receptionStudents(token)
    setStudents(result.students || [])
  }, [token])

  const loadReservations = useCallback(async () => {
    const result = await api.receptionReservations(token, date)
    setReservations(result.reservations || [])
  }, [token, date])

  const loadRooms = useCallback(async () => {
    const result = await api.receptionRooms(token)
    setRooms(result.rooms || [])
  }, [token])

  const loadLessons = useCallback(async () => {
    const result = await api.receptionLessons(token)
    setLessons(result.lessons || [])
  }, [token])

  const reload = useCallback(async () => {
    try {
      await Promise.all([loadStudents(), loadReservations(), loadRooms(), loadLessons()])
    } catch (error) {
      setNotice(error.message)
    } finally {
      setLoading(false)
    }
  }, [loadStudents, loadReservations, loadRooms, loadLessons])

  useEffect(() => {
    let active = true
    Promise.all([api.receptionStudents(token), api.receptionReservations(token, date), api.receptionRooms(token), api.receptionLessons(token)])
      .then(([studentResult, reservationResult, roomResult, lessonResult]) => {
        if (!active) return
        setStudents(studentResult.students || [])
        setReservations(reservationResult.reservations || [])
        setRooms(roomResult.rooms || [])
        setLessons(lessonResult.lessons || [])
      })
      .catch((error) => { if (active) setNotice(error.message) })
      .finally(() => { if (active) setLoading(false) })
    const interval = window.setInterval(() => {
      Promise.all([loadStudents(), loadReservations(), loadRooms(), loadLessons()]).catch((error) => setNotice(error.message))
    }, 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [token, date, loadStudents, loadReservations, loadRooms, loadLessons])

  const filteredStudents = students.filter((student) => (
    `${student.name} ${student.matricula}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ))
  const filteredReservations = reservations.filter((reservation) => (
    `${reservation.student} ${reservation.studentId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ))
  const filteredLessons = lessons.filter((lesson) => (
    `${lesson.title} ${lesson.order} ${lesson.type}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ))

  const startEdit = (student) => {
    setEditingId(student.id)
    setForm({ matricula: student.matricula, name: student.name })
    setNotice('')
    setTemporaryPassword('')
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const submitStudent = async (event) => {
    event.preventDefault()
    if (!form.matricula.trim() || !form.name.trim()) {
      setNotice('Campos obligatorios incompletos.')
      return
    }
    setSaving(true)
    setNotice('')
    setTemporaryPassword('')
    try {
      if (editingId) {
        await api.updateStudent(token, editingId, { matricula: form.matricula.trim(), name: form.name.trim() })
        setNotice('Datos del estudiante actualizados.')
      } else {
        const result = await api.createStudent(token, { matricula: form.matricula.trim(), name: form.name.trim() })
        setTemporaryPassword(result.temporaryPassword)
        setNotice('Estudiante registrado. Entrega esta contraseña temporal para su primer acceso:')
      }
      resetForm()
      await Promise.all([loadStudents(), loadReservations()])
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteStudent = async () => {
    if (!pendingDelete) return
    setSaving(true)
    setNotice('')
    try {
      await api.deleteStudent(token, pendingDelete.id)
      setPendingDelete(null)
      setNotice('Estudiante eliminado.')
      await Promise.all([loadStudents(), loadReservations()])
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateReservationStatus = async (reservation, status) => {
    setSaving(true)
    setNotice('')
    try {
      await api.updateReceptionReservation(token, reservation.id, status)
      await Promise.all([loadStudents(), loadReservations()])
      setNotice('Estado de asistencia actualizado.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const editRoom = (room) => {
    setEditingRoomId(room.id)
    setRoomForm({ name: room.name, morningTeacher: room.morningTeacher, afternoonTeacher: room.afternoonTeacher, capacity: room.capacity })
  }

  const saveRoom = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    try {
      const payload = { ...roomForm, capacity: Number(roomForm.capacity) }
      if (editingRoomId) await api.updateRoom(token, editingRoomId, payload)
      else await api.createRoom(token, payload)
      setRoomForm(emptyRoomForm)
      setEditingRoomId(null)
      setNotice(editingRoomId ? 'Salón actualizado.' : 'Salón registrado.')
      await loadRooms()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteRoom = async () => {
    if (!pendingRoomDelete) return
    setSaving(true)
    try {
      await api.deleteRoom(token, pendingRoomDelete.id)
      setPendingRoomDelete(null)
      setNotice('Salón eliminado.')
      await loadRooms()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const editLesson = (lesson) => {
    setEditingLessonId(lesson.id)
    setLessonForm({ order: lesson.order, title: lesson.title, type: lesson.type })
  }

  const saveLesson = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    try {
      const payload = { ...lessonForm, order: Number(lessonForm.order) }
      if (editingLessonId) await api.updateLesson(token, editingLessonId, payload)
      else await api.createLesson(token, payload)
      setLessonForm(emptyLessonForm)
      setEditingLessonId(null)
      setNotice(editingLessonId ? 'Lección actualizada.' : 'Lección registrada.')
      await loadLessons()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteLesson = async () => {
    if (!pendingLessonDelete) return
    setSaving(true)
    try {
      await api.deleteLesson(token, pendingLessonDelete.id)
      setPendingLessonDelete(null)
      setNotice('Lección eliminada.')
      await loadLessons()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="reception-workspace">
      <header className="reception-header">
        <div><p className="eyebrow">GESTIÓN ACADÉMICA</p><h1>Recepción</h1><p>Sesión: {user.name}</p></div>
        <button type="button" className="reception-logout" onClick={handleLogout}>Cerrar sesión</button>
      </header>

      <nav className="reception-tabs" aria-label="Módulos de recepción">
        <button className={tab === 'students' ? 'active' : ''} type="button" onClick={() => setTab('students')}>Estudiantes <span>{students.length}</span></button>
        <button className={tab === 'reservations' ? 'active' : ''} type="button" onClick={() => setTab('reservations')}>Reservas <span>{reservations.length}</span></button>
        <button className={tab === 'rooms' ? 'active' : ''} type="button" onClick={() => setTab('rooms')}>Salones <span>{rooms.length}</span></button>
        <button className={tab === 'lessons' ? 'active' : ''} type="button" onClick={() => setTab('lessons')}>Lecciones <span>{lessons.length}</span></button>
      </nav>

      {notice && <div className="reception-notice" role="status">{notice}{temporaryPassword && <strong className="temporary-password">{temporaryPassword}</strong>}</div>}

      <section className="reception-panel">
        <div className="reception-toolbar">
          <label className="reception-search">Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o matrícula" /></label>
          {tab === 'reservations' && <label className="reception-date">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>}
          <button type="button" className="reception-refresh" disabled={loading} onClick={() => { setLoading(true); setNotice(''); reload() }}>{loading ? 'Consultando...' : 'Actualizar datos'}</button>
        </div>

        {tab === 'students' ? <div className="reception-management-grid">
          <section className="reception-list-section">
            <div className="reception-section-heading"><h2>Estudiantes registrados</h2><span>{filteredStudents.length} resultados</span></div>
            {loading ? <p className="reception-empty">Cargando estudiantes...</p> : filteredStudents.length === 0 ? <p className="reception-empty">No hay estudiantes que coincidan con la búsqueda.</p> : <div className="reception-table-wrap"><table className="reception-table"><thead><tr><th>Matrícula</th><th>Nombre completo</th><th>Contrato</th><th>Reservas activas</th><th>Acciones</th></tr></thead><tbody>
              {filteredStudents.map((student) => <tr key={student.id}>
                <td>{student.matricula}</td><td>{student.name}</td>
                <td>{student.contract ? `${student.contract.weeklyHours} h/semana · ${student.contract.modality}` : 'Sin contrato activo'}</td>
                <td>{student.activeReservations}</td>
                <td className="reception-row-actions"><button type="button" onClick={() => startEdit(student)}>Editar</button><button type="button" className="danger" onClick={() => setPendingDelete(student)}>Eliminar</button></td>
              </tr>)}
            </tbody></table></div>}
          </section>

          <form className="reception-student-form" onSubmit={submitStudent}>
            <h2>{editingId ? 'Editar estudiante' : 'Registrar estudiante'}</h2>
            <label htmlFor="student-matricula">Matrícula<input id="student-matricula" value={form.matricula} onChange={(event) => setForm({ ...form, matricula: event.target.value })} required /></label>
            <label htmlFor="student-name">Nombre completo<input id="student-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            {!editingId && <p>Se generará una contraseña temporal segura; se mostrará una sola vez al guardar.</p>}
            <button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar estudiante'}</button>
            {editingId && <button className="secondary" type="button" onClick={resetForm}>Cancelar edición</button>}
          </form>
        </div> : tab === 'reservations' ? <section className="reception-list-section">
          <div className="reception-section-heading"><h2>Reservas del {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</h2><span>{filteredReservations.length} resultados</span></div>
          {loading ? <p className="reception-empty">Cargando reservas...</p> : filteredReservations.length === 0 ? <p className="reception-empty">No hay reservas para esta fecha.</p> : <div className="reception-table-wrap"><table className="reception-table"><thead><tr><th>Hora</th><th>Estudiante</th><th>Lección</th><th>Modalidad</th><th>Estado</th><th>Asistencia</th></tr></thead><tbody>
            {filteredReservations.map((reservation) => <tr key={reservation.id}>
              <td>{reservation.startTime} - {reservation.endTime}</td><td>{reservation.student}<small>{reservation.studentId}</small></td><td>{reservation.lesson}</td><td>{reservation.modality}</td><td>{reservation.status}</td>
              <td><select value={reservation.status} disabled={saving} onChange={(event) => updateReservationStatus(reservation, event.target.value)}><option value="Confirmada">Pendiente</option><option value="Completada">Asistió</option><option value="Cancelada">Cancelada</option></select></td>
            </tr>)}
          </tbody></table></div>}
        </section> : tab === 'rooms' ? <div className="reception-management-grid">
          <section className="reception-list-section">
            <div className="reception-section-heading"><h2>Salones registrados</h2><span>{rooms.length} resultados</span></div>
            {loading ? <p className="reception-empty">Cargando salones...</p> : rooms.length === 0 ? <p className="reception-empty">No hay salones registrados.</p> : <div className="reception-table-wrap"><table className="reception-table"><thead><tr><th>Salón</th><th>Profesor mañana</th><th>Profesor tarde</th><th>Aforo</th><th>Acciones</th></tr></thead><tbody>
              {rooms.map((room) => <tr key={room.id}><td>{room.name}</td><td>{room.morningTeacher}</td><td>{room.afternoonTeacher}</td><td>{room.capacity}</td><td className="reception-row-actions"><button type="button" onClick={() => editRoom(room)}>Editar</button><button type="button" className="danger" onClick={() => setPendingRoomDelete(room)}>Eliminar</button></td></tr>)}
            </tbody></table></div>}
          </section>
          <form className="reception-student-form" onSubmit={saveRoom}>
            <h2>{editingRoomId ? 'Editar salón' : 'Registrar salón'}</h2>
            <label htmlFor="room-name">Nombre<input id="room-name" value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} required /></label>
            <label htmlFor="room-morning">Profesor turno mañana<input id="room-morning" value={roomForm.morningTeacher} onChange={(event) => setRoomForm({ ...roomForm, morningTeacher: event.target.value })} required /></label>
            <label htmlFor="room-afternoon">Profesor turno tarde<input id="room-afternoon" value={roomForm.afternoonTeacher} onChange={(event) => setRoomForm({ ...roomForm, afternoonTeacher: event.target.value })} required /></label>
            <label htmlFor="room-capacity">Aforo máximo<input id="room-capacity" type="number" min="1" value={roomForm.capacity} onChange={(event) => setRoomForm({ ...roomForm, capacity: event.target.value })} required /></label>
            <button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingRoomId ? 'Guardar cambios' : 'Registrar salón'}</button>
            {editingRoomId && <button className="secondary" type="button" onClick={() => { setEditingRoomId(null); setRoomForm(emptyRoomForm) }}>Cancelar edición</button>}
          </form>
        </div> : <div className="reception-management-grid">
          <section className="reception-list-section">
            <div className="reception-section-heading"><h2>Lecciones registradas</h2><span>{filteredLessons.length} resultados</span></div>
            {loading ? <p className="reception-empty">Cargando lecciones...</p> : filteredLessons.length === 0 ? <p className="reception-empty">No hay lecciones registradas.</p> : <div className="reception-table-wrap"><table className="reception-table"><thead><tr><th>Orden</th><th>Título</th><th>Tipo</th><th>Acciones</th></tr></thead><tbody>
              {filteredLessons.map((lesson) => <tr key={lesson.id}><td>{lesson.order}</td><td>{lesson.title}</td><td>{lesson.type}</td><td className="reception-row-actions"><button type="button" onClick={() => editLesson(lesson)}>Editar</button><button type="button" className="danger" onClick={() => setPendingLessonDelete(lesson)}>Eliminar</button></td></tr>)}
            </tbody></table></div>}
          </section>
          <form className="reception-student-form" onSubmit={saveLesson}>
            <h2>{editingLessonId ? 'Editar lección' : 'Registrar lección'}</h2>
            <label htmlFor="lesson-order">Orden<input id="lesson-order" type="number" min="1" value={lessonForm.order} onChange={(event) => setLessonForm({ ...lessonForm, order: event.target.value })} required /></label>
            <label htmlFor="lesson-title">Título<input id="lesson-title" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required /></label>
            <label htmlFor="lesson-type">Tipo<select id="lesson-type" value={lessonForm.type} onChange={(event) => setLessonForm({ ...lessonForm, type: event.target.value })}><option value="Leccion">Lección</option><option value="Examen Escrito">Examen escrito</option><option value="Examen Oral">Examen oral</option><option value="Club Conversacion">Club de conversación</option></select></label>
            <button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingLessonId ? 'Guardar cambios' : 'Registrar lección'}</button>
            {editingLessonId && <button className="secondary" type="button" onClick={() => { setEditingLessonId(null); setLessonForm(emptyLessonForm) }}>Cancelar edición</button>}
          </form>
        </div>}
      </section>

      {pendingDelete && <div className="reception-dialog-backdrop"><section className="reception-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-heading"><h2 id="delete-heading">Eliminar estudiante</h2><p>Se eliminará a {pendingDelete.name} y sus reservas asociadas.</p><div><button type="button" className="danger" disabled={saving} onClick={deleteStudent}>{saving ? 'Eliminando...' : 'Eliminar'}</button><button type="button" onClick={() => setPendingDelete(null)}>Cancelar</button></div></section></div>}
      {pendingRoomDelete && <div className="reception-dialog-backdrop"><section className="reception-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-room-heading"><h2 id="delete-room-heading">Eliminar salón</h2><p>¿Eliminar {pendingRoomDelete.name}? Los salones con reservas no se pueden borrar.</p><div><button type="button" className="danger" disabled={saving} onClick={deleteRoom}>{saving ? 'Eliminando...' : 'Eliminar'}</button><button type="button" onClick={() => setPendingRoomDelete(null)}>Cancelar</button></div></section></div>}
      {pendingLessonDelete && <div className="reception-dialog-backdrop"><section className="reception-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-lesson-heading"><h2 id="delete-lesson-heading">Eliminar lección</h2><p>¿Eliminar “{pendingLessonDelete.title}”? Las lecciones asociadas a reservas no se pueden borrar.</p><div><button type="button" className="danger" disabled={saving} onClick={deleteLesson}>{saving ? 'Eliminando...' : 'Eliminar'}</button><button type="button" onClick={() => setPendingLessonDelete(null)}>Cancelar</button></div></section></div>}
    </main>
  )
}
