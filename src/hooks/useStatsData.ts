import { useEffect, useState } from 'react'
import { fetchStatsSummary, type StatsSummaryResponse } from '../services/statsApi'

type State = {
  data: StatsSummaryResponse | null
  loading: boolean
  error: string | null
}

function parsePeriod(period: string): { year?: number; quarter?: number } {
  const match = period.match(/^(\d{4})-Q([1-4])$/)
  if (!match) return {}
  return { year: Number(match[1]), quarter: Number(match[2]) }
}

export function useStatsData(
  country: string,
  continent: string,
  geoMode: 'continent' | 'country',
  period: string,
  year: string,
  periodMode: 'quarter' | 'year',
): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()

    const filters: Parameters<typeof fetchStatsSummary>[0] = {}

    if (geoMode === 'country' && country !== 'all') filters.country = country
    if (geoMode === 'continent' && continent !== 'all') filters.continent = continent

    if (periodMode === 'quarter') {
      const { year: y, quarter: q } = parsePeriod(period)
      if (!y || !q) return () => controller.abort()
      filters.year = y
      filters.quarter = q
    } else {
      const y = Number(year)
      if (!y) return () => controller.abort()
      filters.year = y
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    fetchStatsSummary(filters, { signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) })
      })

    return () => controller.abort()
  }, [country, continent, geoMode, period, year, periodMode])

  return state
}
