import { phase1MapMetrics, allMetrics, type Phase1Metric } from '../../src/types/metrics'
import { parquetPath, runQuery } from './duckdbClient'

export type MetricStats = {
  metric: Phase1Metric
  n: number
  min: number
  p25: number
  median: number
  mean: number
  p75: number
  max: number
  std: number
}

export type ContinentDistribution = {
  continent: string
  metric: Phase1Metric
  mean: number
  p25: number
  median: number
  p75: number
  min: number
  max: number
  n: number
}

export type CorrelationEntry = {
  metric_a: Phase1Metric
  metric_b: Phase1Metric
  r: number
}


export type CountryScore = {
  iso3: string
  continent: string
  metric: Phase1Metric
  mean: number
  n: number
}

export type StatsSummaryResponse = {
  metricStats: MetricStats[]
  continentDistributions: ContinentDistribution[]
  countryScores: CountryScore[]
  correlations: CorrelationEntry[]
}

type StatsFilters = {
  country?: string
  continent?: string
  year?: number
  quarter?: number
}

function buildWhereClause(filters?: StatsFilters): string {
  const clauses: string[] = []
  if (filters?.country && filters.country !== 'all') {
    clauses.push(`iso3 = '${filters.country.replaceAll("'", "''")}'`)
  }
  if (filters?.continent && filters.continent !== 'all') {
    clauses.push(`continent = '${filters.continent.replaceAll("'", "''")}'`)
  }
  if (typeof filters?.year === 'number') clauses.push(`year = ${filters.year}`)
  if (typeof filters?.quarter === 'number') clauses.push(`quarter = ${filters.quarter}`)
  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
}

export async function getStatsSummary(filters?: StatsFilters): Promise<StatsSummaryResponse> {
  const where = buildWhereClause(filters)

  // 1. Per-metric stats (all 6 metrics, aggregated across all cells)
  // Compute stats for ALL metrics (phase1 + all sub-indicators)
  const allMetricsList = [...allMetrics] as string[]
  const safeCol = (m: string) => m.replace(/-/g, '_')
  const metricSelect = allMetricsList.map((m) => `
    COUNT("${m}") AS n_${safeCol(m)},
    MIN("${m}") AS min_${safeCol(m)},
    APPROX_QUANTILE("${m}", 0.25) AS p25_${safeCol(m)},
    MEDIAN("${m}") AS median_${safeCol(m)},
    AVG("${m}") AS mean_${safeCol(m)},
    APPROX_QUANTILE("${m}", 0.75) AS p75_${safeCol(m)},
    MAX("${m}") AS max_${safeCol(m)},
    STDDEV("${m}") AS std_${safeCol(m)}
  `).join(',')

  type StatsRow = Record<string, number>
  const [statsRow] = await runQuery<StatsRow>(`
    SELECT ${metricSelect}
    FROM read_parquet('${parquetPath}')
    ${where}
  `)

  const metricStats: MetricStats[] = allMetricsList.map((m) => {
    const k = m.replace(/-/g, '_')
    return {
      metric: m as Phase1Metric,
      n: Number(statsRow[`n_${k}`] ?? 0),
      min: Number(statsRow[`min_${k}`] ?? 0),
      p25: Number(statsRow[`p25_${k}`] ?? 0),
      median: Number(statsRow[`median_${k}`] ?? 0),
      mean: Number(statsRow[`mean_${k}`] ?? 0),
      p75: Number(statsRow[`p75_${k}`] ?? 0),
      max: Number(statsRow[`max_${k}`] ?? 0),
      std: Number(statsRow[`std_${k}`] ?? 0),
    }
  })

  const contSelect = phase1MapMetrics.map((m) => `
    COUNT("${m}") AS n_${m},
    MIN("${m}") AS min_${m},
    APPROX_QUANTILE("${m}", 0.25) AS p25_${m},
    MEDIAN("${m}") AS median_${m},
    AVG("${m}") AS mean_${m},
    APPROX_QUANTILE("${m}", 0.75) AS p75_${m},
    MAX("${m}") AS max_${m}
  `).join(',')

  type ContRow = { continent: string } & Record<string, number>
  const contRows = await runQuery<ContRow>(`
    SELECT continent, ${contSelect}
    FROM read_parquet('${parquetPath}')
    ${where}
    GROUP BY continent
    ORDER BY continent
  `)

  const continentDistributions: ContinentDistribution[] = contRows.flatMap((row) =>
    phase1MapMetrics.map((m) => ({
      continent: row.continent,
      metric: m,
      n: Number(row[`n_${m}`] ?? 0),
      min: Number(row[`min_${m}`] ?? 0),
      p25: Number(row[`p25_${m}`] ?? 0),
      median: Number(row[`median_${m}`] ?? 0),
      mean: Number(row[`mean_${m}`] ?? 0),
      p75: Number(row[`p75_${m}`] ?? 0),
      max: Number(row[`max_${m}`] ?? 0),
    }))
  )

  const corrPairs: CorrelationEntry[] = []
  for (let i = 0; i < phase1MapMetrics.length; i++) {
    for (let j = i; j < phase1MapMetrics.length; j++) {
      const a = phase1MapMetrics[i]
      const b = phase1MapMetrics[j]
      type CorrRow = { r: number }
      const [row] = await runQuery<CorrRow>(`
        SELECT CORR("${a}", "${b}") AS r
        FROM read_parquet('${parquetPath}')
        ${where}
      `)
      const r = Number(row?.r ?? 0)
      corrPairs.push({ metric_a: a, metric_b: b, r })
      if (i !== j) corrPairs.push({ metric_a: b, metric_b: a, r })
    }
  }


  const countrySelect = phase1MapMetrics.map((m) => `
    AVG("${m}") AS mean_${m},
    COUNT("${m}") AS n_${m}
  `).join(',')

  type CountryRow = { iso3: string; continent: string } & Record<string, number>
  const countryRows = await runQuery<CountryRow>(`
    SELECT iso3, continent, ${countrySelect}
    FROM read_parquet('${parquetPath}')
    ${where}
    GROUP BY iso3, continent
    ORDER BY continent, iso3
  `)

  const countryScores: CountryScore[] = countryRows.flatMap((row) =>
    phase1MapMetrics.map((m) => ({
      iso3: row.iso3,
      continent: row.continent,
      metric: m,
      mean: Number(row[`mean_${m}`] ?? 0),
      n: Number(row[`n_${m}`] ?? 0),
    }))
  )

  return { metricStats, continentDistributions, countryScores, correlations: corrPairs }
}
