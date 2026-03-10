import { useFilters } from '../../state/FilterContext'

export function TrendsTab() {
  const { filters } = useFilters()

  return (
    <section className="tab-placeholder">
      <h2>Trends</h2>
      <p>Trend analysis will appear here.</p>
      <small>
        Active filters: {filters.country} · {filters.metric} · {filters.riskComponent}
      </small>
    </section>
  )
}
