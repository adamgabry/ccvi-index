import { extent } from 'd3-array'
import { scaleSequential } from 'd3-scale'
import { interpolateYlOrRd } from 'd3-scale-chromatic'

const noDataColor = '#cbd5e1'

export type MetricDomain = [number, number]

export function getMetricDomain(values: Array<number | null>): MetricDomain {
  const validValues = values.filter((value): value is number => value !== null)
  const [min = 0, max = 1] = extent(validValues)

  if (min === max) {
    return [min, min + 1]
  }

  return [min, max]
}

export function createMetricColorScale(values: Array<number | null>, domain?: MetricDomain) {
  const [min, max] = domain ?? getMetricDomain(values)
  const scale = scaleSequential(interpolateYlOrRd).domain([min, max])

  return (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return noDataColor
    }

    return scale(value)
  }
}

export function getNoDataColor() {
  return noDataColor
}
