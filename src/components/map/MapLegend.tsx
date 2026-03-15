import { mapMetricConfig } from '../../config/mapMetrics'
import type { CCVIMapRow } from '../../types/ccvi'
import type { MapMetric } from '../../types/metrics'
import { createMetricColorScale, getNoDataColor } from '../../utils/map/colorScale'
import { getMetricValue } from '../../utils/map/metricValue'

type MapLegendProps = {
  metric: MapMetric
  rows: CCVIMapRow[]
}

const legendSteps = 5

export function MapLegend({ metric, rows }: MapLegendProps) {
  const metricValues = rows.map((row) => getMetricValue(row, metric))
  const validValues = metricValues.filter((value): value is number => value !== null)

  if (validValues.length === 0) {
    return (
      <aside className="map-legend">
        <h3>{mapMetricConfig[metric].label}</h3>
        <p>No data for current filters.</p>
      </aside>
    )
  }

  const min = Math.min(...validValues)
  const max = Math.max(...validValues)
  const colorScale = createMetricColorScale(metricValues)
  const stepValues = Array.from({ length: legendSteps }, (_, index) => {
    const ratio = index / (legendSteps - 1)
    return min + (max - min) * ratio
  })

  return (
    <aside className="map-legend" aria-label="Map legend">
      <h3>{mapMetricConfig[metric].label}</h3>
      <ul>
        {stepValues.map((value) => (
          <li key={value}>
            <span style={{ backgroundColor: colorScale(value) }} aria-hidden="true" />
            <span>{value.toFixed(3)}</span>
          </li>
        ))}
        <li>
          <span style={{ backgroundColor: getNoDataColor() }} aria-hidden="true" />
          <span>No data</span>
        </li>
      </ul>
    </aside>
  )
}
