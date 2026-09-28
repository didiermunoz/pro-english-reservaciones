import { formatDate, toDateKey } from '../Services/scheduleUtils'

function ClassRecord({ classRecord }) {
  return (
    <div className="class-record" key={classRecord.id}>
      <span className="class-check">✓</span>
      <span>
        <strong>{classRecord.lesson}</strong>
        <small>{classRecord.time}</small>
      </span>
    </div>
  )
}

function ProgressDay({ date, completedClasses }) {
  const dateKey = toDateKey(date)
  const classes = completedClasses.filter((classRecord) => classRecord.dateKey === dateKey)
  const dayLabel = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
  const classCountLabel = classes.length === 1 ? 'clase' : 'clases'

  return (
    <article className={`progress-day ${classes.length ? 'has-classes' : ''}`} key={dateKey}>
      <div className="progress-day-heading">
        <strong>{dayLabel}</strong>
        <span>{formatDate(date)}</span>
      </div>
      <div className="progress-day-body">
        {classes.length
          ? classes.map((classRecord) => <ClassRecord classRecord={classRecord} key={classRecord.id} />)
          : <span className="no-class">Sin clases registradas</span>}
      </div>
      <footer>{classes.length} {classCountLabel}</footer>
    </article>
  )
}

export default function WeekProgress({ weekDates, completedClasses }) {
  return (
    <section className="week-progress" aria-labelledby="progress-title">
      <div className="progress-heading">
        <div>
          <span className="eyebrow">SEGUIMIENTO SEMANAL</span>
          <h2 id="progress-title">Tu avance de la semana</h2>
          <p>Consulta qué clases ya tomaste y cuál fue la lección registrada.</p>
        </div>
        <strong className="progress-total">{completedClasses.length} clases tomadas</strong>
      </div>
      <div className="progress-calendar">
        {weekDates.map((date) => (
          <ProgressDay date={date} completedClasses={completedClasses} key={toDateKey(date)} />
        ))}
      </div>
    </section>
  )
}