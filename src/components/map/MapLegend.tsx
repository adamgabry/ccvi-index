import { mapMetricConfig } from '../../config/mapMetrics'
import type { MetricDomain } from '../../types/mapData'
import type { MapMetric } from '../../types/metrics'
import { createMetricColorScale, getNoDataColor } from '../../utils/map/colorScale'

type MapLegendProps = {
  metric: MapMetric
  domain?: MetricDomain
  mode?: 'aggregated' | 'raw'
}

const legendSteps = 5

export function MapLegend({ metric, domain, mode }: MapLegendProps) {
  if (!domain) {
    return (
      <aside className="map-legend">
        <h3>{mapMetricConfig[metric].label}</h3>
        <p>Loading metric domain…</p>
      </aside>
    )
  }

  const { min, max } = domain
  const colorScale = createMetricColorScale([], [min, max])
  const stepValues = Array.from({ length: legendSteps }, (_, i) => {
    const ratio = i / (legendSteps - 1)
    return min + (max - min) * ratio
  })

  return (
    <aside className="map-legend" aria-label="Map legend">
      <h3>{mapMetricConfig[metric].label}</h3>
      <p>{mode === 'aggregated' ? 'Color encodes mean aggregated value' : 'Color encodes raw point value'}</p>
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
