import React from 'react';
import StudentNavbar from '../../../Components/StudentNavBar';
import './Profile.css';

const scheduleHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

function formatClassDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

function isAtLeastOneDayAhead(dateKey) {
  const classDate = new Date(`${dateKey}T00:00:00`)
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.ceil((classDate - todayStart) / (1000 * 60 * 60 * 24)) >= 1
}

export const Profile = ({ onCancelReservation, onNavigate, onLogout, onUpdateReservation, reservations, user }) => {
  const [editingId, setEditingId] = React.useState(null)
  const [editStartHour, setEditStartHour] = React.useState(null)
  const [editEndHour, setEditEndHour] = React.useState(null)
  const upcomingClasses = reservations
    .filter((reservation) => reservation.userId === user.id)
    .map((reservation) => {
      return {
        ...reservation,
        title: 'Clase Presencial',
        date: reservation.dateKey,
        formattedDate: formatClassDate(reservation.dateKey),
        time: `${formatHour(reservation.startHour)} - ${formatHour(reservation.endHour)}`,
      }
    });

  const currentStudent = user;
  const pastClasses = user.pastClasses;

  const MAX_WEEKLY_HOURS = 6;

  const handleCancelClass = (classItem) => {
    if (!isAtLeastOneDayAhead(classItem.date)) {
      alert('Las cancelaciones deben realizarse con al menos 1 día de anticipación.');
      return;
    }

    const confirmCancel = window.confirm(
      `¿Deseas cancelar la clase del ${classItem.formattedDate}? Se abonará 1 hora a tu balance.`
    );

    if (confirmCancel) {
      onCancelReservation(classItem.id);
      alert('Clase cancelada exitosamente.');
    }
  };

  const handleEditClass = (classItem) => {
    if (!isAtLeastOneDayAhead(classItem.date)) {
      alert('Las ediciones deben realizarse con al menos 1 día de anticipación.');
      return;
    }

    setEditingId(classItem.id);
    setEditStartHour(classItem.startHour);
    setEditEndHour(classItem.endHour);
  };

  const handleSaveEdit = (classItem) => {
    if (editStartHour >= editEndHour) {
      alert('La hora de finalización debe ser posterior a la hora de inicio.');
      return;
    }

    const otherReservations = reservations.filter((reservation) => reservation.id !== classItem.id)
    const hasConflict = otherReservations.some((reservation) => reservation.dateKey === classItem.date && reservation.startHour < editEndHour && reservation.endHour > editStartHour)
    if (hasConflict) {
      alert('Uno o más horarios seleccionados ya están ocupados. Elige otro intervalo.');
      return;
    }

    onUpdateReservation(classItem.id, editStartHour, editEndHour);
    setEditingId(null);
  };

  const weeklyHoursUsed = upcomingClasses.reduce((total, classItem) => total + classItem.endHour - classItem.startHour, 0);
  const weeklyPercent = Math.min((weeklyHoursUsed / MAX_WEEKLY_HOURS) * 100, 100);

  return (
    <div className="profile-page">
      <StudentNavbar activeView="profile" onLogout={onLogout} onNavigate={onNavigate} user={user} />
      <main className="profile-container">
      <header className="profile-header">
        <div className="profile-avatar">
          {currentStudent.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div className="profile-info">
          <h2>{currentStudent.name}</h2>
          <div className="profile-tags">
            <span className="badge-id">Matrícula: {currentStudent.id}</span>
            <span className="badge-level">Nivel: {currentStudent.level}</span>
          </div>
        </div>
      </header>

      <section className="stats-grid stats-grid-single">
        <div className="stat-card stat-card-highlight">
          <div className="stat-header">
            <h3>Límite Semanal</h3>
            <span className="stat-chip">Escuela</span>
          </div>
          <div className="stat-value">
            {weeklyHoursUsed} <span>/ {MAX_WEEKLY_HOURS} hrs</span>
          </div>
          <p className="stat-subtext">
            {weeklyHoursUsed >= MAX_WEEKLY_HOURS
              ? 'Alcanzaste tu límite de esta semana'
              : `Puedes agendar ${MAX_WEEKLY_HOURS - weeklyHoursUsed} hrs más esta semana`}
          </p>
          <div className="progress-bar">
            <div
              className={`progress-fill ${weeklyPercent >= 100 ? 'warning' : ''}`}
              style={{ width: `${weeklyPercent}%` }}
            ></div>
          </div>
        </div>
      </section>

      <div className="profile-layout">
        <section className="main-content">
          <div className="section-header-actions">
            <h3>Próximas Clases</h3>
          </div>

          <p className="notice-banner">
            📌 Puedes cancelar una clase hasta un día antes de la fecha programada. Para agendar nuevas clases, ve a la sección de inicio.
          </p>

          {upcomingClasses.length === 0 ? (
            <div className="empty-card">
              <p>No tienes clases agendadas actualmente.</p>
            </div>
          ) : (
            <div className="classes-stack">
              {upcomingClasses.map((item) => (
                <div key={item.id} className="class-item">
                  <div className="class-info">
                    <h4>{item.title}</h4>
                    <p>📅 {item.formattedDate}</p>
                    <p>⏰ {item.time}</p>
                  </div>
                  <div className="class-actions">
                    {editingId === item.id ? (
                      <div className="edit-class-controls">
                        <label>Inicio<select value={editStartHour} onChange={(event) => setEditStartHour(Number(event.target.value))}>{scheduleHours.slice(0, -1).map((hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select></label>
                        <label>Fin<select value={editEndHour} onChange={(event) => setEditEndHour(Number(event.target.value))}>{scheduleHours.slice(1).map((hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select></label>
                        <button className="btn-primary" onClick={() => handleSaveEdit(item)} type="button">Guardar</button>
                        <button className="btn-cancel" onClick={() => setEditingId(null)} type="button">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <button className="btn-primary" onClick={() => handleEditClass(item)} type="button">Editar horario</button>
                        <button className="btn-cancel" onClick={() => handleCancelClass(item)} type="button">Cancelar clase</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="sidebar-content">
          <div className="side-card">
            <h3>Historial de Clases</h3>
            {pastClasses.length === 0 ? (
              <p className="stat-subtext">Aún no tienes clases registradas en tu historial.</p>
            ) : (
              <ul className="history-simple-list">
                {pastClasses.map((item) => (
                  <li key={item.id} className="history-simple-item">
                    <strong>{item.title}</strong>
                    <small>📅 {item.formattedDate} · ⏰ {item.time}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
      </main>
    </div>
  );
};