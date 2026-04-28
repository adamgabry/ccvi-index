export const mapMetrics = ['CCVI', 'Climate', 'Conflict', 'Vulnerability'] as const
export type MapMetric = (typeof mapMetrics)[number]

export const phase1MapMetrics = ['CCVI', 'CLI_risk', 'CON_risk', 'VUL'] as const
export type Phase1Metric = (typeof phase1MapMetrics)[number]

export const metricToColumn: Record<MapMetric, Phase1Metric> = {
  CCVI:          'CCVI',
  Climate:       'CLI_risk',
  Conflict:      'CON_risk',
  Vulnerability: 'VUL',
}

export type MetricCategory = 'overall' | 'pillar' | 'risk'

export type MapMetricConfig = {
  key: MapMetric
  label: string
  category: MetricCategory
  description: string
}

export const allMetrics = [
  'CCVI', 'CLI_risk', 'CON_risk', 'VUL',
  'CLI_current_floods', 'CLI_current_cyclones', 'CLI_current_heavy-precipitation',
  'CLI_current_heatwave', 'CLI_current_wildfires', 'CLI_current_drought',
  'CLI_accumulated_floods', 'CLI_accumulated_cyclones', 'CLI_accumulated_heavy-precipitation',
  'CLI_accumulated_heatwave', 'CLI_accumulated_wildfires', 'CLI_accumulated_drought',
  'CLI_longterm_relative-sea-level', 'CLI_longterm_temperature-anomaly',
  'CLI_longterm_precipitation-anomaly',
  'CON_level_intensity', 'CON_level_surrounding', 'CON_level_persistence',
  'CON_soctens_intensity', 'CON_soctens_persistence', 'CON_soctens_surrounding',
  'CON_context_actors', 'CON_context_country',
  'VUL_socioeconomic_agriculture', 'VUL_socioeconomic_deprivation',
  'VUL_socioeconomic_education', 'VUL_socioeconomic_health',
  'VUL_socioeconomic_inequality', 'VUL_socioeconomic_hunger',
  'VUL_political_ethnic', 'VUL_political_gender',
  'VUL_political_institutions', 'VUL_political_system',
  'VUL_demographic_dependent', 'VUL_demographic_popgrowth', 'VUL_demographic_uprooted',
  'VUL_environmental_irrigation', 'VUL_environmental_biodiversity',
  'VUL_environmental_deforestation', 'VUL_environmental_soil', 'VUL_environmental_water',
] as const

export type AnyMetric = typeof allMetrics[number]

export const metricLabels: Record<string, string> = {
  CCVI:                               'CCVI',
  CLI_risk:                           'Climate Risk',
  CON_risk:                           'Conflict Risk',
  VUL:                                'Vulnerability',
  CLI_current_drought:                'Droughts',
  CLI_current_heatwave:               'Heatwaves',
  'CLI_current_heavy-precipitation':  'Heavy precipitation',
  CLI_current_wildfires:              'Wildfires',
  CLI_current_floods:                 'Floods',
  CLI_current_cyclones:               'Tropical cyclones',
  CLI_accumulated_drought:            'Droughts (accumulated)',
  CLI_accumulated_heatwave:           'Heatwaves (accumulated)',
  'CLI_accumulated_heavy-precipitation': 'Heavy precipitation (accumulated)',
  CLI_accumulated_wildfires:          'Wildfires (accumulated)',
  CLI_accumulated_floods:             'Floods (accumulated)',
  CLI_accumulated_cyclones:           'Tropical cyclones (accumulated)',
  'CLI_longterm_temperature-anomaly': 'Mean temperature change',
  'CLI_longterm_relative-sea-level':  'Relative sea level rise',
  'CLI_longterm_precipitation-anomaly': 'Mean precipitation anomaly',
  CON_level_intensity:                'Intensity of violence',
  CON_level_surrounding:              'Surrounding violence',
  CON_level_persistence:              'Persistence of violence',
  CON_soctens_intensity:              'Intensity of popular unrest',
  CON_soctens_surrounding:            'Surrounding popular unrest',
  CON_soctens_persistence:            'Persistence of popular unrest',
  CON_context_actors:                 'Conflict actors',
  CON_context_country:                'Country affectedness',
  VUL_socioeconomic_agriculture:      'Economic dependence on agriculture',
  VUL_socioeconomic_deprivation:      'Economic deprivation',
  VUL_socioeconomic_education:        'Educational vulnerability',
  VUL_socioeconomic_health:           'Health vulnerability',
  VUL_socioeconomic_inequality:       'Economic inequality',
  VUL_socioeconomic_hunger:           'Hunger',
  VUL_political_gender:               'Gender inequality',
  VUL_political_institutions:         'Institutional vulnerability',
  VUL_political_system:               'Political system vulnerability',
  VUL_political_ethnic:               'Ethnic marginalization',
  VUL_demographic_uprooted:           'Uprooted people',
  VUL_demographic_popgrowth:          'Population growth',
  VUL_demographic_dependent:          'Dependent population',
  VUL_environmental_soil:             'Soil degradation',
  VUL_environmental_deforestation:    'Deforestation',
  VUL_environmental_biodiversity:     'Biodiversity loss',
  VUL_environmental_water:            'Water stress',
  VUL_environmental_irrigation:       'Agricultural dependence on rainfall',
}

export type RadarSubIndex = {
  label: string
  columns: string[]
}

export type RadarIndexDef = {
  subIndices: Record<string, RadarSubIndex>
} | {
  
  columns: string[]
}

export const radarConfig: Record<MapMetric, RadarIndexDef> = {
  CCVI: {
    columns: ['CLI_risk', 'CON_risk', 'VUL'],
  },
  Climate: {
    subIndices: {
      current: {
        label: 'Current extreme events',
        columns: [
          'CLI_current_floods', 'CLI_current_cyclones', 'CLI_current_heavy-precipitation',
          'CLI_current_heatwave', 'CLI_current_wildfires', 'CLI_current_drought',
        ],
      },
      accumulated: {
        label: 'Accumulated extreme events',
        columns: [
          'CLI_accumulated_floods', 'CLI_accumulated_cyclones', 'CLI_accumulated_heavy-precipitation',
          'CLI_accumulated_heatwave', 'CLI_accumulated_wildfires', 'CLI_accumulated_drought',
        ],
      },
      longterm: {
        label: 'Shifts in long-term conditions',
        columns: [
          'CLI_longterm_relative-sea-level', 'CLI_longterm_temperature-anomaly',
          'CLI_longterm_precipitation-anomaly',
        ],
      },
    },
  },
  Conflict: {
    subIndices: {
      armed: {
        label: 'Armed violence',
        columns: ['CON_level_intensity', 'CON_level_surrounding', 'CON_level_persistence'],
      },
      societal: {
        label: 'Societal tensions',
        columns: ['CON_soctens_intensity', 'CON_soctens_persistence', 'CON_soctens_surrounding'],
      },
      context: {
        label: 'Conflict context',
        columns: ['CON_context_actors', 'CON_context_country'],
      },
    },
  },
  Vulnerability: {
    subIndices: {
      socioeconomic: {
        label: 'Socio-economic vulnerability',
        columns: [
          'VUL_socioeconomic_agriculture', 'VUL_socioeconomic_deprivation',
          'VUL_socioeconomic_education', 'VUL_socioeconomic_health',
          'VUL_socioeconomic_inequality', 'VUL_socioeconomic_hunger',
        ],
      },
      political: {
        label: 'Political vulnerability',
        columns: [
          'VUL_political_ethnic', 'VUL_political_gender',
          'VUL_political_institutions', 'VUL_political_system',
        ],
      },
      demographic: {
        label: 'Demographic vulnerability',
        columns: [
          'VUL_demographic_dependent', 'VUL_demographic_popgrowth', 'VUL_demographic_uprooted',
        ],
      },
      environmental: {
        label: 'Environmental vulnerability',
        columns: [
          'VUL_environmental_irrigation', 'VUL_environmental_biodiversity',
          'VUL_environmental_deforestation', 'VUL_environmental_soil', 'VUL_environmental_water',
        ],
      },
    },
  },
}
