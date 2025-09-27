import { useState } from 'react'
import TimeTab from '../components/statistics/TimeTab'
import SpeedTab from '../components/statistics/SpeedTab'
import AccuracyTab from '../components/statistics/AccuracyTab'
import ConfusionTab from '../components/statistics/ConfusionTab'
import HistoryTab from '../components/statistics/HistoryTab'
import TimeWindowSelector from '../components/statistics/TimeWindowSelector'
import { HeaderBar } from '../components/HeaderBar'
import TabbedPanel, { type Tab } from '../components/TabbedPanel'
import '../styles/main.css'
import '../styles/statistics.css'

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState('time')
  const [timeWindow, setTimeWindow] = useState<7 | 30>(7)

  const tabs: Tab<{ timeWindow: 7 | 30 }>[] = [
    { id: 'time', label: 'Time', component: TimeTab },
    { id: 'speed', label: 'Speed', component: SpeedTab },
    { id: 'accuracy', label: 'Accuracy', component: AccuracyTab },
    { id: 'confusion', label: 'Confusion', component: ConfusionTab },
    { id: 'history', label: 'History', component: HistoryTab },
  ]

  return (
    <div className="min-h-screen bg-gradient-primary">
      <HeaderBar pageTitle="Statistics" />

      <div className="w-full px-6 py-4 max-w-xl" style={{ margin: '0 auto' }}>
        <div className="mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <TimeWindowSelector value={timeWindow} onChange={setTimeWindow} />
        </div>

        <TabbedPanel
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabProps={{ timeWindow }}
          className="stats-tabs-container"
        />
      </div>
    </div>
  )
}