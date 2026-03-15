import type { CCVIMapRow } from '../../types/ccvi'
import type { MapMetric } from '../../types/metrics'

export function getMetricValue(row: CCVIMapRow, metric: MapMetric): number | null {
  return row[metric]
}

export function formatMetricValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'No data'
  }

  return value.toFixed(3)
}
