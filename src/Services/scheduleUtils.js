const SUNDAY = 0
const FRIDAY = 5
const SATURDAY = 6
const SUNDAY_TO_MONDAY_OFFSET = 6

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

function getBookableDayOffsets(dayOfWeek) {
  // Friday opens Saturday and Monday; Saturday opens only Monday; other days open the next two days.
  if (dayOfWeek === FRIDAY) return [1, 3]
  if (dayOfWeek === SATURDAY) return [2]
  return [1, 2]
}

/** Returns the bookable dates relative to the current day of the week. */
export const getSelectableDates = (currentDate) => {
  const dayOfWeek = currentDate.getDay()
  const offsets = getBookableDayOffsets(dayOfWeek)
  return offsets.map((offset) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + offset)
    date.setHours(0, 0, 0, 0)
    return date
  })
}
