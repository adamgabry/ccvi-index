export type RadarCountryRow = {
  iso3: string
  continent: string
  [col: string]: number | string | null
}

export async function fetchRadarData(
  columns: string[],
  filters: { country?: string; continent?: string; year?: number; quarter?: number },
  options?: { signal?: AbortSignal },
): Promise<RadarCountryRow[]> {
  const params = new URLSearchParams({ columns: columns.join(',') })
  if (filters.country && filters.country !== 'all') params.set('country', filters.country)
  if (filters.continent && filters.continent !== 'all') params.set('continent', filters.continent)
  if (filters.year != null) params.set('year', String(filters.year))
  if (filters.quarter != null) params.set('quarter', String(filters.quarter))

  const response = await fetch(`/api/radar/data?${params}`, { signal: options?.signal })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Failed to load radar data.')
  }
  return response.json() as Promise<RadarCountryRow[]>
}
