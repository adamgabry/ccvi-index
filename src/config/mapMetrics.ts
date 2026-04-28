import type { MapMetric, MapMetricConfig } from '../types/metrics'

export const mapMetricConfig: Record<MapMetric, MapMetricConfig> = {
  CCVI: {
    key: 'CCVI',
    label: 'CCVI',
    category: 'overall',
    description: 'Climate—Conflict—Vulnerability Index composite score.',
  },
  Climate: {
    key: 'Climate',
    label: 'Climate hazard exposure',
    category: 'pillar',
    description: 'Climate risk score from hazard exposure.',
  },
  Conflict: {
    key: 'Conflict',
    label: 'Conflict hazard exposure',
    category: 'pillar',
    description: 'Conflict risk score from hazard exposure.',
  },
  Vulnerability: {
    key: 'Vulnerability',
    label: 'Vulnerability',
    category: 'pillar',
    description: 'Socioeconomic, political, demographic, and environmental vulnerability score.',
  },
}

export const mapMetricOptions = Object.values(mapMetricConfig).map((c) => ({
  label: c.label,
  value: c.key,
}))

export const isMapMetric = (value: string): value is MapMetric =>
  value in mapMetricConfig
