import { mapMetricConfig } from '../../config/mapMetrics'
import type { MapPointProperties } from '../../types/map'
import { formatMetricValue } from '../../utils/map/metricValue'

export function getPopupHtml(properties: MapPointProperties): string {
  const metricLabel = mapMetricConfig[properties.metric].label

  return `
    <div class="map-popup">
      <div><strong>ISO3:</strong> ${properties.iso3}</div>
      <div><strong>PGID:</strong> ${properties.pgid}</div>
      <div><strong>Year/Quarter:</strong> ${properties.year} Q${properties.quarter}</div>
      <div><strong>Metric:</strong> ${metricLabel}</div>
      <div><strong>Value:</strong> ${formatMetricValue(properties.metricValue)}</div>
    </div>
  `
}
