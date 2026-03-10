export type DashboardTabKey = 'map' | 'stats' | 'trends'

export type DashboardTab = {
  key: DashboardTabKey
  label: string
}

type TabsNavigationProps = {
  tabs: DashboardTab[]
  activeTab: DashboardTabKey
  onTabChange: (nextTab: DashboardTabKey) => void
}

export function TabsNavigation({ tabs, activeTab, onTabChange }: TabsNavigationProps) {
  return (
    <nav className="tabs-navigation" aria-label="Dashboard views">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tabs-navigation__item ${activeTab === tab.key ? 'is-active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
