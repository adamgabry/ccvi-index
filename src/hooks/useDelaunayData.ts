import { useEffect, useState } from 'react'
import { fetchDelaunayPoints, type CountryPoint } from '../services/delaunayApi'
import type { AnyMetric } from '../types/metrics'

type State = {
  data: CountryPoint[] | null
  loading: boolean
  error: string | null
}

export function useDelaunayData(
  metricX: AnyMetric,
  metricY: AnyMetric,
  continent: string,
  country: string,
): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))

    fetchDelaunayPoints(
      metricX,
      metricY,
      { continent, country },
      { signal: controller.signal },
    )
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return () => controller.abort()
  }, [metricX, metricY, continent, country])

  return state
}
