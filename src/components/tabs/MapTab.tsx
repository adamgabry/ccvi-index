import { CCVIMap } from '../map/CCVIMap'
import { useFilters } from '../../state/useFilters'

export function MapTab() {
  const { filters } = useFilters()

  const effectivePeriod =
    filters.periodMode === 'quarter'
      ? filters.period
      : filters.year
        ? `${filters.year}-Y`
        : ''

  return (
    <CCVIMap
      key={`${filters.metric}:${filters.country}:${filters.continent}:${filters.geoMode}:${effectivePeriod}`}
      metric={filters.metric}
      country={filters.geoMode === 'country' ? filters.country : 'all'}
      continent={filters.geoMode === 'continent' ? filters.continent : 'all'}
      period={filters.period}
      year={filters.periodMode === 'year' ? filters.year : ''}
      periodMode={filters.periodMode}
    />
  )
}
