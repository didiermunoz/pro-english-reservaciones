import { useEffect, useState } from 'react'
import { weekDayNames } from '../Services/scheduleUtils'

export default function CurrentDateTime({ simulatedDay, onSimulatedDayChange }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return <div className="date-time-panel">
    <div className="live-clock"><span className="live-dot" /> <strong>{now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong><span>{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    <label className="day-simulator">Día actual de prueba<select value={simulatedDay} onChange={(event) => onSimulatedDayChange(Number(event.target.value))}>{weekDayNames.slice(1).map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
  </div>
}