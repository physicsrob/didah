import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSettings } from '../features/settings/hooks/useSettings'
import AudioTab from '../components/settings/AudioTab'
import CharactersTab from '../components/settings/CharactersTab'
import TabbedPanel, { type Tab } from '../components/TabbedPanel'
import { HeaderBar } from '../components/HeaderBar'
import '../styles/main.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { isLoading } = useSettings()
  const [activeTab, setActiveTab] = useState('audio')

  const tabs: Tab<Record<string, never>>[] = [
    { id: 'audio', label: 'Audio', component: AudioTab },
    { id: 'characters', label: 'Characters', component: CharactersTab },
  ]

  const handleBack = () => {
    navigate('/')
  }

  const handleSave = () => {
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <h2 className="heading-2">Loading settings...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <HeaderBar pageTitle="Settings" />

      <div className="container" style={{ margin: '0 auto', padding: '0 16px' }}>
        <div style={{ maxWidth: '672px', margin: '0 auto' }}>
          <TabbedPanel
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabProps={{}}
          />

          <div className="flex gap-3" style={{ marginTop: '24px' }}>
            <button
              className="btn btn-secondary flex-1"
              onClick={handleBack}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleSave}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}