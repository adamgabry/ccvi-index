import { useEffect, useState } from 'react'
import { fetchBootstrapMapData } from '../services/mapApi'
import type { MapDataResponse } from '../types/mapData'
import type { MapMetric } from '../types/metrics'

type MapBootstrapState = {
  data: MapDataResponse | null
  error: string | null
}

function parsePeriod(period: string): { year?: number; quarter?: number } {
  const match = period.match(/^(\d{4})-Q([1-4])$/)

  if (!match) {
    return {}
  }

  return {
    year: Number(match[1]),
    quarter: Number(match[2]),
  }
}

export function useMapBootstrapData(metric: MapMetric, country: string, period: string): MapBootstrapState {
  const [state, setState] = useState<MapBootstrapState>({
    data: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    const selectedPeriod = parsePeriod(period)

    if (!selectedPeriod.year || !selectedPeriod.quarter) {
      return () => {
        controller.abort()
      }
    }

    fetchBootstrapMapData(metric, {
      country: country === 'all' ? undefined : country,
      year: selectedPeriod.year,
      quarter: selectedPeriod.quarter,
      signal: controller.signal,
    })
      .then((data) => {
        setState({
          data,
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Failed to load bootstrap map data.',
        })
      })

    return () => {
      controller.abort()
    }
  }, [country, metric, period])

  return state
}
