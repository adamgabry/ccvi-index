import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMapData } from '../services/mapApi'
import type { MapDataResponse, MapViewportQuery } from '../types/mapData'

type MapViewportDataState = {
  data: MapDataResponse | null
  error: string | null
  isLoading: boolean
}

const REQUEST_DEBOUNCE_MS = 120

export function useMapViewportData(query: MapViewportQuery | null): MapViewportDataState {
  const [state, setState] = useState<MapViewportDataState>({
    data: null,
    error: null,
    isLoading: false,
  })
  const requestIdRef = useRef(0)
  const queryKey = useMemo(() => JSON.stringify(query), [query])

  useEffect(() => {
    if (!query) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setState((previous) => ({
        ...previous,
        error: null,
        isLoading: true,
      }))

      fetchMapData(query, { signal: controller.signal })
        .then((data) => {
          if (requestId !== requestIdRef.current) {
            return
          }

          startTransition(() => {
            setState({
              data,
              error: null,
              isLoading: false,
            })
          })
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return
          }

          setState((previous) => ({
            ...previous,
            error: error instanceof Error ? error.message : 'Failed to load map data.',
            isLoading: false,
          }))
        })
    }, REQUEST_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query, queryKey])

  return state
}
