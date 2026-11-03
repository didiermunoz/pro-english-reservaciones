import CurrentDateTime from './CurrentDateTime'

export default function ContractHero({ student, selectedCount, studentHours }) {
  const remainingHours = Math.max(0, studentHours - selectedCount)
  const firstName = student?.name?.trim().split(/\s+/)[0] || ''

  return (
    <section className="contract-hero" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <h1 id="welcome-title">Hola, {firstName}</h1>
      </div>
      <CurrentDateTime />
      <p className="hours-remaining">Te quedan {remainingHours} h para reservar esta semana</p>
    </section>
  )
}
