import type {
  MapCellFeatureCollection,
  MapCellProperties,
  MapPointFeatureCollection,
  MapPointProperties,
} from '../../types/map'
import type { AggregatedCellFeature, MapDataResponse, RawPointFeature } from '../../types/mapData'
import type { MapMetric } from '../../types/metrics'
import { createMetricColorScale, type MetricDomain, getNoDataColor } from './colorScale'

type MapFeatureCollections = {
  cells: MapCellFeatureCollection
  points: MapPointFeatureCollection
}

function createEmptyCellCollection(): MapCellFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  }
}

function createEmptyPointCollection(): MapPointFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  }
}

function getCountOpacity(count: number, maxCount: number): number {
  if (maxCount <= 0) {
    return 0.35
  }

  return Math.max(0.22, Math.min(0.82, 0.22 + (count / maxCount) * 0.6))
}

function getAggregatedMarkerSize(count: number, maxCount: number): number {
  if (maxCount <= 0) {
    return 8
  }

  const ratio = Math.sqrt(count / maxCount)
  return 5 + ratio * 15
}

function getSelectedMetricSummary(feature: AggregatedCellFeature, metric: MapMetric) {
  return feature.metrics[metric] ?? {
    mean: null,
    min: null,
    max: null,
  }
}

function getSelectedMetricValue(feature: RawPointFeature, metric: MapMetric) {
  return feature.metrics[metric] ?? null
}

export function toMapFeatureCollections({
  response,
  metric,
}: {
  response: MapDataResponse | null
  metric: MapMetric
}): MapFeatureCollections {
  if (!response) {
    return {
      cells: createEmptyCellCollection(),
      points: createEmptyPointCollection(),
    }
  }

  const domainConfig = response.meta.metricDomains[metric]
  const domain: MetricDomain | undefined = domainConfig
    ? ([domainConfig.min, domainConfig.max] as MetricDomain)
    : undefined

  if (response.mode === 'aggregated') {
    const aggregatedFeatures = response.features as AggregatedCellFeature[]
    const maxCount = aggregatedFeatures.reduce((accumulator, feature) => Math.max(accumulator, feature.count), 0)
    const colorScale = createMetricColorScale([], domain)

    return {
      cells: {
        type: 'FeatureCollection',
        features: aggregatedFeatures.map((feature) => {
          const summary = getSelectedMetricSummary(feature, metric)
          const properties: MapCellProperties = {
            kind: 'cell',
            id: feature.id,
            metric,
            meanValue: summary.mean,
            minValue: summary.min,
            maxValue: summary.max,
            count: feature.count,
            size: getAggregatedMarkerSize(feature.count, maxCount),
            color: summary.mean === null ? getNoDataColor() : colorScale(summary.mean),
            opacity: getCountOpacity(feature.count, maxCount),
            bbox: feature.bbox,
          }

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: feature.center,
            },
            properties,
          }
        }),
      },
      points: createEmptyPointCollection(),
    }
  }

  const rawFeatures = response.features as RawPointFeature[]
  const colorScale = createMetricColorScale([], domain)

  return {
    cells: createEmptyCellCollection(),
    points: {
      type: 'FeatureCollection',
      features: rawFeatures.map((feature) => {
        const metricValue = getSelectedMetricValue(feature, metric)
        const properties: MapPointProperties = {
          kind: 'point',
          id: feature.id,
          iso3: feature.iso3,
          pgid: feature.pgid,
          year: feature.year,
          quarter: feature.quarter,
          metric,
          metricValue,
          color: metricValue === null ? getNoDataColor() : colorScale(metricValue),
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: feature.coordinates,
          },
          properties,
        }
      }),
    },
  }
}
