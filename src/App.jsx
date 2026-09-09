import React, { useState } from 'react'
import LoginPage from './modules/modules/LoginPage.jsx'
import { Profile } from './modules/modules/profile_page/Profile.jsx'
import Reception from './modules/reception/reception.jsx'

export default function App() {
  const [currentView, setCurrentView] = useState('profile')

  return (
    <>
      {currentView === 'login' ? (
        <LoginPage />
      ) : currentView === 'profile' ? (
        <Profile />
      ) : (
        <Reception />
      )}

      <button onClick={() => setCurrentView('login')}>Ver login</button>
      <button onClick={() => setCurrentView('profile')}>Ver profile</button>
      <button onClick={() => setCurrentView('reception')}>Ver recepción</button>
    </>
  )
}