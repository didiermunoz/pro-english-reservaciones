export const formatHour = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`
}

export const weekDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const formatDate = (date) => new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
}).format(date).replace('.', '')

export const toDateKey = (date) => date.toISOString().slice(0, 10)

export const getMonday = (date) => {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export const getSelectableDates = (currentDate) => {
  const day = currentDate.getDay()
  const offsets = day === 5 ? [1, 3] : day === 6 ? [2] : [1, 2]
  return offsets.map((offset) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + offset)
    date.setHours(0, 0, 0, 0)
    return date
  })
}
