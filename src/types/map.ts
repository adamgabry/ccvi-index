import type { MapMetric } from './metrics'

export type MapCellProperties = {
  kind: 'cell'
  id: string
  metric: MapMetric
  meanValue: number | null
  minValue: number | null
  maxValue: number | null
  count: number
  size: number
  color: string
  opacity: number
  bbox: [number, number, number, number]
}

export type MapPointProperties = {
  kind: 'point'
  id: string
  iso3: string
  pgid: number
  year: number
  quarter: number
  metric: MapMetric
  metricValue: number | null
  color: string
}

export type MapCellFeature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: MapCellProperties
}

export type MapPointFeature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: MapPointProperties
}

export type MapCellFeatureCollection = {
  type: 'FeatureCollection'
  features: MapCellFeature[]
}

export type MapPointFeatureCollection = {
  type: 'FeatureCollection'
  features: MapPointFeature[]
}
