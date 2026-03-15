import type { MapMetric, MapMetricConfig } from '../types/metrics'

type SelectOption = {
  label: string
  value: string
}

export const mapMetricConfig: Record<MapMetric, MapMetricConfig> = {
  CCVI: {
    key: 'CCVI',
    label: 'CCVI Overall',
    category: 'overall',
    description: 'Composite climate-conflict vulnerability index score.',
  },
  CLI: {
    key: 'CLI',
    label: 'Climate',
    category: 'pillar',
    description: 'Climate hazard and stressor score.',
  },
  CON: {
    key: 'CON',
    label: 'Conflict',
    category: 'pillar',
    description: 'Conflict intensity and context score.',
  },
  VUL: {
    key: 'VUL',
    label: 'Vulnerability',
    category: 'pillar',
    description: 'Socioeconomic, political, demographic, and environmental vulnerability score.',
  },
  CLI_risk: {
    key: 'CLI_risk',
    label: 'Climate Risk',
    category: 'risk',
    description: 'Risk score from climate hazards and exposure.',
  },
  CON_risk: {
    key: 'CON_risk',
    label: 'Conflict Risk',
    category: 'risk',
    description: 'Risk score from conflict hazards and exposure.',
  },
}

export const mapMetricOptions: SelectOption[] = Object.values(mapMetricConfig).map((config) => ({
  label: config.label,
  value: config.key,
}))

export const isMapMetric = (value: string): value is MapMetric => value in mapMetricConfig
