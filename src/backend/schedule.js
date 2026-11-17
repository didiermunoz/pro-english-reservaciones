export function getClassHours(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const day = date.getDay()
  if (day === 0) return null
  if (day === 6) return { startHour: 8, endHour: 15 }
  return { startHour: 7, endHour: 21 }
}
