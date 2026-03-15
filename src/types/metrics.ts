export const phase1MapMetrics = ['CCVI', 'CLI', 'CON', 'VUL', 'CLI_risk', 'CON_risk'] as const

export type MapMetric = (typeof phase1MapMetrics)[number]

export type MetricCategory = 'overall' | 'pillar' | 'risk'

export type MapMetricConfig = {
  key: MapMetric
  label: string
  category: MetricCategory
  description: string
}
