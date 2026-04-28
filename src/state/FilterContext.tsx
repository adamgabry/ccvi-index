import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchMapMetadata } from '../services/mapApi'
import type { MapMetric } from '../types/metrics'
import { FilterContext } from './filterContextStore'

export type FilterOption = {
  label: string
  value: string
}

export type PeriodMode = 'quarter' | 'year'

export type GeoMode = 'continent' | 'country'

export type FilterState = {
  geoMode: GeoMode
  country: string
  continent: string
  metric: MapMetric
  periodMode: PeriodMode
  period: string   
  year: string     
}

export type FilterContextValue = {
  filters: FilterState
  periodOptions: FilterOption[]
  yearOptions: FilterOption[]
  countryOptions: FilterOption[]
  continentOptions: FilterOption[]
  isLoadingMetadata: boolean
  setGeoMode: (mode: GeoMode) => void
  setCountry: (country: string) => void
  setContinent: (continent: string) => void
  setMetric: (metric: MapMetric) => void
  setPeriodMode: (mode: PeriodMode) => void
  setPeriod: (period: string) => void
  setYear: (year: string) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
}

const defaultFilterState: FilterState = {
  geoMode: 'continent',
  country: 'all',
  continent: 'all',
  metric: 'CCVI',
  periodMode: 'quarter',
  period: '',
  year: '',
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)
  const [periodOptions, setPeriodOptions] = useState<FilterOption[]>([])
  const [yearOptions, setYearOptions] = useState<FilterOption[]>([])
  const [countryOptions, setCountryOptions] = useState<FilterOption[]>([
    { label: 'All countries', value: 'all' },
  ])
  const [continentOptions, setContinentOptions] = useState<FilterOption[]>([
    { label: 'All continents', value: 'all' },
  ])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true)

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    let active = true
    fetchMapMetadata()
      .then((metadata) => {
        if (!active) return

        const nextPeriodOptions = metadata.periods.map((p) => ({
          label: p.label,
          value: p.value,
        }))

        const yearsSet = new Set(metadata.periods.map((p) => String(p.year)))
        const nextYearOptions: FilterOption[] = [...yearsSet]
          .sort((a, b) => Number(b) - Number(a))
          .map((y) => ({ label: y, value: y }))

        const nextCountryOptions: FilterOption[] = [
          { label: 'All countries', value: 'all' },
          ...metadata.countries.map((iso) => ({ label: iso, value: iso })),
        ]

        const nextContinentOptions: FilterOption[] = [
          { label: 'All continents', value: 'all' },
          ...(metadata.continents ?? []).map((c) => ({ label: c, value: c })),
        ]

        setPeriodOptions(nextPeriodOptions)
        setYearOptions(nextYearOptions)
        setCountryOptions(nextCountryOptions)
        setContinentOptions(nextContinentOptions)
        setFilters((prev) => ({
          ...prev,
          period: prev.period || nextPeriodOptions[0]?.value || '',
          year: prev.year || nextYearOptions[0]?.value || '',
        }))
      })
      .catch(() => {
        if (!active) return
        setPeriodOptions([])
      })
      .finally(() => {
        if (active) setIsLoadingMetadata(false)
      })

    return () => { active = false }
  }, [])

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      periodOptions,
      yearOptions,
      countryOptions,
      continentOptions,
      isLoadingMetadata,
      setGeoMode:    (geoMode)    => updateFilter('geoMode', geoMode),
      setCountry:    (country)    => updateFilter('country', country),
      setContinent:  (continent)  => updateFilter('continent', continent),
      setMetric:     (metric)     => updateFilter('metric', metric),
      setPeriodMode: (periodMode) => updateFilter('periodMode', periodMode),
      setPeriod:     (period)     => updateFilter('period', period),
      setYear:       (year)       => updateFilter('year', year),
      updateFilter,
    }),
    [filters, isLoadingMetadata, periodOptions, yearOptions, countryOptions, continentOptions],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}
