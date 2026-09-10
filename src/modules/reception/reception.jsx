import React, { useMemo, useState } from 'react';
import './reception.css';

const baseStudents = [
  { student: 'José Ramírez', studentId: '2048', level: 'A - Advanced' },
  { student: 'Diego Lara', studentId: '4444', level: 'A - Advanced' },
  { student: 'Didier Camargo', studentId: '5665', level: 'A - Advanced' },
  { student: 'Diego Torres', studentId: '2256', level: 'A - Advanced' },
  { student: 'Valeria Gómez', studentId: '4411', level: 'B - Beginner' },
  { student: 'Mateo Ruiz', studentId: '5637', level: 'I - Intermediate' },
  { student: 'Andrea Flores', studentId: '7823', level: 'A - Advanced' },
  { student: 'Fernando Silva', studentId: '9014', level: 'B - Beginner' },
];

const initialStudents = [
  { id: '2048', name: 'José Ramírez', level: 'A - Advanced', availableHours: 8, totalHours: 12, tempPassword: 'x7K9pQ', mustChangePassword: true },
  { id: '4444', name: 'Diego Lara', level: 'A - Advanced', availableHours: 7, totalHours: 12, tempPassword: 'Q3mN8s', mustChangePassword: true },
  { id: '5665', name: 'Didier Camargo', level: 'A - Advanced', availableHours: 6, totalHours: 10, tempPassword: 'L2gR5t', mustChangePassword: true },
  { id: '2256', name: 'Diego Torres', level: 'A - Advanced', availableHours: 5, totalHours: 9, tempPassword: 'H8dW2k', mustChangePassword: true },
  { id: '4411', name: 'Valeria Gómez', level: 'B - Beginner', availableHours: 9, totalHours: 14, tempPassword: 'N4fT7q', mustChangePassword: true },
  { id: '5637', name: 'Mateo Ruiz', level: 'I - Intermediate', availableHours: 7, totalHours: 11, tempPassword: 'P6wX2m', mustChangePassword: true },
];

const emptyStudentForm = {
  name: '',
  id: '',
  level: 'B - Beginner',
  availableHours: 8,
  totalHours: 12,
};

const generateTempPassword = () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';

  for (let index = 0; index < 8; index += 1) {
    password += characters[Math.floor(Math.random() * characters.length)];
  }

  return password;
};

const getDateLabel = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  return {
    date,
    iso: date.toISOString().split('T')[0],
    formatted: date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
};

const buildReservationsForDate = (isoDate) => {
  const scheduleHours = [8, 9, 10, 11, 13, 15, 16, 17, 18, 19, 20];

  return baseStudents.map((student, index) => ({
    id: `${isoDate}-${index + 1}`,
    ...student,
    date: isoDate,
    startHour: scheduleHours[index % scheduleHours.length],
  }));
};

const formatBlock = (startHour) => `${String(startHour).padStart(2, '0')}:00 - ${String(startHour + 1).padStart(2, '0')}:00`;

const Reception = () => {
  const today = useMemo(() => getDateLabel(0), []);
  const tomorrow = useMemo(() => getDateLabel(1), []);
  const [activeTab, setActiveTab] = useState('today');
  const [query, setQuery] = useState('');
  const [selectedHour, setSelectedHour] = useState('all');
  const [students, setStudents] = useState(initialStudents);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [studentNotice, setStudentNotice] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);

  const todayReservations = useMemo(() => buildReservationsForDate(today.iso), [today.iso]);
  const tomorrowReservations = useMemo(() => buildReservationsForDate(tomorrow.iso), [tomorrow.iso]);

  const activeReservations = useMemo(() => {
    const currentDate = new Date();
    const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

    if (activeTab === 'today') {
      return [...todayReservations]
        .filter((reservation) => reservation.startHour * 60 >= currentMinutes)
        .sort((a, b) => a.startHour - b.startHour);
    }

    return [...tomorrowReservations].sort((a, b) => a.startHour - b.startHour);
  }, [activeTab, todayReservations, tomorrowReservations]);

  const timeOptions = useMemo(() => {
    const hours = [...new Set(activeReservations.map((item) => item.startHour))].sort((a, b) => a - b);
    return hours.map((hour) => ({ value: String(hour), label: formatBlock(hour) }));
  }, [activeReservations]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...activeReservations]
      .filter((reservation) => {
        if (selectedHour !== 'all' && reservation.startHour !== Number(selectedHour)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return (
          reservation.student.toLowerCase().includes(normalizedQuery) ||
          reservation.studentId.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.startHour - b.startHour);
  }, [activeReservations, query, selectedHour]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...students]
      .filter((student) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          student.name.toLowerCase().includes(normalizedQuery) ||
          student.id.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query, students]);

  const displayLabel = activeTab === 'today' ? today : activeTab === 'tomorrow' ? tomorrow : today;

  const handleStudentFieldChange = (event) => {
    const { name, value } = event.target;
    setStudentForm((current) => ({
      ...current,
      [name]: name === 'availableHours' || name === 'totalHours' ? Number(value) : value,
    }));
  };

  const openStudentForm = (student = null) => {
    setStudentNotice('');
    setIsStudentFormOpen(true);

    if (!student) {
      setEditingStudentId(null);
      setStudentForm(emptyStudentForm);
      return;
    }

    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      id: student.id,
      level: student.level,
      availableHours: student.availableHours,
      totalHours: student.totalHours,
    });
  };

  const closeStudentForm = () => {
    setIsStudentFormOpen(false);
    setEditingStudentId(null);
    setStudentForm(emptyStudentForm);
  };

  const handleStudentSubmit = (event) => {
    event.preventDefault();

    const normalizedName = studentForm.name.trim();
    const normalizedId = studentForm.id.trim();

    if (!normalizedName || !normalizedId) {
      window.alert('Completa el nombre y ID del alumno.');
      return;
    }

    const duplicateExists = students.some(
      (student) => student.id === normalizedId && student.id !== editingStudentId,
    );

    if (duplicateExists) {
      window.alert('Ya existe un alumno con ese ID.');
      return;
    }

    const selectedStudent = students.find((student) => student.id === editingStudentId);
    const generatedPassword = selectedStudent?.tempPassword || generateTempPassword();
    const payload = {
      id: normalizedId,
      name: normalizedName,
      level: studentForm.level,
      availableHours: Number(studentForm.availableHours) || 0,
      totalHours: Number(studentForm.totalHours) || 0,
      tempPassword: generatedPassword,
      mustChangePassword: true,
    };

    setStudents((currentStudents) => {
      if (editingStudentId) {
        return currentStudents.map((student) => (
          student.id === editingStudentId ? { ...student, ...payload } : student
        ));
      }

      return [payload, ...currentStudents];
    });

    const actionLabel = editingStudentId ? 'Alumno actualizado.' : 'Alumno registrado.';
    setStudentNotice(
      `${actionLabel} Contraseña temporal: ${generatedPassword} — entrégasela para que la cambie al ingresar por primera vez.`
    );
    closeStudentForm();
  };

  const handleDeleteStudent = (studentId) => {
    const student = students.find((item) => item.id === studentId);

    if (!student) {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar al alumno ${student.name}?`);

    if (!confirmed) {
      return;
    }

    setStudents((currentStudents) => currentStudents.filter((item) => item.id !== studentId));
    setStudentNotice('');
  };

  return (
    <div className="reception-shell">
      <div className="reception-header">
        <div>
          <p className="eyebrow">Reservas</p>
          <h1>Recepción</h1>
        </div>
        <div className="date-pill">{displayLabel.formatted}</div>
      </div>

      <div className="tab-switcher" aria-label="Seleccionar tipo de información">
        <button
          type="button"
          className={activeTab === 'today' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('today')}
        >
          Hoy
        </button>
        <button
          type="button"
          className={activeTab === 'tomorrow' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('tomorrow')}
        >
          Mañana
        </button>
        <button
          type="button"
          className={activeTab === 'students' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('students')}
        >
          Alumnos
        </button>
      </div>

      <section className="reception-toolbar">
        <label className="search-field" htmlFor="reservation-search">
          <span>Buscar</span>
          <input
            id="reservation-search"
            type="text"
            placeholder={activeTab === 'students' ? 'Nombre o matrícula' : 'Nombre o ID'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {activeTab !== 'students' && (
          <label className="filter-field" htmlFor="reservation-hour">
            <span>Filtrar horario</span>
            <select
              id="reservation-hour"
              value={selectedHour}
              onChange={(event) => setSelectedHour(event.target.value)}
            >
              <option value="all">Todas las horas</option>
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {activeTab === 'students' ? (
        <section className="reception-panel student-panel">
          <div className="panel-header">
            <h2>Alumnos</h2>
            <span>
              {filteredStudents.length} {filteredStudents.length === 1 ? 'alumno' : 'alumnos'}
            </span>
          </div>

          {studentNotice && <div className="notice-banner">{studentNotice}</div>}

          <div className="student-toolbar">
            <button
              type="button"
              className="btn-primary"
              onClick={() => (isStudentFormOpen ? closeStudentForm() : openStudentForm())}
            >
              {isStudentFormOpen ? 'Cancelar' : '+ Registrar alumno'}
            </button>
          </div>

          {isStudentFormOpen && (
            <form className="student-form" onSubmit={handleStudentSubmit}>
              <div className="student-form-grid">
                <label className="search-field" htmlFor="student-name">
                  <span>Nombre</span>
                  <input
                    id="student-name"
                    name="name"
                    type="text"
                    value={studentForm.name}
                    onChange={handleStudentFieldChange}
                    placeholder="Nombre completo"
                  />
                </label>

                <label className="search-field" htmlFor="student-id">
                  <span>ID</span>
                  <input
                    id="student-id"
                    name="id"
                    type="text"
                    value={studentForm.id}
                    onChange={handleStudentFieldChange}
                    placeholder="Ej. 2048"
                  />
                </label>

                <label className="search-field" htmlFor="student-level">
                  <span>Nivel</span>
                  <select
                    id="student-level"
                    name="level"
                    value={studentForm.level}
                    onChange={handleStudentFieldChange}
                  >
                    <option value="B - Beginner">B - Beginner</option>
                    <option value="I - Intermediate">I - Intermediate</option>
                    <option value="A - Advanced">A - Advanced</option>
                  </select>
                </label>

                <label className="search-field" htmlFor="student-hours">
                  <span>Horas disponibles</span>
                  <input
                    id="student-hours"
                    name="availableHours"
                    type="number"
                    min="0"
                    value={studentForm.availableHours}
                    onChange={handleStudentFieldChange}
                  />
                </label>

                <label className="search-field" htmlFor="student-total-hours">
                  <span>Horas totales</span>
                  <input
                    id="student-total-hours"
                    name="totalHours"
                    type="number"
                    min="0"
                    value={studentForm.totalHours}
                    onChange={handleStudentFieldChange}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeStudentForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingStudentId ? 'Guardar cambios' : 'Guardar alumno'}
                </button>
              </div>
            </form>
          )}

          {filteredStudents.length === 0 ? (
            <div className="empty-state">No hay alumnos encontrados</div>
          ) : (
            <div className="student-list">
              {filteredStudents.map((student) => (
                <article key={student.id} className="student-card">
                  <div className="student-main">
                    <div>
                      <p className="label">Alumno</p>
                      <h3>{student.name}</h3>
                    </div>
                    <span className="level-badge">{student.level}</span>
                  </div>

                  <div className="student-meta">
                    <div>
                      <p className="label">Matrícula</p>
                      <strong>{student.id}</strong>
                    </div>
                    <div>
                      <p className="label">Horas</p>
                      <strong>
                        {student.availableHours} / {student.totalHours}
                      </strong>
                    </div>
                  </div>

                  <div className="student-actions">
                    <button type="button" className="student-action-button edit" onClick={() => openStudentForm(student)}>
                      Editar Alumno
                    </button>
                    <button type="button" className="student-action-button delete" onClick={() => handleDeleteStudent(student.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="reception-panel">
          <div className="panel-header">
            <h2>Proximas clases</h2>
            <span>
              {filteredReservations.length} {filteredReservations.length === 1 ? 'reserva' : 'reservas'}
            </span>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="empty-state">No hay reservas encontradas</div>
          ) : (
            <div className="reservation-list">
              {filteredReservations.map((reservation) => (
                <article key={reservation.id} className="reservation-card">
                  <div className="reservation-main">
                    <div>
                      <p className="label">Alumno</p>
                      <h3>{reservation.student}</h3>
                    </div>
                    <span className="level-badge">{reservation.level}</span>
                  </div>

                  <div className="reservation-meta">
                    <div>
                      <p className="label">Matrícula</p>
                      <strong>{reservation.studentId}</strong>
                    </div>
                    <div>
                      <p className="label">Bloque</p>
                      <strong>{formatBlock(reservation.startHour)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Reception;
