import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ActiveSessionPage } from './pages/ActiveSessionPage'
import { SessionCompletePage } from './pages/SessionCompletePage'
import { SessionConfigPage } from './pages/SessionConfigPage'
import HomePage from './pages/HomePage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import { AudioProvider } from './contexts/AudioContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'

function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session-config" element={<SessionConfigPage />} />
          <Route path="/session" element={<ActiveSessionPage />} />
          <Route path="/session-complete" element={<SessionCompletePage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        </Router>
      </AudioProvider>
    </AuthProvider>
  )
}

export default App
