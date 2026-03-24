import { CCVIMap } from '../map/CCVIMap'
import { useFilters } from '../../state/useFilters'

export function MapTab() {
  const { filters } = useFilters()

  return (
    <CCVIMap
      key={`${filters.metric}:${filters.country}:${filters.period}`}
      metric={filters.metric}
      country={filters.country}
      period={filters.period}
    />
  )
}
