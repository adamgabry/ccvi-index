import { useEffect, useState } from 'react'
import { fetchBootstrapMapData } from '../services/mapApi'
import type { MapDataResponse } from '../types/mapData'
import type { MapMetric } from '../types/metrics'
import { metricToColumn } from '../types/metrics'

type MapBootstrapState = {
  data: MapDataResponse | null
  error: string | null
  isLoading: boolean
}

export function useMapBootstrapData(
  metric: MapMetric,
  country: string,
  continent: string,
  period: string,
): MapBootstrapState {
  const [state, setState] = useState<MapBootstrapState>({
    data: null,
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    const controller = new AbortController()

    const yearOnlyMatch = period.match(/^(\d{4})-Y$/)
    const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/)

    let year: number | undefined
    let quarter: number | undefined

    if (yearOnlyMatch) {
      year = Number(yearOnlyMatch[1])
    } else if (quarterMatch) {
      year = Number(quarterMatch[1])
      quarter = Number(quarterMatch[2])
    } else {
      return () => controller.abort()
    }

    const column = metricToColumn[metric]

    fetchBootstrapMapData(column, {
      country: country !== 'all' ? country : undefined,
      continent: continent !== 'all' ? continent : undefined,
      year,
      quarter,
      signal: controller.signal,
    })
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Failed to load bootstrap map data.',
          isLoading: false,
        })
      })

    return () => controller.abort()
  }, [country, continent, metric, period])

  return state
}
