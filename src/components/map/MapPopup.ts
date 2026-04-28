import type { MapCellProperties, MapPointProperties } from '../../types/map'
import { formatMetricValue } from '../../utils/map/metricValue'

const PHASE1_LABELS: Record<string, string> = {
  CCVI: 'CCVI', CLI_risk: 'Climate Risk', CON_risk: 'Conflict Risk', VUL: 'Vulnerability',
}

function formatCellExtent(bounds: [number, number, number, number]): string {
  const [minLon, minLat, maxLon, maxLat] = bounds
  return `${minLat.toFixed(2)}, ${minLon.toFixed(2)} to ${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}`
}

export function getPopupHtml(properties: MapPointProperties | MapCellProperties): string {
  const metricLabel = PHASE1_LABELS[properties.metric] ?? properties.metric

  if (properties.kind === 'cell') {
    return `
      <div class="map-popup">
        <div><strong>Metric:</strong> ${metricLabel}</div>
        <div><strong>Mean:</strong> ${formatMetricValue(properties.meanValue)}</div>
        <div><strong>Min / Max:</strong> ${formatMetricValue(properties.minValue)} / ${formatMetricValue(properties.maxValue)}</div>
        <div><strong>Count:</strong> ${properties.count.toLocaleString()}</div>
        <div><strong>Cell extent:</strong> ${formatCellExtent(properties.bbox)}</div>
      </div>
    `
  }

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
