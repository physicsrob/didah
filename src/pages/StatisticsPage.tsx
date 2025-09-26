import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TimeTab from '../components/statistics/TimeTab'
import SpeedTab from '../components/statistics/SpeedTab'
import AccuracyTab from '../components/statistics/AccuracyTab'
import ConfusionTab from '../components/statistics/ConfusionTab'
import HistoryTab from '../components/statistics/HistoryTab'
import TimeWindowSelector from '../components/statistics/TimeWindowSelector'
import '../styles/main.css'
import '../styles/statistics.css'

export default function StatisticsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('time')
  const [timeWindow, setTimeWindow] = useState<7 | 30>(7)

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

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header with Back button and MorseAcademy branding */}
      <header className="config-header">
        <button
          onClick={handleBack}
          className="btn-back"
        >
          <span className="btn-back-arrow">←</span>
          Back
        </button>
        <h1
          className="brand-title"
          onClick={() => navigate('/')}
        >
          MorseAcademy
        </h1>
      </header>

      <div className="w-full px-6 py-4 max-w-xl" style={{ margin: '0 auto' }}>
        <div className="mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="heading-1" style={{ margin: 0, textAlign: 'center', flex: 1 }}>Statistics</h1>
          <TimeWindowSelector value={timeWindow} onChange={setTimeWindow} />
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
              {activeTab === 'speed' && <SpeedTab timeWindow={timeWindow} />}
              {activeTab === 'accuracy' && <AccuracyTab timeWindow={timeWindow} />}
              {activeTab === 'confusion' && <ConfusionTab timeWindow={timeWindow} />}
              {activeTab === 'time' && <TimeTab timeWindow={timeWindow} />}
              {activeTab === 'history' && <HistoryTab timeWindow={timeWindow} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}