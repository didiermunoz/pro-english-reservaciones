import { formatDate, toDateKey } from '../Services/scheduleUtils'

export default function WeekProgress({ weekDates, completedClasses }) {
  return <section className="week-progress" aria-labelledby="progress-title">
    <div className="progress-heading"><div><span className="eyebrow">SEGUIMIENTO SEMANAL</span><h2 id="progress-title">Tu avance de la semana</h2><p>Consulta qué clases ya tomaste y cuál fue la lección registrada.</p></div><strong className="progress-total">{completedClasses.length} clases tomadas</strong></div>
    <div className="progress-calendar">{weekDates.map((date) => {
      const classes = completedClasses.filter((item) => item.dateKey === toDateKey(date))
      return <article className={`progress-day ${classes.length ? 'has-classes' : ''}`} key={toDateKey(date)}><div className="progress-day-heading"><strong>{date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}</strong><span>{formatDate(date)}</span></div><div className="progress-day-body">{classes.length ? classes.map((item) => <div className="class-record" key={item.id}><span className="class-check">✓</span><span><strong>{item.lesson}</strong><small>{item.time}</small></span></div>) : <span className="no-class">Sin clases registradas</span>}</div><footer>{classes.length} {classes.length === 1 ? 'clase' : 'clases'}</footer></article>
    })}</div>
  </section>
}