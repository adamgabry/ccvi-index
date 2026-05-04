import type { AnyMetric } from '../types/metrics'

export type CountryPoint = {
  iso3: string
  continent: string
  x: number
  y: number
}

type DelaunayFilters = {
  continent?: string
  country?: string
}

function appendIfDefined(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  if (value && value !== 'all') params.set(key, value)
}

export async function fetchDelaunayPoints(
  metricX: AnyMetric,
  metricY: AnyMetric,
  filters: DelaunayFilters,
  options?: { signal?: AbortSignal },
): Promise<CountryPoint[]> {
  const params = new URLSearchParams({
    metricX,
    metricY,
  })
  appendIfDefined(params, 'continent', filters.continent)
  appendIfDefined(params, 'country', filters.country)

  const response = await fetch(`/api/delaunay/data?${params}`, { signal: options?.signal })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Failed to load Delaunay data.')
  }

  return response.json() as Promise<CountryPoint[]>
}
