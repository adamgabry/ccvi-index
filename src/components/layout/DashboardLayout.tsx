import type { ReactNode } from 'react'

type DashboardLayoutProps = {
  leftContent: ReactNode
  rightPanel: ReactNode
}

export function DashboardLayout({ leftContent, rightPanel }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <section className="dashboard-layout__left">{leftContent}</section>
      <aside className="dashboard-layout__right">{rightPanel}</aside>
    </div>
  )
}
