const SUNDAY = 0
const SATURDAY = 6
const SUNDAY_TO_MONDAY_OFFSET = 6

export const CANCELLATION_MINUTES = 60
export const EXPIRY_WARNING_DAYS = 7

export const formatModality = (modality) => (modality === 'En Linea' ? 'En línea' : modality)

export const getContractExpiry = (endDate, today = new Date()) => {
  if (!endDate) return null
  const days = Math.round((new Date(`${endDate}T00:00:00`) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
  const status = days < 0 ? 'expired' : days <= EXPIRY_WARNING_DAYS ? 'soon' : 'ok'
  return { status, days }
}

export const canCancelReservation = (reservation, now = new Date()) => (
  new Date(`${reservation.dateKey}T${reservation.startTime}:00`) - now >= CANCELLATION_MINUTES * 60000
)

/** Formats a 24-hour value as a localized hour label. */
export const formatHour = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`
}

export const weekDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/** Formats a Date with the short Spanish-Mexico day and month. */
export const formatDate = (date) => new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
}).format(date).replace('.', '')

export const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Returns midnight on the Monday of the Date's week. */
export const getMonday = (date) => {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - (day === SUNDAY ? SUNDAY_TO_MONDAY_OFFSET : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Returns the bookable dates relative to the current day of the week. */
export const getSelectableDates = (currentDate) => {
  const offset = currentDate.getDay() === SATURDAY ? 2 : 1
  const date = new Date(currentDate)
  date.setDate(date.getDate() + offset)
  date.setHours(0, 0, 0, 0)
  return [date]
}
