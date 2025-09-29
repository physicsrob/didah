import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ActiveSessionPage } from './pages/ActiveSessionPage'
import { SessionCompletePage } from './pages/SessionCompletePage'
import { SessionConfigPage } from './pages/SessionConfigPage'
import HomePage from './pages/HomePage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import { AudioProvider } from './contexts/AudioContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { SettingsProvider } from './features/settings/context/SettingsProvider.tsx'
import { MorseBackgroundAnimation } from './components/MorseBackgroundAnimation'

function AppContent() {
  const location = useLocation()
  const showAnimation = location.pathname !== '/session'

  return (
    <>
      {showAnimation && <MorseBackgroundAnimation />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session-config" element={<SessionConfigPage />} />
        <Route path="/session" element={<ActiveSessionPage />} />
        <Route path="/session-complete" element={<SessionCompletePage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  )
}

function App() {
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
