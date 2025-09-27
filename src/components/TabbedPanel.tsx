import type { ComponentType } from 'react'
import './TabbedPanel.css'

export interface Tab<P> {
  id: string
  label: string
  component: ComponentType<P>
}

interface TabbedPanelProps<P> {
  tabs: Tab<P>[]
  activeTab: string
  onTabChange: (tabId: string) => void
  tabProps: P
  className?: string
}

export default function TabbedPanel<P extends Record<string, unknown>>({
  tabs,
  activeTab,
  onTabChange,
  tabProps,
  className = '',
}: TabbedPanelProps<P>) {
  const activeTabConfig = tabs.find(tab => tab.id === activeTab)
  const Component = activeTabConfig?.component

  return (
    <div className={`tabs-container ${className}`}>
      <div className="tabs-header">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="tab-panel active">
          {Component && <Component {...tabProps} />}
        </div>
      </div>
    </div>
  )
}