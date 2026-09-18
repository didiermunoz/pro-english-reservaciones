import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  { student: 'Lucía Mendoza', studentId: '3142', level: 'B - Beginner' },
  { student: 'Pablo Ortega', studentId: '6285', level: 'I - Intermediate' },
  { student: 'Sofía Navarro', studentId: '7391', level: 'A - Advanced' },
  { student: 'Raúl Castillo', studentId: '8450', level: 'B - Beginner' },
  { student: 'Camila Ríos', studentId: '1576', level: 'I - Intermediate' },
  { student: 'Nicolás Vega', studentId: '2684', level: 'A - Advanced' },
  { student: 'Mariana Cruz', studentId: '3795', level: 'B - Beginner' },
  { student: 'Hugo Salas', studentId: '4806', level: 'I - Intermediate' },
  { student: 'Elena Fuentes', studentId: '5917', level: 'A - Advanced' },
  { student: 'Jorge Molina', studentId: '6028', level: 'B - Beginner' },
  { student: 'Paula Reyes', studentId: '7139', level: 'I - Intermediate' },
  { student: 'Iván Campos', studentId: '8240', level: 'A - Advanced' },
  { student: 'Daniela León', studentId: '9351', level: 'B - Beginner' },
  { student: 'Óscar Pineda', studentId: '1462', level: 'I - Intermediate' },
  { student: 'Gabriela Soto', studentId: '2573', level: 'A - Advanced' },
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

const initialRooms = Array.from({ length: 3 }, (_, index) => ({
  id: index + 1,
  teacher: '',
  classroom: '',
  lesson: '',
  class: '',
  level: 'B - Beginner',
  studentIds: [],
  locked: false,
}));

const LEVEL_COLORS = {
  'B - Beginner': '#22c55e',
  'I - Intermediate': '#f59e0b',
  'A - Advanced': '#2563eb',
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
  const scheduleHours = [8, 9, 10, 11, 12, 12, 12, 12, 13, 13, 13, 13, 14, 14, 14, 14, 15, 15, 15, 15, 16, 17, 18, 19];

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
  const [rooms, setRooms] = useState(initialRooms);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isRoomViewMode, setIsRoomViewMode] = useState(false);

  const todayReservations = useMemo(() => buildReservationsForDate(today.iso), [today.iso]);
  const tomorrowReservations = useMemo(() => buildReservationsForDate(tomorrow.iso), [tomorrow.iso]);

  const todayActiveReservations = useMemo(() => {
    const currentDate = new Date();
    const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

    return [...todayReservations]
      .filter((reservation) => reservation.startHour * 60 >= currentMinutes)
      .sort((a, b) => a.startHour - b.startHour);
  }, [todayReservations]);

  const activeReservations = useMemo(() => {
    if (activeTab === 'today') {
      return todayActiveReservations;
    }

    return [...tomorrowReservations].sort((a, b) => a.startHour - b.startHour);
  }, [activeTab, todayActiveReservations, tomorrowReservations]);

  const nextClassHour = todayActiveReservations[0]?.startHour;
  const nextClassReservations = useMemo(
    () => todayActiveReservations.filter((reservation) => reservation.startHour === nextClassHour),
    [nextClassHour, todayActiveReservations],
  );
  const assignedStudentIds = useMemo(
    () => new Set(rooms.flatMap((room) => room.studentIds)),
    [rooms],
  );
  const unassignedStudents = nextClassReservations.filter(
    (reservation) => !assignedStudentIds.has(reservation.id),
  );
  const occupiedRooms = rooms.filter((room) => room.studentIds.length > 0);

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

  const handleRoomFieldChange = (roomId, field, value) => {
    setRooms((currentRooms) => currentRooms.map((room) => {
      if (room.id !== roomId) {
        return room;
      }

      return field === 'class' && value !== 'Class'
        ? { ...room, class: value, lesson: '' }
        : { ...room, [field]: value };
    }));
  };

  const addRoom = () => {
    setRooms((currentRooms) => [
      ...currentRooms,
      {
        id: Math.max(0, ...currentRooms.map((room) => room.id)) + 1,
        teacher: '',
        classroom: '',
        lesson: '',
        class: '',
        level: 'B - Beginner',
        studentIds: [],
        locked: false,
      },
    ]);
  };

  const toggleRoomLock = (roomId) => {
    setRooms((currentRooms) => currentRooms.map((room) => (
      room.id === roomId ? { ...room, locked: !room.locked } : room
    )));
  };

  const deleteRoom = (roomId) => {
    const confirmed = window.confirm('¿Eliminar este salón?');

    if (!confirmed) {
      return;
    }

    setRooms((currentRooms) => currentRooms.filter((room) => room.id !== roomId));
    setSelectedStudentId(null);
  };

  const handleRoomClick = (roomId) => {
    if (!selectedStudentId) {
      return;
    }

    setRooms((currentRooms) => currentRooms.map((room) => (
      room.id === roomId
        ? { ...room, studentIds: [...room.studentIds, selectedStudentId] }
        : room
    )));
    setSelectedStudentId(null);
  };

  const removeStudentFromRoom = (roomId, studentId) => {
    setRooms((currentRooms) => currentRooms.map((room) => (
      room.id === roomId
        ? { ...room, studentIds: room.studentIds.filter((id) => id !== studentId) }
        : room
    )));
  };

  const resetRoomAssignments = () => {
    setRooms((currentRooms) => currentRooms.map((room) => ({ ...room, studentIds: [] })));
    setSelectedStudentId(null);
  };

  const getReservationById = (studentId) => (
    nextClassReservations.find((reservation) => reservation.id === studentId)
  );

  return (
    <div className="reception-shell">
      <div className="reception-header">
        <div>
          <p className="eyebrow">Reservas</p>
          <h1>Recepción</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="date-pill">{displayLabel.formatted}</div>
          <Link
            to="/login"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              opacity: 0.95,
            }}
          >
            Volver al login
          </Link>
        </div>
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
        <button
          type="button"
          className={activeTab === 'rooms' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('rooms')}
        >
          Salones
        </button>
      </div>

      {!(activeTab === 'rooms' && isRoomViewMode) && <section className="reception-toolbar">
        <label className="search-field" htmlFor="reservation-search">
          <span>Buscar</span>
          <input
            id="reservation-search"
            type="text"
            placeholder={activeTab === 'students' ? 'Nombre o ID' : 'Nombre o ID'}
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
      </section>}

      {activeTab === 'rooms' ? (
        <section className={`rooms-panel${isRoomViewMode ? ' rooms-panel-fullscreen' : ''}`}>
          <div className="rooms-header">
            <div>
              {!isRoomViewMode && <p className="eyebrow rooms-eyebrow">Acomodo manual</p>}
              <h2>{nextClassHour === undefined ? 'No hay una próxima clase pendiente de acomodar.' : isRoomViewMode ? `${String(nextClassHour).padStart(2, '0')}:00 hrs` : `Acomodando clase de las ${String(nextClassHour).padStart(2, '0')}:00 hrs`}</h2>
            </div>
            <div className="rooms-header-actions">
              {!isRoomViewMode && (
                <button type="button" className="btn-secondary" onClick={resetRoomAssignments}>
                  Reiniciar acomodo
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setIsRoomViewMode((current) => !current)}>
                {isRoomViewMode ? 'Modo edición' : 'Modo vista'}
              </button>
            </div>
          </div>

          {isRoomViewMode ? (
            occupiedRooms.length === 0 ? (
              <div className="rooms-view-empty">Aún no hay salones asignados para esta hora.</div>
            ) : (
              <div className="rooms-grid rooms-grid-view">
                {occupiedRooms.map((room) => (
                  <article key={room.id} className="room-card room-card-view">
                    <div className="room-view-header">
                      <strong>Classroom {room.classroom || room.id}</strong>
                      <span>Teacher: {room.teacher || 'Sin asignar'}</span>
                      <span className="room-view-level" style={{ '--level-color': LEVEL_COLORS[room.level] }}>
                        <span className="level-swatch" />{room.level.charAt(0)}
                      </span>
                    </div>
                    <div className="room-view-details">
                      <div><span>Clase</span><strong>{room.class || 'Sin asignar'}</strong></div>
                      {room.lesson && (
                        <div><span>Lección</span><strong>{room.lesson}</strong></div>
                      )}
                    </div>
                    <div className="assigned-students room-view-students">
                      {room.studentIds.map((studentId) => {
                        const student = getReservationById(studentId);

                        return student ? (
                          <div
                            key={student.id}
                            className="assigned-student assigned-student-view"
                            style={{ '--level-color': LEVEL_COLORS[student.level] }}
                          >
                            <strong>{student.studentId}</strong>
                            <span className="student-level-marker">
                              <span className="level-swatch" />{student.level.charAt(0)}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : nextClassHour !== undefined && (
            <>
              <div className="student-pool">
                <div className="pool-heading">
                  <h3>Alumnos por acomodar</h3>
                  <span>{unassignedStudents.length} pendientes</span>
                </div>
                <div className="level-legend" aria-label="Niveles por color">
                  <span className="level-legend-item"><span className="level-swatch" style={{ '--level-color': LEVEL_COLORS['B - Beginner'] }} />B Beginner</span>
                  <span className="level-legend-item"><span className="level-swatch" style={{ '--level-color': LEVEL_COLORS['I - Intermediate'] }} />I Intermediate</span>
                  <span className="level-legend-item"><span className="level-swatch" style={{ '--level-color': LEVEL_COLORS['A - Advanced'] }} />A Advanced</span>
                </div>
                {unassignedStudents.length === 0 ? (
                  <p className="pool-empty">Todos los alumnos están acomodados.</p>
                ) : (
                  <div className="student-chips">
                    {unassignedStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        className={selectedStudentId === student.id ? 'student-chip selected' : 'student-chip'}
                        style={{ '--level-color': LEVEL_COLORS[student.level] }}
                        onClick={() => setSelectedStudentId(student.id)}
                      >
                        <strong>{student.studentId}</strong>
                        <span>{student.level.charAt(0)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rooms-grid">
                {rooms.map((room) => (
                  <article
                    key={room.id}
                    className={`${selectedStudentId && !room.locked ? 'room-card ready' : 'room-card'}${room.locked ? ' locked' : ''}`}
                    onClick={() => !room.locked && handleRoomClick(room.id)}
                  >
                    <div className="room-card-header">
                      <label className="room-header-label">
                        <span>Classroom</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={room.classroom}
                          disabled={room.locked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleRoomFieldChange(room.id, 'classroom', event.target.value)}
                          placeholder={String(room.id)}
                        />
                      </label>
                      <div className="room-card-actions">
                        <span>{room.studentIds.length} alumnos</span>
                        <button
                          type="button"
                          className="room-lock-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRoomLock(room.id);
                          }}
                        >
                          {room.locked ? 'Desbloquear' : 'Bloquear salón'}
                        </button>
                        <button
                          type="button"
                          className="room-delete-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteRoom(room.id);
                          }}
                          aria-label={`Eliminar salón ${room.classroom || room.id}`}
                          title="Eliminar salón"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="room-fields">
                      <label className="room-field">
                        <span>Teacher</span>
                        <input
                          type="text"
                          value={room.teacher}
                          disabled={room.locked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleRoomFieldChange(room.id, 'teacher', event.target.value)}
                          placeholder="Nombre del maestro"
                        />
                      </label>
                      <label className="room-field">
                        <span>Clase</span>
                        <select
                          value={room.class}
                          disabled={room.locked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleRoomFieldChange(room.id, 'class', event.target.value)}
                        >
                          <option value="">Seleccionar clase</option>
                          <option value="Class">Class</option>
                          <option value="Club">Club</option>
                          <option value="Rosetta">Rosetta</option>
                          <option value="Chat">Chat</option>
                          <option value="Examen">Examen</option>
                        </select>
                      </label>
                      {room.class === 'Class' && (
                        <label className="room-field">
                          <span>Número de lección</span>
                          <input
                            type="number"
                            min="1"
                            value={room.lesson}
                            disabled={room.locked}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => handleRoomFieldChange(room.id, 'lesson', event.target.value)}
                            placeholder="Ej. 4"
                          />
                        </label>
                      )}
                      <label className="room-field">
                        <span>Level</span>
                        <select
                          value={room.level}
                          disabled={room.locked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleRoomFieldChange(room.id, 'level', event.target.value)}
                        >
                          <option value="B - Beginner">B - Beginner</option>
                          <option value="I - Intermediate">I - Intermediate</option>
                          <option value="A - Advanced">A - Advanced</option>
                        </select>
                      </label>
                    </div>
                    <div className="assigned-students">
                      {room.studentIds.length === 0 ? (
                        <p className="assigned-empty">Sin alumnos asignados</p>
                      ) : (
                        room.studentIds.map((studentId) => {
                          const student = getReservationById(studentId);

                          return student ? (
                            <button
                              key={student.id}
                              type="button"
                              className="assigned-student"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!room.locked) {
                                  removeStudentFromRoom(room.id, student.id);
                                }
                              }}
                              title="Regresar al pool"
                            >
                              <strong>{student.studentId}</strong>
                              <span className="student-level-marker" style={{ '--level-color': LEVEL_COLORS[student.level] }}>
                                <span className="level-swatch" />{student.level.charAt(0)} ×
                              </span>
                            </button>
                          ) : null;
                        })
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <button type="button" className="add-room-button" onClick={addRoom}>
                + Agregar salón
              </button>
            </>
          )}
        </section>
      ) : activeTab === 'students' ? (
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
