import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchMapMetadata } from '../services/mapApi'
import type { MapMetric } from '../types/metrics'
import { FilterContext } from './filterContextStore'

export type FilterOption = {
  label: string
  value: string
}

export type FilterState = {
  country: string
  metric: MapMetric
  period: string
  riskComponent: RiskComponentFilter
}

export type RiskComponentFilter =
  | 'all_components'
  | 'climate_hazards'
  | 'conflict'
  | 'vulnerability'

export type FilterContextValue = {
  filters: FilterState
  periodOptions: FilterOption[]
  isLoadingMetadata: boolean
  setCountry: (country: string) => void
  setMetric: (metric: MapMetric) => void
  setPeriod: (period: string) => void
  setRiskComponent: (riskComponent: RiskComponentFilter) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
}

const defaultFilterState: FilterState = {
  country: 'all',
  metric: 'CCVI',
  period: '',
  riskComponent: 'all_components',
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)
  const [periodOptions, setPeriodOptions] = useState<FilterOption[]>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true)

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
  }

  useEffect(() => {
    let active = true

    fetchMapMetadata()
      .then((metadata) => {
        if (!active) {
          return
        }

        const nextPeriodOptions = metadata.periods.map((period) => ({
          label: period.label,
          value: period.value,
        }))

        setPeriodOptions(nextPeriodOptions)
        setFilters((previous) => ({
          ...previous,
          period: previous.period || nextPeriodOptions[0]?.value || '',
        }))
      })
      .catch(() => {
        if (!active) {
          return
        }

        setPeriodOptions([])
      })
      .finally(() => {
        if (active) {
          setIsLoadingMetadata(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      periodOptions,
      isLoadingMetadata,
      setCountry: (country) => updateFilter('country', country),
      setMetric: (metric) => updateFilter('metric', metric),
      setPeriod: (period) => updateFilter('period', period),
      setRiskComponent: (riskComponent) => updateFilter('riskComponent', riskComponent),
      updateFilter,
    }),
    [filters, isLoadingMetadata, periodOptions],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}
