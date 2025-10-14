import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SessionPage } from './pages/SessionPage'
import HomePage from './pages/HomePage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import AboutPage from './pages/AboutPage'
import { AudioProvider } from './contexts/AudioContext.tsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { SettingsProvider } from './features/settings/context/SettingsProvider.tsx'
import { MorseBackgroundAnimation } from './components/MorseBackgroundAnimation'
import { checkLocalStorage } from './utils/localStorage'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

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
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <SettingsProvider>
        <AudioProvider>
          <Router>
            <AppContent />
          </Router>
        </AudioProvider>
      </SettingsProvider>
    </ClerkProvider>
  )
}

export default App
