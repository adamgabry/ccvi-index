import { useMemo } from 'react'
import { CCVIMap } from '../map/CCVIMap'
import { getPhase1MapRows } from '../../services/mapDataService'
import { useFilters } from '../../state/FilterContext'

export function MapTab() {
  const { filters } = useFilters()
  const rows = useMemo(() => getPhase1MapRows({ country: filters.country }), [filters.country])

  return <CCVIMap rows={rows} metric={filters.metric} />
}
