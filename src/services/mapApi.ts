import type { MapMetadataResponse, MapDataResponse, MapViewportQuery } from '../types/mapData'

function appendIfDefined(searchParams: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') {
    searchParams.set(key, String(value))
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Request failed.')
  }

  return (await response.json()) as T
}

export async function fetchMapData(
  query: MapViewportQuery,
  options?: { signal?: AbortSignal },
): Promise<MapDataResponse> {
  const searchParams = new URLSearchParams({
    minLon: String(query.bounds.minLon),
    minLat: String(query.bounds.minLat),
    maxLon: String(query.bounds.maxLon),
    maxLat: String(query.bounds.maxLat),
    zoom: String(query.zoom),
    viewportWidth: String(Math.round(query.viewport.width)),
    viewportHeight: String(Math.round(query.viewport.height)),
    metrics: query.metrics.join(','),
  })

  appendIfDefined(searchParams, 'country', query.filters?.country)
  appendIfDefined(searchParams, 'year', query.filters?.year)
  appendIfDefined(searchParams, 'quarter', query.filters?.quarter)

  const response = await fetch(`/api/map/data?${searchParams.toString()}`, {
    signal: options?.signal,
  })

  return readJsonResponse<MapDataResponse>(response)
}

export async function fetchMapMetadata(options?: { signal?: AbortSignal }): Promise<MapMetadataResponse> {
  const response = await fetch('/api/map/metadata', {
    signal: options?.signal,
  })

  return readJsonResponse<MapMetadataResponse>(response)
}

export async function fetchBootstrapMapData(
  metric: string,
  options?: { country?: string; year?: number; quarter?: number; signal?: AbortSignal },
): Promise<MapDataResponse> {
  const searchParams = new URLSearchParams({
    metric,
  })

  appendIfDefined(searchParams, 'country', options?.country)
  appendIfDefined(searchParams, 'year', options?.year)
  appendIfDefined(searchParams, 'quarter', options?.quarter)

  const response = await fetch(`/api/map/bootstrap?${searchParams.toString()}`, {
    signal: options?.signal,
  })

  return readJsonResponse<MapDataResponse>(response)
}
