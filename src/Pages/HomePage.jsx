import React, { useMemo, useState } from 'react'
import ContractHero from '../Components/ContractHero'
import SchoolFooter from '../Components/SchoolFooter'
import ScheduleSection from '../Components/ScheduleSection'
import SelectionActionBar from '../Components/SelectionActionBar'
import StudentNavbar from '../Components/StudentNavbar'
import { formatHour } from '../Services/scheduleUtils'
import './HomePage.css'

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const scheduleHours = Array.from({ length: 13 }, (_, index) => index + 7)
const studentHours = 6
const fullSlots = new Set(['Lunes-9', 'Martes-13', 'Miércoles-17', 'Jueves-8', 'Viernes-19', 'Sábado-11'])

const createSlots = (day, startHour, endHour) => Array.from({ length: endHour - startHour }, (_, index) => {
  const hour = startHour + index
  return { id: `${day}-${hour}`, day, hour, time: `${formatHour(hour)} - ${formatHour(hour + 1)}` }
})

export default function HomePage() {
  const [selectedSlots, setSelectedSlots] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [modality, setModality] = useState('presencial')

  const slotsByDay = useMemo(() => weekDays.reduce((slots, day) => {
    slots[day] = createSlots(day, day === 'Sábado' ? 8 : 7, day === 'Sábado' ? 15 : 20)
    return slots
  }, {}), [])

  const toggleSlot = (slot) => {
    if (!slot || fullSlots.has(slot.id) || confirmed) return
    setSelectedSlots((currentSlots) => {
      if (currentSlots.some((currentSlot) => currentSlot.id === slot.id)) {
        return currentSlots.filter((currentSlot) => currentSlot.id !== slot.id)
      }
      return currentSlots.length < studentHours ? [...currentSlots, slot] : currentSlots
    })
  }

  const getSlotStatus = (slot) => {
    if (!slot) return 'unavailable'
    if (fullSlots.has(slot.id)) return 'full'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    return 'available'
  }

  return <div className="student-portal">
    <StudentNavbar />
    <main className="student-main">
      <ContractHero modality={modality} onModalityChange={setModality} selectedCount={selectedSlots.length} studentHours={studentHours} />
      <ScheduleSection confirmed={confirmed} formatHour={formatHour} getSlotStatus={getSlotStatus} onSlotToggle={toggleSlot} scheduleHours={scheduleHours} slotsByDay={slotsByDay} weekDays={weekDays} />
    </main>
    <SelectionActionBar confirmed={confirmed} formatHour={formatHour} onConfirm={() => setConfirmed(true)} selectedSlots={selectedSlots} studentHours={studentHours} />
    <SchoolFooter />
  </div>
}
