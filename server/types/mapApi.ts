import type { MapMetric } from '../../src/types/metrics'

export type MapBounds = {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export type MapViewport = {
  width: number
  height: number
}

export type MapFilters = {
  country?: string
  year?: number
  quarter?: number
  riskComponent?: string
}

export type MapDataRequest = {
  bounds: MapBounds
  zoom: number
  viewport: MapViewport
  metrics: MapMetric[]
  filters?: MapFilters
}

export type MetricDomain = {
  min: number
  max: number
}

export type MetricSummary = {
  mean: number | null
  min: number | null
  max: number | null
}

export type MetricSummaryMap = Partial<Record<MapMetric, MetricSummary>>
export type MetricDomainMap = Record<MapMetric, MetricDomain>

export type AggregatedCellFeature = {
  id: string
  kind: 'cell'
  bbox: [number, number, number, number]
  center: [number, number]
  count: number
  metrics: MetricSummaryMap
}

export type RawPointFeature = {
  id: string
  kind: 'point'
  coordinates: [number, number]
  iso3: string
  pgid: number
  year: number
  quarter: number
  metrics: Partial<Record<MapMetric, number | null>>
}

export type MapDataResponse = {
  mode: 'aggregated' | 'raw'
  features: Array<AggregatedCellFeature | RawPointFeature>
  meta: {
    totalRowsInExtent: number
    returnedRows: number
    aggregation: {
      cellPixelSize: number | null
      rawThreshold: number
      maxFeatures: number
      count: number
    }
    metricDomains: MetricDomainMap
  }
}

export type MapMetadataResponse = {
  metrics: MapMetric[]
  metricDomains: MetricDomainMap
  countries: string[]
  periods: Array<{
    year: number
    quarter: number
    value: string
    label: string
  }>
}
