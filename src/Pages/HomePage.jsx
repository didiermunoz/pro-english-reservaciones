import React, { useMemo, useState } from 'react'
import ContractHero from '../Components/ContractHero'
import SchoolFooter from '../Components/SchoolFooter'
import ScheduleSection from '../Components/ScheduleSection'
import SelectionActionBar from '../Components/SelectionActionBar'
import StudentNavbar from '../Components/StudentNavbar'
import WeekProgress from '../Components/WeekProgress'
import { formatDate, getMonday, getSelectableDates, toDateKey, weekDayNames } from '../Services/scheduleUtils'
import './HomePage.css'

const studentHours = 6
const scheduleHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

function createSlots(date, startHour, endHour) {
  return Array.from({ length: endHour - startHour }, (_, index) => {
    const hour = startHour + index
    return { id: `${toDateKey(date)}-${hour}`, day: weekDayNames[date.getDay()], hour, time: formatHour(hour) }
  })
}

export default function HomePage({ onNavigate, onLogout, onReserve, reservations, user }) {
  const [selectedSlots, setSelectedSlots] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [modality, setModality] = useState('presencial')
  const [simulatedDay, setSimulatedDay] = useState(() => new Date().getDay() || 1)
  const reservedSlotIds = useMemo(() => new Set(reservations.flatMap((reservation) => (
    Array.from({ length: reservation.endHour - reservation.startHour }, (_, index) => `${reservation.dateKey}-${reservation.startHour + index}`)
  ))), [reservations])

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = getMonday(new Date())
    date.setDate(date.getDate() + index)
    return date
  }), [])

  const simulatedDate = useMemo(() => {
    const date = getMonday(new Date())
    date.setDate(date.getDate() + simulatedDay - 1)
    return date
  }, [simulatedDay])

  const selectableDates = useMemo(() => getSelectableDates(simulatedDate).map((date) => ({
    date,
    dateKey: toDateKey(date),
    day: weekDayNames[date.getDay()],
    label: formatDate(date),
    key: toDateKey(date),
  })), [simulatedDate])

  const slotsByDate = useMemo(() => selectableDates.reduce((slots, { date, key }) => {
    slots[key] = createSlots(date, date.getDay() === 6 ? 8 : 7, date.getDay() === 6 ? 15 : 20)
    return slots
  }, {}), [selectableDates])

  const completedClasses = useMemo(() => [
    { id: 'completed-1', dateKey: toDateKey(weekDates[0]), lesson: 'Present Simple', time: '09:00 AM' },
    { id: 'completed-2', dateKey: toDateKey(weekDates[2]), lesson: 'Past Continuous', time: '05:00 PM' },
  ], [weekDates])

  const toggleSlot = (slot) => {
    if (!slot || reservedSlotIds.has(slot.id) || confirmed) return

    const isSelected = selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)
    if (!isSelected && selectedSlots.length >= studentHours) {
      alert(`Has alcanzado el límite de ${studentHours} horas. Deselecciona una hora y elige otra.`)
      return
    }

    setSelectedSlots((currentSlots) => {
      if (isSelected) {
        return currentSlots.filter((currentSlot) => currentSlot.id !== slot.id)
      }
      return [...currentSlots, slot]
    })
  }

  const getSlotStatus = (slot) => {
    if (!slot) return 'unavailable'
    if (reservedSlotIds.has(slot.id)) return 'full'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    return 'available'
  }

  const handleSimulatedDayChange = (day) => {
    setSimulatedDay(day)
    setSelectedSlots([])
    setConfirmed(false)
  }

  const handleConfirm = () => {
    onReserve(selectedSlots)
    setConfirmed(true)
  }

  return <div className="student-portal">
    <StudentNavbar activeView="home" onLogout={onLogout} onNavigate={onNavigate} user={user} />
    <main className="student-main">
      <ContractHero modality={modality} onModalityChange={setModality} onSimulatedDayChange={handleSimulatedDayChange} selectedCount={selectedSlots.length} simulatedDay={simulatedDay} studentHours={studentHours} user={user} />
      <ScheduleSection confirmed={confirmed} formatHour={formatHour} getSlotStatus={getSlotStatus} onSlotToggle={toggleSlot} scheduleHours={scheduleHours} selectableDates={selectableDates} slotsByDate={slotsByDate} />
      <WeekProgress completedClasses={completedClasses} weekDates={weekDates} />
    </main>
    <SelectionActionBar confirmed={confirmed} formatHour={formatHour} onConfirm={handleConfirm} selectedSlots={selectedSlots} studentHours={studentHours} />
    <SchoolFooter />
  </div>
}