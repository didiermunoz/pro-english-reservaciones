import React, { useMemo, useState } from 'react';
import './reception.css';

const getTomorrowLabel = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    date: tomorrow,
    iso: tomorrow.toISOString().split('T')[0],
    formatted: tomorrow.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
};

const dummyReservations = [
  { id: 1, student: 'José Ramírez', studentId: '2048', level: 'A - Advanced', startHour: 9, date: '2026-09-10' },
  { id: 2, student: 'Diego Lara', studentId: '4444', level: 'A - Advanced', startHour: 11, date: '2026-09-10' },
  { id: 3, student: 'Didier Camargo', studentId: '5665', level: 'A - Advanced', startHour: 13, date: '2026-09-10' },
  { id: 4, student: 'Diego Torres', studentId: '2256', level: 'A - Advanced', startHour: 15, date: '2026-09-10' },
  { id: 5, student: 'Valeria Gómez', studentId: '4411', level: 'B - Beginner', startHour: 16, date: '2026-09-10' },
  { id: 6, student: 'Mateo Ruiz', studentId: '5637', level: 'I - Intermediate', startHour: 18, date: '2026-09-10' },
  { id: 7, student: 'Andrea Flores', studentId: '7823', level: 'A - Advanced', startHour: 19, date: '2026-09-10' },
  { id: 8, student: 'Fernando Silva', studentId: '9014', level: 'B - Beginner', startHour: 17, date: '2026-09-10' },
];

const formatBlock = (startHour) => `${String(startHour).padStart(2, '0')}:00 - ${String(startHour + 1).padStart(2, '0')}:00`;

const Reception = () => {
  const tomorrow = useMemo(() => getTomorrowLabel(), []);
  const [query, setQuery] = useState('');
  const [selectedHour, setSelectedHour] = useState('all');

  const timeOptions = useMemo(() => {
    const hours = [...new Set(dummyReservations.map((item) => item.startHour))].sort((a, b) => a - b);
    return hours.map((hour) => ({ value: String(hour), label: formatBlock(hour) }));
  }, []);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...dummyReservations]
      .filter((reservation) => reservation.date === tomorrow.iso)
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
  }, [query, selectedHour, tomorrow.iso]);

  return (
    <div className="reception-shell">
      <div className="reception-header">
        <div>
          <p className="eyebrow">Reservas</p>
          <h1>Recepción</h1>
        </div>
        <div className="date-pill">{tomorrow.formatted}</div>
      </div>

      <section className="reception-toolbar">
        <label className="search-field" htmlFor="reservation-search">
          <span>Buscar</span>
          <input
            id="reservation-search"
            type="text"
            placeholder="Nombre o ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

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
      </section>

      <section className="reception-panel">
        <div className="panel-header">
          <h2>Proximas clases</h2>
          <span>{filteredReservations.length} {filteredReservations.length === 1 ? 'reserva' : 'reservas'}</span>
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
    </div>
  );
};

export default Reception;
