import React, { useMemo, useState } from 'react'
import ContractHero from '../Components/ContractHero'
import SchoolFooter from '../Components/SchoolFooter'
import ScheduleSection from '../Components/ScheduleSection'
import SelectionActionBar from '../Components/SelectionActionBar'
import StudentNavbar from '../Components/StudentNavbar'
import WeekProgress from '../Components/WeekProgress'
import { formatDate, formatHour, getMonday, getSelectableDates, toDateKey, weekDayNames } from '../Services/scheduleUtils'
import './HomePage.css'

const scheduleHours = Array.from({ length: 13 }, (_, index) => index + 7)
const studentHours = 6
const fullSlots = new Set(['Lunes-9', 'Martes-13', 'Miércoles-17', 'Jueves-8', 'Viernes-19', 'Sábado-11'])

const createSlots = (date, startHour, endHour) => Array.from({ length: endHour - startHour }, (_, index) => {
  const hour = startHour + index
  const day = weekDayNames[date.getDay()]
  return { id: `${toDateKey(date)}-${hour}`, dateKey: toDateKey(date), day, hour, time: `${formatHour(hour)} - ${formatHour(hour + 1)}` }
})

export default function HomePage({ onNavigate }) {
  const [selectedSlots, setSelectedSlots] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [modality, setModality] = useState('presencial')
  const [simulatedDay, setSimulatedDay] = useState(() => new Date().getDay() || 1)

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
    if (!slot || fullSlots.has(`${slot.day}-${slot.hour}`) || confirmed) return
    setSelectedSlots((currentSlots) => {
      if (currentSlots.some((currentSlot) => currentSlot.id === slot.id)) {
        return currentSlots.filter((currentSlot) => currentSlot.id !== slot.id)
      }
      return currentSlots.length < studentHours ? [...currentSlots, slot] : currentSlots
    })
  }

  const getSlotStatus = (slot) => {
    if (!slot) return 'unavailable'
    if (fullSlots.has(`${slot.day}-${slot.hour}`)) return 'full'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    return 'available'
  }

  const handleSimulatedDayChange = (day) => {
    setSimulatedDay(day)
    setSelectedSlots([])
    setConfirmed(false)
  }

  return <div className="student-portal">
    <StudentNavbar onNavigate={onNavigate} />
    <main className="student-main">
      <ContractHero modality={modality} onModalityChange={setModality} onSimulatedDayChange={handleSimulatedDayChange} selectedCount={selectedSlots.length} simulatedDay={simulatedDay} studentHours={studentHours} />
      <ScheduleSection confirmed={confirmed} formatHour={formatHour} getSlotStatus={getSlotStatus} onSlotToggle={toggleSlot} scheduleHours={scheduleHours} selectableDates={selectableDates} slotsByDate={slotsByDate} />
      <WeekProgress completedClasses={completedClasses} weekDates={weekDates} />
    </main>
    <SelectionActionBar confirmed={confirmed} formatHour={formatHour} onConfirm={() => setConfirmed(true)} selectedSlots={selectedSlots} studentHours={studentHours} />
    <SchoolFooter />
  </div>
}
