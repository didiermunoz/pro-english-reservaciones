import React, { useMemo, useState } from 'react'
import ContractHero from '../Components/ContractHero'
import SchoolFooter from '../Components/SchoolFooter'
import ScheduleSection from '../Components/ScheduleSection'
import SelectionActionBar from '../Components/SelectionActionBar'
import StudentNavbar from '../Components/StudentNavbar'
import WeekProgress from '../Components/WeekProgress'
import { formatDate, formatHour, getMonday, getSelectableDates, toDateKey, weekDayNames } from '../Services/scheduleUtils'
import './HomePage.css'

const SCHEDULE_HOURS = Array.from({ length: 13 }, (_, index) => index + 7)
const STUDENT_WEEKLY_HOURS = 6
const WEEKDAY_START_HOUR = 7
const WEEKDAY_END_HOUR = 20
const SATURDAY = 6
const SATURDAY_START_HOUR = 8
const SATURDAY_END_HOUR = 15
// MOCK: reemplazar por API
const FULL_SLOTS = new Set(['Lunes-9', 'Martes-13', 'Miércoles-17', 'Jueves-8', 'Viernes-19', 'Sábado-11'])

const createSlots = (date, startHour, endHour) => Array.from({ length: endHour - startHour }, (_, index) => {
  const hour = startHour + index
  const day = weekDayNames[date.getDay()]
  return { id: `${toDateKey(date)}-${hour}`, dateKey: toDateKey(date), day, hour, time: `${formatHour(hour)} - ${formatHour(hour + 1)}` }
})

export default function HomePage({ onNavigate }) {
  // Estado
  const [selectedSlots, setSelectedSlots] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [modality, setModality] = useState('presencial')
  const [simulatedDay, setSimulatedDay] = useState(() => new Date().getDay() || 1)

  // Fechas derivadas
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
    day: weekDayNames[date.getDay()],
    label: formatDate(date),
    key: toDateKey(date),
  })), [simulatedDate])

  // Slots
  const slotsByDate = useMemo(() => selectableDates.reduce((slots, { date, key }) => {
    const isSaturday = date.getDay() === SATURDAY
    const startHour = isSaturday ? SATURDAY_START_HOUR : WEEKDAY_START_HOUR
    const endHour = isSaturday ? SATURDAY_END_HOUR : WEEKDAY_END_HOUR
    slots[key] = createSlots(date, startHour, endHour)
    return slots
  }, {}), [selectableDates])

  // MOCK: reemplazar por API
  const completedClasses = useMemo(() => [
    { id: 'completed-1', dateKey: toDateKey(weekDates[0]), lesson: 'Present Simple', time: '09:00 AM' },
    { id: 'completed-2', dateKey: toDateKey(weekDates[2]), lesson: 'Past Continuous', time: '05:00 PM' },
  ], [weekDates])

  // Handlers
  const handleSlotToggle = (slot) => {
    if (!slot || FULL_SLOTS.has(`${slot.day}-${slot.hour}`) || confirmed) return
    setSelectedSlots((currentSlots) => {
      if (currentSlots.some((currentSlot) => currentSlot.id === slot.id)) {
        return currentSlots.filter((currentSlot) => currentSlot.id !== slot.id)
      }
      return currentSlots.length < STUDENT_WEEKLY_HOURS ? [...currentSlots, slot] : currentSlots
    })
  }

  const getSlotStatus = (slot) => {
    if (!slot) return 'unavailable'
    if (FULL_SLOTS.has(`${slot.day}-${slot.hour}`)) return 'full'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    return 'available'
  }

  const handleSimulatedDayChange = (day) => {
    setSimulatedDay(day)
    setSelectedSlots([])
    setConfirmed(false)
  }

  return (
    <div className="student-portal">
      <StudentNavbar onNavigate={onNavigate} />
      <main className="student-main">
        <ContractHero
          modality={modality}
          onModalityChange={setModality}
          onSimulatedDayChange={handleSimulatedDayChange}
          selectedCount={selectedSlots.length}
          simulatedDay={simulatedDay}
          studentHours={STUDENT_WEEKLY_HOURS}
        />
        <ScheduleSection
          confirmed={confirmed}
          formatHour={formatHour}
          getSlotStatus={getSlotStatus}
          onSlotToggle={handleSlotToggle}
          scheduleHours={SCHEDULE_HOURS}
          selectableDates={selectableDates}
          slotsByDate={slotsByDate}
        />
        <WeekProgress completedClasses={completedClasses} weekDates={weekDates} />
      </main>
      <SelectionActionBar
        confirmed={confirmed}
        formatHour={formatHour}
        onConfirm={() => setConfirmed(true)}
        selectedSlots={selectedSlots}
        studentHours={STUDENT_WEEKLY_HOURS}
      />
      <SchoolFooter />
    </div>
  )
}
