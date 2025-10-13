import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SessionPage } from './pages/SessionPage'
import HomePage from './pages/HomePage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import AboutPage from './pages/AboutPage'
import { AudioProvider } from './contexts/AudioContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { SettingsProvider } from './features/settings/context/SettingsProvider.tsx'
import { MorseBackgroundAnimation } from './components/MorseBackgroundAnimation'
import { checkLocalStorage } from './utils/localStorage'

function AppContent() {
  const location = useLocation()
  const showAnimation = !location.pathname.startsWith('/session')

  return (
    <>
      {showAnimation && <MorseBackgroundAnimation />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/:mode" element={<SessionPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </>
  )
}

function App() {
  useEffect(() => {
    if (!checkLocalStorage()) {
      alert('Private browsing detected. Your settings and authentication will not persist across sessions.')
    }
  }, [])

  return (
    <AuthProvider>
      <SettingsProvider>
        <AudioProvider>
          <Router>
            <AppContent />
          </Router>
        </AudioProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
