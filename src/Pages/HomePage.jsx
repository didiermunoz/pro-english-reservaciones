import React, { useEffect, useMemo, useState } from 'react'
import ContractHero from '../Components/ContractHero'
import SchoolFooter from '../Components/SchoolFooter'
import ScheduleSection from '../Components/ScheduleSection'
import SelectionActionBar from '../Components/SelectionActionBar'
import StudentNavbar from '../Components/StudentNavbar'
import WeekProgress from '../Components/WeekProgress'
import { formatDate, formatHour, getMonday, getSelectableDates, toDateKey, weekDayNames } from '../Services/scheduleUtils'
import { api } from '../Services/api'
import { useStudent } from '../Services/useStudent'
import './HomePage.css'

const scheduleHours = Array.from({ length: 13 }, (_, index) => index + 7)
const createSlots = (date, startHour, endHour) => Array.from({ length: endHour - startHour }, (_, index) => {
  const hour = startHour + index
  const day = weekDayNames[date.getDay()]
  return { id: `${toDateKey(date)}-${hour}`, dateKey: toDateKey(date), day, hour, time: `${formatHour(hour)} - ${formatHour(hour + 1)}` }
})

export default function HomePage({ onNavigate }) {
  const { currentStudent, reservations, token, createReservations } = useStudent()
  const [selectedSlots, setSelectedSlots] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [availability, setAvailability] = useState([])
  const [availabilityError, setAvailabilityError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [attendanceMode, setAttendanceMode] = useState('in-person')
  const now = new Date()
  const simulatedHour = now.getHours()
  const studentHours = Number(currentStudent?.contract?.weeklyHours || 0)
  const scheduleClosed = simulatedHour >= 20

  // Fechas derivadas
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = getMonday(new Date())
    date.setDate(date.getDate() + index)
    return date
  }), [])

  const selectableDates = useMemo(() => getSelectableDates(new Date()).map((date) => ({
    date,
    day: weekDayNames[date.getDay()],
    label: formatDate(date),
    key: toDateKey(date),
  })), [])

  // Slots
  const slotsByDate = useMemo(() => selectableDates.reduce((slots, { date, key }) => {
    const isSaturday = date.getDay() === SATURDAY
    const startHour = isSaturday ? SATURDAY_START_HOUR : WEEKDAY_START_HOUR
    const endHour = isSaturday ? SATURDAY_END_HOUR : WEEKDAY_END_HOUR
    slots[key] = createSlots(date, startHour, endHour)
    return slots
  }, {}), [selectableDates])

  useEffect(() => {
    let active = true
    const refreshAvailability = () => api.availability(token, selectableDates.map((date) => date.dateKey))
      .then((payload) => {
        if (!active) return
        const slots = payload.slots || []
        setAvailability(slots)
        setAvailabilityError('')
        setSelectedSlots((current) => current.filter((selected) => slots.some((slot) => slot.dateKey === selected.dateKey && slot.hour === selected.hour && slot.available && !slot.reservedByStudent)))
      })
      .catch((error) => { if (active) setAvailabilityError(error.message) })
    refreshAvailability()
    const interval = window.setInterval(refreshAvailability, 30000)
    window.addEventListener('focus', refreshAvailability)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshAvailability)
    }
  }, [token, selectableDates])

  const weekStartKey = toDateKey(weekDates[0])
  const weekEndKey = useMemo(() => {
    const date = new Date(weekDates[0]) 
    date.setDate(date.getDate() + 7)
    return toDateKey(date)
  }, [weekDates])
  const weekReservations = useMemo(() => reservations.filter((reservation) => (
    ['Confirmada', 'Completada'].includes(reservation.status) && reservation.dateKey >= weekStartKey && reservation.dateKey < weekEndKey
  )), [reservations, weekStartKey, weekEndKey])
  const bookedHours = weekReservations.reduce((total, reservation) => total + reservation.endHour - reservation.startHour, 0)
  const scheduledSlotIds = useMemo(() => new Set(weekReservations.flatMap((reservation) => (
    Array.from({ length: reservation.endHour - reservation.startHour }, (_, index) => `${reservation.dateKey}-${reservation.startHour + index}`)
  ))), [weekReservations])
  const totalScheduledHours = bookedHours + selectedSlots.length
  const completedClasses = useMemo(() => reservations.filter((item) => item.status === 'Completada').map((item) => ({
    id: item.id,
    dateKey: item.dateKey,
    lesson: item.lesson,
    time: `${formatHour(item.startHour)} - ${formatHour(item.endHour)}`,
  })), [reservations])
  const availabilityBySlot = useMemo(() => new Map(availability.map((item) => [`${item.dateKey}-${item.hour}`, item])), [availability])

  const toggleSlot = (slot) => {
    if (scheduleClosed || !slot || availabilityBySlot.get(`${slot.dateKey}-${slot.hour}`)?.available !== true || scheduledSlotIds.has(`${slot.dateKey}-${slot.hour}`) || confirmed || studentHours === 0) return
    setSelectedSlots((currentSlots) => {
      if (currentSlots.some((currentSlot) => currentSlot.id === slot.id)) {
        return currentSlots.filter((currentSlot) => currentSlot.id !== slot.id)
      }
      return currentSlots.length < Math.max(0, studentHours - bookedHours) ? [...currentSlots, slot] : currentSlots
    })
  }

  const getSlotStatus = (slot) => {
    if (scheduleClosed || !slot || availabilityError || !availability.length) return 'unavailable'
    const slotAvailability = availabilityBySlot.get(`${slot.dateKey}-${slot.hour}`)
    if (!slotAvailability) return 'unavailable'
    if (scheduledSlotIds.has(`${slot.dateKey}-${slot.hour}`) || slotAvailability.reservedByStudent) return 'booked'
    if (!slotAvailability.available) return 'full'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    return 'available'
  }

  const confirmSchedule = async () => {
    setLoading(true)
    setNotice('')
    try {
      await createReservations(selectedSlots, attendanceMode)
      setSelectedSlots([])
      setConfirmed(true)
      setNotice('Reservaciones guardadas correctamente.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setLoading(false)
    }
  }

  return <div className="student-portal">
    <StudentNavbar onNavigate={onNavigate} />
    <main className="student-main">
      <ContractHero student={currentStudent} selectedCount={totalScheduledHours} studentHours={studentHours} attendanceMode={attendanceMode} onAttendanceModeChange={setAttendanceMode} />
      {availabilityError && <p className="schedule-closed" role="alert">{availabilityError}</p>}
      {notice && <p className="profile-alert" role="status">{notice}</p>}
      {!currentStudent.contract && <p className="schedule-closed" role="status">No tienes un contrato activo asociado a tu cuenta.</p>}
      <ScheduleSection closed={scheduleClosed} confirmed={confirmed} formatHour={formatHour} getSlotStatus={getSlotStatus} onSlotToggle={toggleSlot} scheduleHours={scheduleHours} selectableDates={selectableDates} slotsByDate={slotsByDate} />
      <WeekProgress completedClasses={completedClasses} weekDates={weekDates} />
    </main>
    <SelectionActionBar confirmed={confirmed} formatHour={formatHour} onConfirm={confirmSchedule} selectedSlots={selectedSlots} studentHours={Math.max(0, studentHours - bookedHours)} loading={loading} />
    <SchoolFooter />
  </div>
}
 