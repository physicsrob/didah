import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { StudyPage } from './pages/StudyPage'
import HomePage from './pages/HomePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session" element={<StudyPage />} />
      </Routes>
    </Router>
  )
}

export default App
