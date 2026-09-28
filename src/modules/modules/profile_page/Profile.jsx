import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Profile.css';

const MAX_WEEKLY_HOURS = 6;

function DemoStudentSwitcher({ studentIndex, setStudentIndex }) {
  return (
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
  );
}

function ProfileHeader({ currentStudent }) {
  const studentInitials = currentStudent.name.split(' ').map((namePart) => namePart[0]).join('');

  return (
    <header className="profile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        <div className="profile-avatar">{studentInitials}</div>
        <div className="profile-info">
          <h2>{currentStudent.name}</h2>
          <div className="profile-tags">
            <span className="badge-id">ID alumno: {currentStudent.id}</span>
            <span className="badge-level">Nivel: {currentStudent.level}</span>
          </div>
        </div>
      </div>
      <Link
        to="/login"
        style={{
          color: '#ffffff',
          textDecoration: 'none',
          fontSize: '0.82rem',
          fontWeight: 700,
          opacity: 0.95,
        }}
      >
        Cerrar sesión
      </Link>
    </header>
  );
}

function WeeklyLimitCard({ weeklyHoursUsed, weeklyPercent }) {
  const limitMessage = weeklyHoursUsed >= MAX_WEEKLY_HOURS
    ? 'Alcanzaste tu límite de esta semana'
    : `Puedes agendar ${MAX_WEEKLY_HOURS - weeklyHoursUsed} hrs más esta semana`;

  return (
    <section className="stats-grid stats-grid-single">
      <div className="stat-card stat-card-highlight">
        <div className="stat-header">
          <h3>Límite de horas semanal</h3>
          <span className="stat-chip">Escuela</span>
        </div>
        <div className="stat-value">
          {weeklyHoursUsed} <span>/ {MAX_WEEKLY_HOURS} hrs</span>
        </div>
        <p className="stat-subtext">{limitMessage}</p>
        <div className="progress-bar">
          <div
            className={`progress-fill ${weeklyPercent >= 100 ? 'warning' : ''}`}
            style={{ width: `${weeklyPercent}%` }}
          ></div>
        </div>
      </div>
    </section>
  );
}

function UpcomingClassList({ upcomingClasses, onCancelClass }) {
  if (upcomingClasses.length === 0) {
    return (
      <div className="empty-card">
        <p>No tienes clases agendadas actualmente.</p>
      </div>
    );
  }

  return (
    <div className="classes-stack">
      {upcomingClasses.map((classItem) => (
        <div key={classItem.id} className="class-item">
          <div className="class-info">
            <h4>{classItem.title}</h4>
            <p>📅 {classItem.formattedDate}</p>
            <p>⏰ {classItem.time}</p>
          </div>
          <div className="class-actions">
            <button
              className="btn-cancel"
              onClick={() => onCancelClass(classItem)}
            >
              Cancelar clase
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassHistory({ pastClasses }) {
  const hasPastClasses = pastClasses.length > 0;

  return (
    <aside className="sidebar-content">
      <div className="side-card">
        <h3>Historial de Clases</h3>
        {hasPastClasses ? (
          <ul className="history-simple-list">
            {pastClasses.map((classItem) => (
              <li key={classItem.id} className="history-simple-item">
                <strong>{classItem.title}</strong>
                <small>📅 {classItem.formattedDate} · ⏰ {classItem.time}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="stat-subtext">Aún no tienes clases registradas en tu historial.</p>
        )}
      </div>
    </aside>
  );
}

/** Displays a student's profile, demo switcher, upcoming classes, and history. */
export const Profile = ({ onNavigate }) => {
  // MOCK: reemplazar por API
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

  // MOCK: reemplazar por API
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

  // MOCK: reemplazar por API
  const [pastClasses] = useState([
    {
      id: 101,
      title: 'Clase Presencial',
      date: '2026-09-02',
      formattedDate: '02 de Septiembre, 2026',
      time: '16:00 - 17:00',
    },
  ]);

  const weeklyHoursUsed = upcomingClasses.length;
  const weeklyPercent = Math.min((weeklyHoursUsed / MAX_WEEKLY_HOURS) * 100, 100);

  const handleCancelClass = (classItem) => {
    const classDate = new Date(classItem.date);
    const today = new Date();
    const millisecondsUntilClass = classDate - today;
    const daysUntilClass = Math.ceil(millisecondsUntilClass / (1000 * 60 * 60 * 24));

    // Business rule: class cancellations require at least one full day of notice.
    if (daysUntilClass < 1) {
      alert('Las cancelaciones deben realizarse con al menos 1 día de anticipación.');
      return;
    }

    const isCancellationConfirmed = window.confirm(
      `¿Deseas cancelar la clase del ${classItem.formattedDate}? Se abonará 1 hora a tu balance.`
    );

    if (isCancellationConfirmed) {
      setUpcomingClasses((currentClasses) => currentClasses.filter((upcomingClass) => upcomingClass.id !== classItem.id));
      alert('Clase cancelada exitosamente.');
    }
  };

  return (
    <div className="profile-container">
      <DemoStudentSwitcher studentIndex={studentIndex} setStudentIndex={setStudentIndex} />
      <div className="profile-cta-row">
        <Link className="profile-home-button" to="/home">
          Ir a Inicio
        </Link>
      </div>
      <ProfileHeader currentStudent={currentStudent} />
      <WeeklyLimitCard weeklyHoursUsed={weeklyHoursUsed} weeklyPercent={weeklyPercent} />
      <div className="profile-layout">
        <section className="main-content">
          <div className="section-header-actions">
            <h3>Próximas Clases</h3>
          </div>
          <p className="notice-banner">
            📌 Puedes cancelar una clase hasta un día antes de la fecha programada. Para agendar nuevas clases, ve a la sección de inicio.
          </p>
          <UpcomingClassList
            upcomingClasses={upcomingClasses}
            onCancelClass={handleCancelClass}
          />
        </section>
        <ClassHistory pastClasses={pastClasses} />
      </div>
    </div>
  );
};