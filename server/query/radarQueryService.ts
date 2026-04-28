import { parquetPath, runQuery } from './duckdbClient'

export type RadarCountryRow = {
  iso3: string
  continent: string
  [col: string]: number | string | null
}

type Filters = {
  country?: string
  continent?: string
  year?: number
  quarter?: number
}

function quoteSql(s: string) {
  return `'${s.replaceAll("'", "''")}'`
}

function quoteIdent(s: string) {
  return `"${s.replaceAll('"', '""')}"`
}

export async function getRadarData(
  columns: string[],
  filters?: Filters,
): Promise<RadarCountryRow[]> {
  if (columns.length === 0) throw new Error('At least one column required')

  // Validate column names: allow word chars plus hyphens
  for (const col of columns) {
    if (!/^[\w-]+$/.test(col)) throw new Error(`Invalid column: ${col}`)
  }

  const whereClauses: string[] = ['iso3 IS NOT NULL']

  if (filters?.country && filters.country !== 'all') {
    whereClauses.push(`iso3 = ${quoteSql(filters.country)}`)
  }
  if (filters?.continent && filters.continent !== 'all') {
    whereClauses.push(`continent = ${quoteSql(filters.continent)}`)
  }

  // Time filtering: year-only = average all 4 quarters; quarter = specific quarter
  if (typeof filters?.year === 'number' && typeof filters?.quarter === 'number') {
    whereClauses.push(`year = ${filters.year}`)
    whereClauses.push(`quarter = ${filters.quarter}`)
  } else if (typeof filters?.year === 'number') {
    whereClauses.push(`year = ${filters.year}`)
  }

  const colSelects = columns.map((col) => `AVG(${quoteIdent(col)}) AS ${quoteIdent(col)}`).join(',\n      ')
  const where = `WHERE ${whereClauses.join(' AND ')}`

  type Row = { iso3: string; continent: string } & Record<string, number | null>

  const rows = await runQuery<Row>(`
    SELECT
      iso3,
      continent,
      ${colSelects}
    FROM read_parquet(${quoteSql(parquetPath)})
    ${where}
    GROUP BY iso3, continent
    ORDER BY iso3
  `)

  return rows.map((row) => {
    const out: RadarCountryRow = { iso3: row.iso3, continent: row.continent }
    for (const col of columns) {
      out[col] = row[col] !== undefined ? Number(row[col]) : null
    }
    return out
  })
}
