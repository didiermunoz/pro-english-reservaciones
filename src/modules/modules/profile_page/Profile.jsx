import React, { useState } from 'react';
import './Profile.css';

export const Profile = ({ onNavigate }) => {
  const [students] = useState([
    {
      id: '1234',
      name: 'Carlos Mendoza',
      level: 'I - Intermediate',
      availableHours: 8,
      totalHours: 12,
    },
    {
      id: '5678',
      name: 'Ana Sofia Gómez',
      level: 'B - Beginner',
      availableHours: 4,
      totalHours: 10,
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
      date: '02 de Septiembre, 2026',
    },
  ]);

  // Límite fijado por la administración
  const MAX_WEEKLY_HOURS = 6;

  // Función para agendar únicamente para el día de mañana
  const handleBookTomorrowClass = () => {
    // 1. Validar límite de 6 horas semanales
    if (upcomingClasses.length >= MAX_WEEKLY_HOURS) {
      alert(`Límite alcanzado: Solo puedes agendar un máximo de ${MAX_WEEKLY_HOURS} horas a la semana.`);
      return;
    }

    // 2. Calcular exactamente la fecha de mañana (1 día después)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = tomorrow.toISOString().split('T')[0];
    const formattedDate = tomorrow.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const newClass = {
      id: Date.now(),
      title: 'Clase Presencial',
      date: dateStr,
      formattedDate: formattedDate,
      time: '10:00 - 11:00',
    };

    setUpcomingClasses((prev) => [...prev, newClass]);
    alert(`Clase agendada para mañana (${formattedDate}).`);
  };

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

      <section className="stats-grid">
        <div className="stat-card primary">
          <h3>Horas Disponibles (Mes)</h3>
          <div className="stat-value">{currentStudent.availableHours} <span>hrs</span></div>
          <p className="stat-subtext">De un total de {currentStudent.totalHours} hrs este mes</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStudent.availableHours / currentStudent.totalHours) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Tarjeta ajustada a la regla de 6 horas semanales */}
        <div className="stat-card">
          <h3>Límite Semanal</h3>
          <div className="stat-value">
            {upcomingClasses.length} <span>/ {MAX_WEEKLY_HOURS} hrs</span>
          </div>
          <p className="stat-subtext">Máximo permitido por semana</p>
        </div>
      </section>

      <div className="profile-layout">
        <section className="main-content">
          <div className="section-header-actions">
            <h3>Próximas Clases</h3>
            <button className="btn-primary" onClick={handleBookTomorrowClass}>
              + Agendar para mañana
            </button>
          </div>

          <p className="notice-banner">
            📌 Solo se puede agendar para el día de mañana con un limite de {MAX_WEEKLY_HOURS} hrs/semana.
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
            <ul className="history-simple-list">
              {pastClasses.map((item) => (
                <li key={item.id} className="history-simple-item">
                  <div>
                    <strong>{item.title}</strong>
                    <small>📅 {item.date}</small>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};