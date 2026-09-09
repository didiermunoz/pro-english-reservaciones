import React, { useState } from 'react'
import LoginPage from './modules/modules/LoginPage.jsx'
import { Profile } from './modules/modules/profile_page/Profile.jsx'
import HomePage from './Pages/HomePage.jsx'

const demoUsers = [
  {
    id: '1234',
    password: '1234',
    name: 'Carlos Mendoza',
    level: 'I - Intermediate',
    pastClasses: [{ id: 101, title: 'Clase Presencial', date: '2026-09-02', formattedDate: '02 de Septiembre, 2026', time: '16:00 - 17:00' }],
  },
  {
    id: '5678',
    password: '5678',
    name: 'Ana Sofia Gómez',
    level: 'B - Beginner',
    pastClasses: [{ id: 102, title: 'Clase En Línea', date: '2026-09-01', formattedDate: '01 de Septiembre, 2026', time: '18:00 - 19:00' }],
  },
]

export default function App() {
  const [currentView, setCurrentView] = useState('login')
  const [currentUser, setCurrentUser] = useState(null)
  const [reservations, setReservations] = useState([])

  const handleLogin = (credentials) => {
    const user = demoUsers.find((demoUser) => demoUser.id === credentials.matricula && demoUser.password === credentials.password)

    if (!user) {
      alert('La matrícula o la contraseña no son correctas.')
      return
    }

    setCurrentUser(user)
    setCurrentView('home')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentView('login')
  }

  const handleReserve = (slots) => {
    const groupedSlots = slots
      .slice()
      .sort((first, second) => first.hour - second.hour)
      .reduce((groups, slot) => {
        const currentGroup = groups[groups.length - 1]
        if (currentGroup && slot.hour === currentGroup[currentGroup.length - 1].hour + 1) {
          currentGroup.push(slot)
        } else {
          groups.push([slot])
        }
        return groups
      }, [])

    setReservations((currentReservations) => [
      ...currentReservations,
      ...groupedSlots.map((group, index) => ({
        id: `${currentUser.id}-${Date.now()}-${index}`,
        userId: currentUser.id,
        dateKey: group[0].id.slice(0, 10),
        day: group[0].day,
        startHour: group[0].hour,
        endHour: group[group.length - 1].hour + 1,
      })),
    ])
  }

  const handleCancelReservation = (reservationId) => {
    setReservations((currentReservations) => currentReservations.filter(({ id }) => id !== reservationId))
  }

  const handleUpdateReservation = (reservationId, startHour, endHour) => {
    setReservations((currentReservations) => currentReservations.map((reservation) => (
      reservation.id === reservationId ? { ...reservation, startHour, endHour } : reservation
    )))
  }

  if (currentView === 'login') {
    return <LoginPage onLogin={handleLogin} />
  }

  if (currentView === 'profile') {
    return <Profile onCancelReservation={handleCancelReservation} onNavigate={setCurrentView} onLogout={handleLogout} onUpdateReservation={handleUpdateReservation} reservations={reservations} user={currentUser} />
  }

  return <HomePage onNavigate={setCurrentView} onLogout={handleLogout} onReserve={handleReserve} reservations={reservations} user={currentUser} />
}