import React, { useState } from 'react'
import LoginPage from './modules/modules/LoginPage.jsx'
import { Profile } from './modules/modules/profile_page/Profile.jsx'

export default function App() {
  const [currentView, setCurrentView] = useState('profile')

  return (
    <>
      {currentView === 'login' ? (
        <LoginPage />
      ) : (
        <Profile />
      )}

      <button onClick={() => setCurrentView('login')}>Ver login</button>
      <button onClick={() => setCurrentView('profile')}>Ver profile</button>
    </>
  )
}