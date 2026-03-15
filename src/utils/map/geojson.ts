import type { GeoJsonTransformInput, MapPointFeatureCollection } from '../../types/map'
import { createMetricColorScale } from './colorScale'
import { getMetricValue } from './metricValue'

export function toMapPointFeatureCollection({ rows, metric }: GeoJsonTransformInput): MapPointFeatureCollection {
  const metricValues = rows.map((row) => getMetricValue(row, metric))
  const colorScale = createMetricColorScale(metricValues)

  return {
    type: 'FeatureCollection',
    features: rows.map((row) => {
      const metricValue = getMetricValue(row, metric)

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lon, row.lat],
        },
        properties: {
          iso3: row.iso3,
          pgid: row.pgid,
          year: row.year,
          quarter: row.quarter,
          metric,
          metricValue,
          color: colorScale(metricValue),
        },
      }
    }),
  }
}
