import type { MapMetadataResponse, MapDataResponse, MapViewportQuery } from '../types/mapData'

function appendIfDefined(
  sp: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value !== undefined && value !== '') sp.set(key, String(value))
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
  const sp = new URLSearchParams({
    minLon: String(query.bounds.minLon),
    minLat: String(query.bounds.minLat),
    maxLon: String(query.bounds.maxLon),
    maxLat: String(query.bounds.maxLat),
    zoom: String(query.zoom),
    viewportWidth: String(Math.round(query.viewport.width)),
    viewportHeight: String(Math.round(query.viewport.height)),
    metrics: query.metrics.join(','),
  })
  appendIfDefined(sp, 'country', query.filters?.country)
  appendIfDefined(sp, 'year', query.filters?.year)
  appendIfDefined(sp, 'quarter', query.filters?.quarter)
  const response = await fetch(`/api/map/data?${sp}`, { signal: options?.signal })
  return readJsonResponse<MapDataResponse>(response)
}

export async function fetchMapMetadata(
  options?: { signal?: AbortSignal },
): Promise<MapMetadataResponse> {
  const response = await fetch('/api/map/metadata', { signal: options?.signal })
  return readJsonResponse<MapMetadataResponse>(response)
}

export async function fetchBootstrapMapData(
  metric: string,
  options?: {
    country?: string
    continent?: string
    year?: number
    quarter?: number
    signal?: AbortSignal
  },
): Promise<MapDataResponse> {
  const sp = new URLSearchParams({ metric })
  appendIfDefined(sp, 'country', options?.country)
  appendIfDefined(sp, 'continent', options?.continent)
  appendIfDefined(sp, 'year', options?.year)
  appendIfDefined(sp, 'quarter', options?.quarter)
  const response = await fetch(`/api/map/bootstrap?${sp}`, { signal: options?.signal })
  return readJsonResponse<MapDataResponse>(response)
}
