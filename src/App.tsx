import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { StudyPage } from './pages/StudyPage'
import { SessionConfigPage } from './pages/SessionConfigPage'
import HomePage from './pages/HomePage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import { AudioProvider } from './contexts/AudioContext.tsx'

function App() {
  return (
    <AudioProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session-config" element={<SessionConfigPage />} />
          <Route path="/session" element={<StudyPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Router>
    </AudioProvider>
  )
}

export default App
