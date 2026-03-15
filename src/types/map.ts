import type { CCVIMapRow } from './ccvi'
import type { MapMetric } from './metrics'

export type MapPointProperties = {
  iso3: string
  pgid: number
  year: number
  quarter: number
  metric: MapMetric
  metricValue: number | null
  color: string
}

export type MapPointFeature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: MapPointProperties
}

export type MapPointFeatureCollection = {
  type: 'FeatureCollection'
  features: MapPointFeature[]
}

export type GeoJsonTransformInput = {
  rows: CCVIMapRow[]
  metric: MapMetric
}
