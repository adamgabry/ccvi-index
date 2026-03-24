import { mapMetricOptions } from '../config/mapMetrics'
import type { FilterOption } from './FilterContext'

export const countryOptions: FilterOption[] = [
  { label: 'All countries', value: 'all' },
  { label: 'Afghanistan (AFG)', value: 'AFG' },
  { label: 'Chile (CHL)', value: 'CHL' },
  { label: 'India (IND)', value: 'IND' },
  { label: 'United States (USA)', value: 'USA' },
]

export const metricOptions: FilterOption[] = mapMetricOptions

export const riskComponentOptions: FilterOption[] = [
  { label: 'All components', value: 'all_components' },
  { label: 'Climate Hazards', value: 'climate_hazards' },
  { label: 'Conflict', value: 'conflict' },
  { label: 'Vulnerability', value: 'vulnerability' },
]
