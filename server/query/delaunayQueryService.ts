/**
 * Returns country-level mean scores for two chosen metrics across all quarters,
 * filtered optionally by continent and country. Used by the Delaunay tab.
 */
import { parquetPath, runQuery } from './duckdbClient'

export type CountryPoint = {
  iso3: string
  continent: string
  year: number
  quarter: number
  period: string
  x: number
  y: number
  ccvi: number
}

type Filters = {
  continent?: string
  country?: string
}

function quoteSql(s: string) {
  return `'${s.replaceAll("'", "''")}'`
}

export async function getDelaunayPoints(
  metricX: string,
  metricY: string,
  filters?: Filters,
): Promise<CountryPoint[]> {
  // Validate metric names to prevent SQL injection (only word chars and hyphens)
  if (!/^[\w-]+$/.test(metricX) || !/^[\w-]+$/.test(metricY)) {
    throw new Error('Invalid metric name')
  }

  const whereClauses: string[] = [
    `"${metricX}" IS NOT NULL`,
    `"${metricY}" IS NOT NULL`,
    `iso3 IS NOT NULL`,
  ]
  if (filters?.continent && filters.continent !== 'all') {
    whereClauses.push(`continent = ${quoteSql(filters.continent)}`)
  }
  if (filters?.country && filters.country !== 'all') {
    whereClauses.push(`iso3 = ${quoteSql(filters.country)}`)
  }

  const where = `WHERE ${whereClauses.join(' AND ')}`

  type Row = {
    iso3: string
    continent: string
    year: number
    quarter: number
    x: number
    y: number
    ccvi: number
  }

  const rows = await runQuery<Row>(`
    SELECT
      iso3,
      continent,
      year,
      quarter,
      AVG("${metricX}") AS x,
      AVG("${metricY}") AS y,
      AVG("CCVI")       AS ccvi
    FROM read_parquet(${quoteSql(parquetPath)})
    ${where}
    GROUP BY iso3, continent, year, quarter
    ORDER BY year, quarter, iso3
  `)

  return rows.map((r) => ({
    iso3: r.iso3,
    continent: r.continent,
    year: Number(r.year),
    quarter: Number(r.quarter),
    period: `${r.year}-Q${r.quarter}`,
    x: Number(r.x),
    y: Number(r.y),
    ccvi: Number(r.ccvi),
  }))
}
