import React, { useState } from 'react';
import './Profile.css';

export const Profile = ({ onNavigate }) => {
  const [students] = useState([
    {
      id: '1234',
      name: 'Carlos Mendoza',
      level: 'I - Intermediate',
    },
    {
      id: '5678',
      name: 'Ana Sofia Gómez',
      level: 'B - Beginner',
    }
  ]);

  const [studentIndex, setStudentIndex] = useState(0);
  const currentStudent = students[studentIndex];

  const [upcomingClasses, setUpcomingClasses] = useState([
    {
      id: 1,
      title: 'Clase Presencial',
      date: '2026-09-09',
      formattedDate: '09 de Septiembre, 2026',
      time: '16:00 - 17:00',
    },
    {
      id: 2,
      title: 'Clase Presencial',
      date: '2026-09-09',
      formattedDate: '09 de Septiembre, 2026',
      time: '17:00 - 18:00',
    },
  ]);

  const [pastClasses] = useState([
    {
      id: 101,
      title: 'Clase Presencial',
      date: '2026-09-02',
      formattedDate: '02 de Septiembre, 2026',
      time: '16:00 - 17:00',
    },
  ]);

  const MAX_WEEKLY_HOURS = 6;

  const handleCancelClass = (classItem) => {
    const classDate = new Date(classItem.date);
    const today = new Date();
    const diffTime = classDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      alert('Las cancelaciones deben realizarse con al menos 1 día de anticipación.');
      return;
    }

    const confirmCancel = window.confirm(
      `¿Deseas cancelar la clase del ${classItem.formattedDate}? Se abonará 1 hora a tu balance.`
    );

    if (confirmCancel) {
      setUpcomingClasses((prev) => prev.filter((c) => c.id !== classItem.id));
      alert('Clase cancelada exitosamente.');
    }
  };

  const weeklyHoursUsed = upcomingClasses.length;
  const weeklyPercent = Math.min((weeklyHoursUsed / MAX_WEEKLY_HOURS) * 100, 100);

  return (
    <div className="profile-container">
      <div className="demo-switcher">
        <small>Cambiar alumno de prueba: </small>
        <button
          className={studentIndex === 0 ? 'active' : ''}
          onClick={() => setStudentIndex(0)}
        >
          Alumno 1 (1234)
        </button>
        <button
          className={studentIndex === 1 ? 'active' : ''}
          onClick={() => setStudentIndex(1)}
        >
          Alumno 2 (5678)
        </button>
      </div>

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
                    <button
                      className="btn-cancel"
                      onClick={() => handleCancelClass(item)}
                    >
                      Cancelar clase
                    </button>
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
    </div>
  );
};