import type { Phase1Metric } from './metrics'

export type CCVIPhase1Dimensions = {
  year: number
  quarter: number
  pgid: number
  lat: number
  lon: number
  iso3: string
}

export type CCVIPhase1MetricValues = {
  [metric in Phase1Metric]: number | null
}

export type CCVIMapRow = CCVIPhase1Dimensions & CCVIPhase1MetricValues
