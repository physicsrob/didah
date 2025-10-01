import { useState } from 'react'
import { useSettings } from '../features/settings/hooks/useSettings'
import AudioTab from '../components/settings/AudioTab'
import CharactersTab from '../components/settings/CharactersTab'
import TabbedPanel, { type Tab } from '../components/TabbedPanel'
import { HeaderBar } from '../components/HeaderBar'
import '../styles/main.css'
import '../styles/components.css'

export default function SettingsPage() {
  const { isLoading } = useSettings()
  const [activeTab, setActiveTab] = useState('audio')

  const tabs: Tab<Record<string, never>>[] = [
    { id: 'audio', label: 'Audio', component: AudioTab },
    { id: 'characters', label: 'Characters', component: CharactersTab },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="heading-2">Loading settings...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <HeaderBar pageTitle="Settings" />

      <div className="container container-centered">
        <div className="container-narrow">
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