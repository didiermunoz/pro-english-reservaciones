export const weekDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

export function formatDate(date) {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

export function getMonday(date) {
  const monday = new Date(date)
  const day = monday.getDay() || 7
  monday.setDate(monday.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getSelectableDates(date) {
  return [1, 2].map((offset) => {
    const selectableDate = new Date(date)
    selectableDate.setDate(selectableDate.getDate() + offset)
    return selectableDate
  })
}