import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mapMetricOptions } from '../config/mapMetrics'
import type { MapMetric } from '../types/metrics'

export type FilterOption = {
  label: string
  value: string
}

export type FilterState = {
  country: string
  metric: MapMetric
  riskComponent: RiskComponentFilter
}

export type RiskComponentFilter =
  | 'all_components'
  | 'climate_hazards'
  | 'conflict'
  | 'vulnerability'

type FilterContextValue = {
  filters: FilterState
  setCountry: (country: string) => void
  setMetric: (metric: MapMetric) => void
  setRiskComponent: (riskComponent: RiskComponentFilter) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
}

const defaultFilterState: FilterState = {
  country: 'all',
  metric: 'CCVI',
  riskComponent: 'all_components',
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
  }

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      setCountry: (country) => updateFilter('country', country),
      setMetric: (metric) => updateFilter('metric', metric),
      setRiskComponent: (riskComponent) => updateFilter('riskComponent', riskComponent),
      updateFilter,
    }),
    [filters],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const context = useContext(FilterContext)

  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider')
  }

  return context
}

export const countryOptions: FilterOption[] = [
  { label: 'All countries', value: 'all' },
  { label: 'Afghanistan (AFG)', value: 'AFG' },
  { label: 'Chile (CHL)', value: 'CHL' },
  { label: 'India (IND)', value: 'IND' },
  { label: 'United States (USA)', value: 'USA' },
]

export const metricOptions: FilterOption[] = mapMetricOptions

export const riskComponentOptions: FilterOption[] = [
  { label: 'All components', value: 'all_components' },
  { label: 'Climate Hazards', value: 'climate_hazards' },
  { label: 'Conflict', value: 'conflict' },
  { label: 'Vulnerability', value: 'vulnerability' },
]
