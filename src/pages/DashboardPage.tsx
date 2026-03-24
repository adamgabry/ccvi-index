import { useState, type ReactNode } from 'react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { FiltersPanel } from '../components/layout/FiltersPanel'
import {
  TabsNavigation,
  type DashboardTab,
  type DashboardTabKey,
} from '../components/layout/TabsNavigation'
import { MapTab } from '../components/tabs/MapTab'
import { StatsTab } from '../components/tabs/StatsTab'
import { TrendsTab } from '../components/tabs/TrendsTab'
import { FilterProvider } from '../state/FilterContext'
import './DashboardPage.css'

const tabs: DashboardTab[] = [
  { key: 'map', label: 'Map' },
  { key: 'stats', label: 'Stats' },
  { key: 'trends', label: 'Trends' },
]

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('map')

  let activeView: ReactNode

  switch (activeTab) {
    case 'stats':
      activeView = <StatsTab />
      break
    case 'trends':
      activeView = <TrendsTab />
      break
    case 'map':
    default:
      activeView = <MapTab />
      break
  }

  const leftContent = (
    <div className="dashboard-main">
      <TabsNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="dashboard-main__content">{activeView}</div>
    </div>
  )

  return <DashboardLayout leftContent={leftContent} rightPanel={<FiltersPanel />} />
}

export function DashboardPage() {
  return (
    <FilterProvider>
      <DashboardContent />
    </FilterProvider>
  )
}
