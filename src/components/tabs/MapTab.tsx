import { CCVIMap } from '../map/CCVIMap'
import { useFilters } from '../../state/useFilters'

export function MapTab() {
  const { filters } = useFilters()

  return <CCVIMap metric={filters.metric} country={filters.country} period={filters.period} />
}
