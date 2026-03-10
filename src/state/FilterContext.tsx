import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type FilterOption = {
  label: string
  value: string
}

export type FilterState = {
  country: string
  metric: string
  riskComponent: string
}

type FilterContextValue = {
  filters: FilterState
  setCountry: (country: string) => void
  setMetric: (metric: string) => void
  setRiskComponent: (riskComponent: string) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
}

const defaultFilterState: FilterState = {
  country: 'all',
  metric: 'ccvi_overall',
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
  { label: 'United States', value: 'us' },
  { label: 'India', value: 'in' },
  { label: 'Brazil', value: 'br' },
]

export const metricOptions: FilterOption[] = [
  { label: 'CCVI Overall', value: 'ccvi_overall' },
  { label: 'Exposure', value: 'exposure' },
  { label: 'Sensitivity', value: 'sensitivity' },
  { label: 'Adaptive Capacity', value: 'adaptive_capacity' },
]

export const riskComponentOptions: FilterOption[] = [
  { label: 'All components', value: 'all_components' },
  { label: 'Climate Hazards', value: 'climate_hazards' },
  { label: 'Socioeconomic', value: 'socioeconomic' },
  { label: 'Infrastructure', value: 'infrastructure' },
]
