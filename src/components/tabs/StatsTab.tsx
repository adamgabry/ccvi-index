import { useFilters } from '../../state/useFilters'

export function StatsTab() {
  const { filters } = useFilters()

  return (
    <section className="tab-placeholder">
      <h2>Stats</h2>
      <p>Statistical summaries will appear here.</p>
      <small>
        Active filters: {filters.country} · {filters.metric} · {filters.riskComponent}
      </small>
    </section>
  )
}
