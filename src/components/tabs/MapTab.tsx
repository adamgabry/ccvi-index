import { useFilters } from '../../state/FilterContext'

export function MapTab() {
  const { filters } = useFilters()

  return (
    <section className="tab-placeholder">
      <h2>Map</h2>
      <p>Map visualization will appear here.</p>
      <small>
        Active filters: {filters.country} · {filters.metric} · {filters.riskComponent}
      </small>
    </section>
  )
}
