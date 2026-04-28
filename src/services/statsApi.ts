import type { Phase1Metric } from '../types/metrics'

export type MetricStats = {
  metric: Phase1Metric
  n: number
  min: number
  p25: number
  median: number
  mean: number
  p75: number
  max: number
  std: number
}

export type ContinentDistribution = {
  continent: string
  metric: Phase1Metric
  mean: number
  p25: number
  median: number
  p75: number
  min: number
  max: number
  n: number
}

export type CorrelationEntry = {
  metric_a: Phase1Metric
  metric_b: Phase1Metric
  r: number
}

export type StatsSummaryResponse = {
  metricStats: MetricStats[]
  continentDistributions: ContinentDistribution[]
  correlations: CorrelationEntry[]
}

export async function fetchStatsSummary(
  filters: { country?: string; continent?: string; year?: number; quarter?: number },
  options?: { signal?: AbortSignal },
): Promise<StatsSummaryResponse> {
  const params = new URLSearchParams()
  if (filters.country && filters.country !== 'all') params.set('country', filters.country)
  if (filters.continent && filters.continent !== 'all') params.set('continent', filters.continent)
  if (filters.year != null) params.set('year', String(filters.year))
  if (filters.quarter != null) params.set('quarter', String(filters.quarter))

  const response = await fetch(`/api/stats/summary?${params}`, { signal: options?.signal })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Failed to load stats.')
  }
  return response.json() as Promise<StatsSummaryResponse>
}
