import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatHour } from '../../../Services/scheduleUtils'
import { useStudent } from '../../../Services/useStudent'
import './Profile.css'
import './ProfileApi.css'

const formatDate = (dateKey) => new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-MX', {
  day: 'numeric', month: 'long', year: 'numeric',
})

const groupReservations = (reservations) => reservations.reduce((groups, reservation) => {
  const previous = groups[groups.length - 1]
  if (previous && previous.dateKey === reservation.dateKey && previous.endHour === reservation.startHour) {
    previous.endHour = reservation.endHour
    previous.ids.push(reservation.id)
    previous.time = `${formatHour(previous.startHour)} - ${formatHour(previous.endHour)}`
    return groups
  }
  groups.push({
    id: reservation.id,
    ids: [reservation.id],
    dateKey: reservation.dateKey,
    title: reservation.lesson,
    startHour: reservation.startHour,
    endHour: reservation.endHour,
    time: `${formatHour(reservation.startHour)} - ${formatHour(reservation.endHour)}`,
  })
  return groups
}, [])

export const Profile = () => {
  const navigate = useNavigate()
  const { currentStudent, reservations, updateProfile, cancelReservations, logout } = useStudent()
  const [nameDraft, setNameDraft] = useState(null)
  const name = nameDraft ?? currentStudent.name
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [pendingCancellation, setPendingCancellation] = useState(null)
  const [loading, setLoading] = useState(false)
  const weeklyLimit = Number(currentStudent.contract?.weeklyHours || 0)

  const currentWeek = useMemo(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const end = new Date(monday)
    end.setDate(end.getDate() + 7)
    const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return { start: dateKey(monday), end: dateKey(end) }
  }, [])

  const activeReservations = reservations.filter((item) => item.status === 'Confirmada')
  const weeklyHoursUsed = reservations
    .filter((item) => ['Confirmada', 'Completada'].includes(item.status))
    .filter((item) => item.dateKey >= currentWeek.start && item.dateKey < currentWeek.end)
    .reduce((total, item) => total + item.endHour - item.startHour, 0)
  const upcomingClasses = groupReservations(activeReservations)
  const pastClasses = reservations.filter((item) => item.status === 'Completada')
  const weeklyPercent = weeklyLimit > 0 ? Math.min((weeklyHoursUsed / weeklyLimit) * 100, 100) : 0

  const saveProfile = async (event) => {
    event.preventDefault()
    setLoading(true)
    setNotice('')
    try {
      await updateProfile({ name })
      setNameDraft(null)
      setEditing(false)
      setNotice('Perfil actualizado correctamente.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!pendingCancellation) return
    setLoading(true)
    setNotice('')
    try {
      await cancelReservations(pendingCancellation.ids)
      setPendingCancellation(null)
      setNotice('Clase cancelada correctamente.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="profile-container">
      <div className="profile-cta-row"><Link className="profile-home-button" to="/home">Ir a Inicio</Link></div>
      <header className="profile-header">
        <div className="profile-identity-block">
          <div className="profile-avatar">{currentStudent.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div>
          <div className="profile-info">
            <h2>{currentStudent.name}</h2>
            <div className="profile-tags">
              <span className="badge-id">Matrícula: {currentStudent.matricula}</span>
              <span className="badge-level">Estudiante</span>
            </div>
          </div>
        </div>
        <button className="profile-logout-button" type="button" onClick={handleLogout}>Cerrar sesión</button>
      </header>

      {notice && <p className="profile-alert" role="status">{notice}</p>}

      <section className="stats-grid stats-grid-single">
        <div className="stat-card stat-card-highlight">
          <div className="stat-header"><h3>Horas reservadas esta semana</h3><span className="stat-chip">Contrato</span></div>
          <div className="stat-value">{weeklyHoursUsed} <span>/ {weeklyLimit} hrs</span></div>
          <p className="stat-subtext">{weeklyLimit ? `Puedes agendar ${Math.max(0, weeklyLimit - weeklyHoursUsed)} hrs más esta semana` : 'No hay un contrato activo asociado.'}</p>
          <div className="progress-bar"><div className={`progress-fill ${weeklyPercent >= 100 ? 'warning' : ''}`} style={{ width: `${weeklyPercent}%` }} /></div>
        </div>
      </section>

      <div className="profile-layout">
        <section className="main-content">
          <div className="section-header-actions"><h3>Información del perfil</h3><button className="btn-cancel" type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancelar edición' : 'Editar nombre'}</button></div>
          {editing ? <form className="profile-edit-form" onSubmit={saveProfile}>
            <label htmlFor="profile-name">Nombre completo<input id="profile-name" value={name} onChange={(event) => setNameDraft(event.target.value)} required /></label>
            <button className="profile-home-button" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</button>
          </form> : <p className="notice-banner">{currentStudent.name} · {currentStudent.matricula}</p>}

          <div className="section-header-actions"><h3>Próximas clases</h3></div>
          {upcomingClasses.length === 0 ? <div className="empty-card"><p>No tienes clases confirmadas.</p></div> : <div className="classes-stack">
            {upcomingClasses.map((item) => <div key={item.id} className="class-item">
              <div className="class-info"><h4>{item.title}</h4><p>Fecha: {formatDate(item.dateKey)}</p><p>Horario: {item.time}</p></div>
              <button className="btn-cancel" type="button" disabled={loading} onClick={() => setPendingCancellation(item)}>Cancelar bloque ({item.ids.length} {item.ids.length === 1 ? 'hora' : 'horas'})</button>
            </div>)}
          </div>}

          {pendingCancellation && <div className="profile-confirm" role="alertdialog" aria-label="Confirmar cancelación">
            <span>¿Cancelar {pendingCancellation.ids.length} {pendingCancellation.ids.length === 1 ? 'hora' : 'horas'} del {formatDate(pendingCancellation.dateKey)}?</span>
            <button type="button" disabled={loading} onClick={handleCancel}>{loading ? 'Procesando...' : 'Confirmar cancelación'}</button>
            <button type="button" onClick={() => setPendingCancellation(null)}>Conservar</button>
          </div>}
        </section>

        <aside className="sidebar-content"><div className="side-card"><h3>Historial de clases</h3>
          {pastClasses.length === 0 ? <p className="stat-subtext">No hay clases completadas registradas.</p> : <ul className="history-simple-list">
            {pastClasses.map((item) => <li key={item.id} className="history-simple-item"><strong>{item.lesson}</strong><small>{formatDate(item.dateKey)} · {formatHour(item.startHour)} - {formatHour(item.endHour)}</small></li>)}
          </ul>}
        </div></aside>
      </div>
    </div>
  )
}
