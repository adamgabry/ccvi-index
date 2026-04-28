import { useEffect, useState } from 'react'
import { fetchRadarData, type RadarCountryRow } from '../services/radarApi'

type State = {
  data: RadarCountryRow[] | null
  loading: boolean
  error: string | null
}

export function useRadarData(
  columns: string[],
  country: string,
  continent: string,
  geoMode: 'continent' | 'country',
  period: string,
  year: string,
  periodMode: 'quarter' | 'year',
): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    if (columns.length === 0) return

    const controller = new AbortController()
    const filters: Parameters<typeof fetchRadarData>[1] = {}

    if (geoMode === 'country' && country !== 'all') filters.country = country
    if (geoMode === 'continent' && continent !== 'all') filters.continent = continent

    if (periodMode === 'quarter') {
      const match = period.match(/^(\d{4})-Q([1-4])$/)
      if (!match) return () => controller.abort()
      filters.year = Number(match[1])
      filters.quarter = Number(match[2])
    } else {
      const y = Number(year)
      if (!y) return () => controller.abort()
      filters.year = y
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    fetchRadarData(columns, filters, { signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) })
      })

    return () => controller.abort()
  }, [columns.join(','), country, continent, geoMode, period, year, periodMode])

  return state
}
