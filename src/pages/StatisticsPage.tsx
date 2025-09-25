import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TimeTab from '../components/statistics/TimeTab'
import SpeedTab from '../components/statistics/SpeedTab'
import AccuracyTab from '../components/statistics/AccuracyTab'
import ConfusionTab from '../components/statistics/ConfusionTab'
import HistoryTab from '../components/statistics/HistoryTab'
import '../styles/main.css'

export default function StatisticsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('time')

  const handleBack = () => {
    navigate('/')
  }

  const tabs = [
    { id: 'time', label: 'Time', component: TimeTab },
    { id: 'speed', label: 'Speed', component: SpeedTab },
    { id: 'accuracy', label: 'Accuracy', component: AccuracyTab },
    { id: 'confusion', label: 'Confusion', component: ConfusionTab },
    { id: 'history', label: 'History', component: HistoryTab },
  ]

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || TimeTab

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="w-full px-6 py-10 max-w-xl">
        <div className="text-center mb-6">
          <h1 className="heading-1">Statistics</h1>
        </div>

        <div className="tabs-container stats-tabs-container">
          <div className="tabs-header">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            <div className="tab-panel active">
              <ActiveTabComponent />
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            className="btn btn-secondary btn-large"
            onClick={handleBack}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}