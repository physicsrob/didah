import { useState } from 'react'
import { useSettings } from '../features/settings/hooks/useSettings'
import AudioTab from '../components/settings/AudioTab'
import CharactersTab from '../components/settings/CharactersTab'
import TabbedPanel, { type Tab } from '../components/TabbedPanel'
import { HeaderBar } from '../components/HeaderBar'
import '../styles/main.css'

export default function SettingsPage() {
  const { isLoading } = useSettings()
  const [activeTab, setActiveTab] = useState('audio')

  const tabs: Tab<Record<string, never>>[] = [
    { id: 'audio', label: 'Audio', component: AudioTab },
    { id: 'characters', label: 'Characters', component: CharactersTab },
  ]

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
        </div>
      </div>
    </div>
  )
}