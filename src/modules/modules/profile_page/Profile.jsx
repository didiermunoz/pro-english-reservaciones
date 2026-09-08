import React, { useState } from 'react';
import './Profile.css';

export const Profile = ({ onNavigate }) => {
  // Lista de 2 alumnos de prueba
  const [students] = useState([
    {
      id: '1234',
      name: 'Carlos Mendoza',
      level: 'B1 Intermediate',
      availableHours: 8,
      totalHours: 12,
    },
    {
      id: '5678',
      name: 'Ana Sofia Gómez',
      level: 'A2 Elementary',
      availableHours: 4,
      totalHours: 10,
    }
  ]);

  // Alumno seleccionado para la prueba (cambia a 1 para ver el segundo)
  const [studentIndex, setStudentIndex] = useState(0);
  const currentStudent = students[studentIndex];

  const [upcomingClasses, setUpcomingClasses] = useState([
    {
      id: 1,
      title: 'Conversation Class',
      date: '2026-09-10',
      formattedDate: '10 de Septiembre, 2026',
      time: '16:00 - 17:00',
      location: 'Aula 4',
    },
    {
      id: 2,
      title: 'Grammar & Vocabulary',
      date: '2026-09-12',
      formattedDate: '12 de Septiembre, 2026',
      time: '10:00 - 11:00',
      location: 'Aula 2',
    },
  ]);

  const [pastClasses] = useState([
    {
      id: 101,
      title: 'Speaking Practice',
      date: '02 de Septiembre, 2026',
    },
    {
      id: 102,
      title: 'Phonetics Module',
      date: '28 de Agosto, 2026',
    },
  ]);

  // Regla de cancelación: Mínimo 1 día de anticipación
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
      {/* Selector rápido para cambiar entre los 2 alumnos de prueba */}
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

      {/* Header del Alumno */}
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

      {/* Tarjetas de Métricas de Horas */}
      <section className="stats-grid">
        <div className="stat-card primary">
          <h3>Horas Disponibles</h3>
          <div className="stat-value">{currentStudent.availableHours} <span>hrs</span></div>
          <p className="stat-subtext">De un total de {currentStudent.totalHours} hrs este mes</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStudent.availableHours / currentStudent.totalHours) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="stat-card">
          <h3>Clases Agendadas</h3>
          <div className="stat-value">{upcomingClasses.length}</div>
          <p className="stat-subtext">Próximas asistencias</p>
        </div>
      </section>

      {/* Sección Principal */}
      <div className="profile-layout">
        {/* Columna Izquierda: Próximas Clases */}
        <section className="main-content">
          <h3>Próximas Clases</h3>

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
                    <p>📍 {item.location}</p>
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

        {/* Columna Derecha: Historial Simple */}
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