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

const SATURDAY = 6
const WEEKDAY_START_HOUR = 7
const WEEKDAY_END_HOUR = 21
const SATURDAY_START_HOUR = 8
const SATURDAY_END_HOUR = 15

const scheduleHours = Array.from({ length: 14 }, (_, index) => index + 7)
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
  const [bookingType, setBookingType] = useState('Clase')
  const studentHours = Number(currentStudent?.contract?.weeklyHours || 0)
  const rosettaPlan = currentStudent?.rosetta?.plan || 'ninguno'
  const hasRosetta = rosettaPlan === 'ilimitado' || rosettaPlan === 'paquete'
  // Rosetta 'ilimitado' se descuenta de las horas semanales; 'paquete' tiene su propio contador.
  const countsWeekly = (type) => type !== 'Rosetta' || rosettaPlan === 'ilimitado'

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
    const refreshAvailability = () => api.availability(token, selectableDates.map((date) => date.key))
      .then((payload) => {
        if (!active) return
        const slots = payload.slots || []
        setAvailability(slots)
        setAvailabilityError('')
        setSelectedSlots((current) => current.filter((selected) => slots.some((slot) => slot.dateKey === selected.dateKey && slot.hour === selected.hour && (selected.type === 'Rosetta' ? slot.rosettaAvailable : slot.available) && !slot.reservedByStudent)))
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
  const bookedHours = weekReservations.filter((reservation) => countsWeekly(reservation.type)).reduce((total, reservation) => total + reservation.endHour - reservation.startHour, 0)
  const scheduledSlotIds = useMemo(() => new Set(weekReservations.flatMap((reservation) => (
    Array.from({ length: reservation.endHour - reservation.startHour }, (_, index) => `${reservation.dateKey}-${reservation.startHour + index}`)
  ))), [weekReservations])
  const selectedWeeklyHours = selectedSlots.filter((slot) => countsWeekly(slot.type)).length
  const selectedRosettaHours = selectedSlots.filter((slot) => slot.type === 'Rosetta').length
  const totalScheduledHours = bookedHours + selectedWeeklyHours
  const weeklyRemaining = Math.max(0, studentHours - totalScheduledHours)
  const rosettaRemaining = rosettaPlan === 'paquete' ? Math.max(0, (currentStudent.rosetta.remainingHours ?? 0) - selectedRosettaHours) : null
  const typeLimitReached = (type) => (countsWeekly(type) && weeklyRemaining <= 0) || (type === 'Rosetta' && rosettaPlan === 'paquete' && rosettaRemaining <= 0)
  const completedClasses = useMemo(() => reservations.filter((item) => item.status === 'Completada').map((item) => ({
    id: item.id,
    dateKey: item.dateKey,
    lesson: item.lesson,
    time: `${formatHour(item.startHour)} - ${formatHour(item.endHour)}`,
  })), [reservations])
  const availabilityBySlot = useMemo(() => new Map(availability.map((item) => [`${item.dateKey}-${item.hour}`, item])), [availability])

  const toggleSlot = (slot) => {
    if (!slot || confirmed || scheduledSlotIds.has(`${slot.dateKey}-${slot.hour}`)) return
    if (selectedSlots.some((currentSlot) => currentSlot.id === slot.id)) {
      setSelectedSlots((currentSlots) => currentSlots.filter((currentSlot) => currentSlot.id !== slot.id))
      return
    }
    const slotAvailability = availabilityBySlot.get(`${slot.dateKey}-${slot.hour}`)
    const isOpen = bookingType === 'Rosetta' ? slotAvailability?.rosettaAvailable === true : slotAvailability?.available === true
    if (!isOpen || typeLimitReached(bookingType) || (bookingType === 'Rosetta' && !hasRosetta)) return
    setSelectedSlots((currentSlots) => [...currentSlots, { ...slot, type: bookingType }])
  }
  // Tipo (Clase o Rosetta) con que está reservada o elegida una hora, para mostrarlo en la lista.
  const getSlotType = (slot) => {
    if (!slot) return null
    const key = `${slot.dateKey}-${slot.hour}`
    return selectedSlots.find((selected) => selected.id === slot.id)?.type
      || weekReservations.find((reservation) => reservation.dateKey === slot.dateKey && reservation.startHour <= slot.hour && reservation.endHour > slot.hour)?.type
      || availabilityBySlot.get(key)?.reservedType
      || null
  }

  const getSlotStatus = (slot) => {
    if (!slot || availabilityError || !availability.length) return 'unavailable'
    const slotAvailability = availabilityBySlot.get(`${slot.dateKey}-${slot.hour}`)
    if (!slotAvailability) return 'unavailable'
    if (scheduledSlotIds.has(`${slot.dateKey}-${slot.hour}`) || slotAvailability.reservedByStudent) return 'booked'
    if (selectedSlots.some((selectedSlot) => selectedSlot.id === slot.id)) return 'selected'
    if (!(bookingType === 'Rosetta' ? slotAvailability.rosettaAvailable : slotAvailability.available)) return 'full'
    if (typeLimitReached(bookingType)) return 'limit'
    return 'available'
  }

  const confirmSchedule = async () => {
    setLoading(true)
    setNotice('')
    try {
      await createReservations(selectedSlots)
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
      <ContractHero student={currentStudent} selectedCount={totalScheduledHours} studentHours={studentHours} rosettaRemaining={rosettaRemaining} />
      {availabilityError && <p className="schedule-closed" role="alert">{availabilityError}</p>}
      {notice && <p className="profile-alert" role="status">{notice}</p>}
      {!currentStudent.contract && <p className="schedule-closed" role="status">No tienes un contrato activo asociado a tu cuenta.</p>}
      <ScheduleSection bookingType={bookingType} confirmed={confirmed} formatHour={formatHour} getSlotStatus={getSlotStatus} getSlotType={getSlotType} hasRosetta={hasRosetta} onBookingTypeChange={setBookingType} onSlotToggle={toggleSlot} rosettaPlan={rosettaPlan} rosettaRemaining={rosettaRemaining} scheduleHours={scheduleHours} selectableDates={selectableDates} slotsByDate={slotsByDate} />
      <WeekProgress completedClasses={completedClasses} weekDates={weekDates} />
    </main> 
    <SelectionActionBar confirmed={confirmed} formatHour={formatHour} onConfirm={confirmSchedule} selectedSlots={selectedSlots} studentHours={Math.max(0, studentHours - bookedHours)} rosettaRemaining={rosettaRemaining} loading={loading} />
    <SchoolFooter /> 
  </div> 
}