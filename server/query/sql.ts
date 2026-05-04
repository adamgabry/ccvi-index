import type { MapBounds, MapFilters, MapViewport } from '../types/mapApi'
import { phase1MapMetrics, type Phase1Metric } from '../../src/types/metrics'

export const MAX_RAW_POINTS = 1000
export const RAW_POINT_ZOOM_THRESHOLD = 11
export const MAX_AGGREGATED_FEATURES = 4000
export const BOOTSTRAP_POINT_COUNT = 1000000

const MAX_MERCATOR_LAT = 85.05112878

export function getBaseCellPixelSize(zoom: number): number {
  if (zoom <= 2) {
    return 96
  }

  if (zoom <= 4) {
    return 72
  }

  if (zoom <= 6) {
    return 56
  }

  if (zoom <= 8) {
    return 40
  }

  if (zoom <= 10) {
    return 28
  }

  return 20
}

export function getCellPixelSize(zoom: number, viewport?: MapViewport): number {
  const baseCellPixelSize = getBaseCellPixelSize(zoom)

  if (!viewport) {
    return baseCellPixelSize
  }

  const viewportArea = Math.max(1, viewport.width * viewport.height)
  const adaptiveCellSize = Math.ceil(Math.sqrt(viewportArea / MAX_AGGREGATED_FEATURES))

  return Math.max(baseCellPixelSize, adaptiveCellSize)
}

export function assertMetrics(metrics: string[]): Phase1Metric[] {
  if (metrics.length === 0) {
    throw new Error('At least one metric must be selected.')
  }

  return metrics.map((metric) => {
    if (!phase1MapMetrics.includes(metric as Phase1Metric)) {
      throw new Error(`Unsupported metric: ${metric}`)
    }

    return metric as Phase1Metric
  })
}

function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function quoteIdentifier(value: Phase1Metric): string {
  return `"${value}"`
}

function clampLatitudeSql(columnName: string): string {
  return `greatest(least(${columnName}, ${MAX_MERCATOR_LAT}), -${MAX_MERCATOR_LAT})`
}

function buildFilterClauses(bounds: MapBounds, filters?: MapFilters): string[] {
  const clauses = [
    `lon BETWEEN ${bounds.minLon} AND ${bounds.maxLon}`,
    `lat BETWEEN ${bounds.minLat} AND ${bounds.maxLat}`,
  ]

  if (filters?.country && filters.country !== 'all') {
    clauses.push(`iso3 = ${quoteSqlString(filters.country)}`)
  }

  if (filters?.continent && filters.continent !== 'all') {
    clauses.push(`continent = ${quoteSqlString(filters.continent)}`)
  }

  if (typeof filters?.year === 'number') {
    clauses.push(`year = ${filters.year}`)
  }

  if (typeof filters?.quarter === 'number') {
    clauses.push(`quarter = ${filters.quarter}`)
  }

  return clauses
}

function buildBaseFilteredCte(
  parquetPath: string,
  bounds: MapBounds,
  filters?: MapFilters,
  columns: string[] = ['*'],
): string {
  const whereClause = buildFilterClauses(bounds, filters).join(' AND ')

  return `
    filtered AS (
      SELECT ${columns.join(', ')}
      FROM read_parquet(${quoteSqlString(parquetPath)})
      WHERE ${whereClause}
    )
  `
}

export function buildMetricDomainsQuery(parquetPath: string): string {
  const metricSelect = phase1MapMetrics.flatMap((metric) => [
    `MIN(${quoteIdentifier(metric)}) AS min_${metric}`,
    `MAX(${quoteIdentifier(metric)}) AS max_${metric}`,
  ])

  return `
    SELECT
      ${metricSelect.join(',\n      ')}
    FROM read_parquet(${quoteSqlString(parquetPath)})
  `
}

export function buildCountryMetadataQuery(parquetPath: string): string {
  return `
    SELECT DISTINCT iso3
    FROM read_parquet(${quoteSqlString(parquetPath)})
    WHERE iso3 IS NOT NULL
    ORDER BY iso3
  `
}

export function buildPeriodsMetadataQuery(parquetPath: string): string {
  return `
    SELECT DISTINCT year, quarter
    FROM read_parquet(${quoteSqlString(parquetPath)})
    WHERE year IS NOT NULL AND quarter IS NOT NULL
    ORDER BY year DESC, quarter DESC
  `
}

export function buildCountQuery(parquetPath: string, bounds: MapBounds, filters?: MapFilters): string {
  return `
    WITH
    ${buildBaseFilteredCte(parquetPath, bounds, filters, ['1 AS one'])}
    SELECT COUNT(*) AS total_count
    FROM filtered
  `
}

export function buildRawPointsQuery(
  parquetPath: string,
  bounds: MapBounds,
  metrics: Phase1Metric[],
  filters?: MapFilters,
): string {
  const selectedColumns = ['pgid', 'year', 'quarter', 'lat', 'lon', 'iso3', ...metrics.map(quoteIdentifier)]
  const metricColumns = metrics.map((metric) => `${quoteIdentifier(metric)} AS "${metric}"`).join(',\n      ')

  return `
    WITH
    ${buildBaseFilteredCte(parquetPath, bounds, filters, selectedColumns)}
    SELECT
      pgid,
      year,
      quarter,
      lat,
      lon,
      iso3,
      ${metricColumns}
    FROM filtered
    ORDER BY lat, lon, pgid
    LIMIT ${MAX_RAW_POINTS}
  `
}

export function buildBootstrapPointsQuery(
  parquetPath: string,
  metric: Phase1Metric,
  filters?: MapFilters,
): string {
  const filterClauses = [`${quoteIdentifier(metric)} IS NOT NULL`]

  if (filters?.country && filters.country !== 'all') {
    filterClauses.push(`iso3 = ${quoteSqlString(filters.country)}`)
  }

  if (filters?.continent && filters.continent !== 'all') {
    filterClauses.push(`continent = ${quoteSqlString(filters.continent)}`)
  }

  if (typeof filters?.year === 'number') {
    filterClauses.push(`year = ${filters.year}`)
  }

  if (typeof filters?.quarter === 'number') {
    filterClauses.push(`quarter = ${filters.quarter}`)
  }

  const whereClause = `WHERE ${filterClauses.join(' AND ')}`

  return `
    SELECT
      pgid,
      year,
      quarter,
      lat,
      lon,
      iso3,
      ${quoteIdentifier(metric)} AS "${metric}"
    FROM read_parquet(${quoteSqlString(parquetPath)})
    ${whereClause}
    ORDER BY lat, lon, pgid
    LIMIT ${BOOTSTRAP_POINT_COUNT}
  `
}

export function buildAggregatedCellsQuery(
  parquetPath: string,
  bounds: MapBounds,
  zoom: number,
  viewport: MapViewport,
  metrics: Phase1Metric[],
  filters?: MapFilters,
): string {
  const cellPixelSize = getCellPixelSize(zoom, viewport)
  const worldSize = 256 * 2 ** zoom
  const selectedColumns = ['lat', 'lon', ...metrics.map(quoteIdentifier)]
  const metricAggregations = metrics.flatMap((metric) => [
    `AVG(${quoteIdentifier(metric)}) AS mean_${metric}`,
    `MIN(${quoteIdentifier(metric)}) AS min_${metric}`,
    `MAX(${quoteIdentifier(metric)}) AS max_${metric}`,
  ])

  return `
    WITH
    ${buildBaseFilteredCte(parquetPath, bounds, filters, selectedColumns)},
    projected AS (
      SELECT
        *,
        (lon + 180.0) / 360.0 AS mercator_x,
        (
          1.0 - LN(
            TAN(RADIANS(${clampLatitudeSql('lat')})) +
            1.0 / COS(RADIANS(${clampLatitudeSql('lat')}))
          ) / PI()
        ) / 2.0 AS mercator_y
      FROM filtered
    ),
    binned AS (
      SELECT
        *,
        FLOOR((mercator_x * ${worldSize}) / ${cellPixelSize})::BIGINT AS cell_x,
        FLOOR((mercator_y * ${worldSize}) / ${cellPixelSize})::BIGINT AS cell_y
      FROM projected
    )
    SELECT
      CONCAT(cell_x, ':', cell_y) AS id,
      cell_x,
      cell_y,
      COUNT(*) AS count,
      ((cell_x * ${cellPixelSize}) / ${worldSize}) * 360.0 - 180.0 AS min_lon,
      (((cell_x + 1) * ${cellPixelSize}) / ${worldSize}) * 360.0 - 180.0 AS max_lon,
      DEGREES(ATAN(SINH(PI() * (1.0 - 2.0 * (((cell_y + 1) * ${cellPixelSize}) / ${worldSize}))))) AS min_lat,
      DEGREES(ATAN(SINH(PI() * (1.0 - 2.0 * ((cell_y * ${cellPixelSize}) / ${worldSize}))))) AS max_lat,
      ${metricAggregations.join(',\n      ')}
    FROM binned
    GROUP BY cell_x, cell_y
    ORDER BY cell_y, cell_x
  `
}

export function buildContinentsMetadataQuery(parquetPath: string): string {
  return `
    SELECT DISTINCT continent
    FROM read_parquet('${parquetPath.replaceAll("'", "''")}')
    WHERE continent IS NOT NULL
    ORDER BY continent
  `
}
