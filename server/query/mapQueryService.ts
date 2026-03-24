import type {
  AggregatedCellFeature,
  MapDataRequest,
  MapDataResponse,
  MapMetadataResponse,
  MetricDomainMap,
  MetricSummary,
  RawPointFeature,
} from '../types/mapApi'
import { phase1MapMetrics, type MapMetric } from '../../src/types/metrics'
import { parquetPath, runQuery } from './duckdbClient'
import {
  buildBootstrapPointsQuery,
  buildAggregatedCellsQuery,
  buildCountQuery,
  buildCountryMetadataQuery,
  buildMetricDomainsQuery,
  buildPeriodsMetadataQuery,
  buildRawPointsQuery,
  MAX_AGGREGATED_FEATURES,
  MAX_RAW_POINTS,
  RAW_POINT_ZOOM_THRESHOLD,
  getCellPixelSize,
} from './sql'

type CountRow = {
  total_count: number
}

type MetricDomainRow = Partial<Record<`min_${MapMetric}` | `max_${MapMetric}`, number | null>>

type CountryRow = {
  iso3: string | null
}

type PeriodRow = {
  year: number
  quarter: number
}

type AggregatedCellRow = {
  id: string
  count: number
  min_lon: number
  max_lon: number
  min_lat: number
  max_lat: number
} & Partial<Record<`mean_${MapMetric}` | `min_${MapMetric}` | `max_${MapMetric}`, number | null>>

type RawPointRow = {
  pgid: number
  year: number
  quarter: number
  lat: number
  lon: number
  iso3: string
} & Partial<Record<MapMetric, number | null>>

let metricDomainsPromise: Promise<MetricDomainMap> | null = null
let countriesPromise: Promise<string[]> | null = null
let periodsPromise: Promise<MapMetadataResponse['periods']> | null = null
const bootstrapCache = new Map<string, Promise<MapDataResponse>>()

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value)
}

function toMetricDomains(row: MetricDomainRow): MetricDomainMap {
  return phase1MapMetrics.reduce<MetricDomainMap>((accumulator, metric) => {
    const minValue = row[`min_${metric}`] ?? 0
    const maxValue = row[`max_${metric}`] ?? minValue

    accumulator[metric] = {
      min: minValue,
      max: maxValue === minValue ? minValue + 1 : maxValue,
    }

    return accumulator
  }, {} as MetricDomainMap)
}

function getMetricSummary(row: AggregatedCellRow, metric: MapMetric): MetricSummary {
  return {
    mean: row[`mean_${metric}`] ?? null,
    min: row[`min_${metric}`] ?? null,
    max: row[`max_${metric}`] ?? null,
  }
}

export async function getMetricDomains(): Promise<MetricDomainMap> {
  metricDomainsPromise ??= runQuery<MetricDomainRow>(buildMetricDomainsQuery(parquetPath)).then((rows) =>
    toMetricDomains(rows[0] ?? {}),
  )

  return metricDomainsPromise
}

async function getCountries(): Promise<string[]> {
  countriesPromise ??= runQuery<CountryRow>(buildCountryMetadataQuery(parquetPath)).then((rows) =>
    rows.map((row) => row.iso3).filter((value): value is string => Boolean(value)),
  )

  return countriesPromise
}

async function getPeriods(): Promise<MapMetadataResponse['periods']> {
  periodsPromise ??= runQuery<PeriodRow>(buildPeriodsMetadataQuery(parquetPath)).then((rows) =>
    rows.map((row) => ({
      year: normalizeNumber(row.year),
      quarter: normalizeNumber(row.quarter),
      value: `${normalizeNumber(row.year)}-Q${normalizeNumber(row.quarter)}`,
      label: `${normalizeNumber(row.year)} Q${normalizeNumber(row.quarter)}`,
    })),
  )

  return periodsPromise
}

function toAggregatedFeatures(rows: AggregatedCellRow[], metrics: MapMetric[]): AggregatedCellFeature[] {
  return rows.map((row) => ({
    id: row.id,
    kind: 'cell',
    bbox: [row.min_lon, row.min_lat, row.max_lon, row.max_lat],
    center: [(row.min_lon + row.max_lon) / 2, (row.min_lat + row.max_lat) / 2],
    count: normalizeNumber(row.count),
    metrics: metrics.reduce<AggregatedCellFeature['metrics']>((accumulator, metric) => {
      accumulator[metric] = getMetricSummary(row, metric)
      return accumulator
    }, {}),
  }))
}

function toRawPointFeatures(rows: RawPointRow[], metrics: MapMetric[]): RawPointFeature[] {
  return rows.map((row) => ({
    id: `${row.pgid}-${row.year}-${row.quarter}`,
    kind: 'point',
    coordinates: [row.lon, row.lat],
    iso3: row.iso3,
    pgid: normalizeNumber(row.pgid),
    year: normalizeNumber(row.year),
    quarter: normalizeNumber(row.quarter),
    metrics: metrics.reduce<RawPointFeature['metrics']>((accumulator, metric) => {
      accumulator[metric] = row[metric] ?? null
      return accumulator
    }, {}),
  }))
}

export async function getMapMetadata(): Promise<MapMetadataResponse> {
  const [metricDomains, countries, periods] = await Promise.all([
    getMetricDomains(),
    getCountries(),
    getPeriods(),
  ])

  return {
    metrics: [...phase1MapMetrics],
    metricDomains,
    countries,
    periods,
  }
}

export async function getBootstrapMapData(
  metric: MapMetric,
  filters?: { country?: string; year?: number; quarter?: number },
): Promise<MapDataResponse> {
  const cacheKey = `${metric}:${filters?.country ?? 'all'}:${filters?.year ?? 'na'}:${filters?.quarter ?? 'na'}`
  const cachedResponse = bootstrapCache.get(cacheKey)

  if (cachedResponse) {
    return cachedResponse
  }

  const responsePromise = (async () => {
    const metricDomains = await getMetricDomains()
    const rows = await runQuery<RawPointRow>(buildBootstrapPointsQuery(parquetPath, metric, filters))
    const features = toRawPointFeatures(rows, [metric])

    return {
      mode: 'raw',
      features,
      meta: {
        totalRowsInExtent: features.length,
        returnedRows: features.length,
        aggregation: {
          cellPixelSize: null,
          rawThreshold: features.length,
          maxFeatures: features.length,
          count: features.length,
        },
        metricDomains,
      },
    } satisfies MapDataResponse
  })()

  bootstrapCache.set(cacheKey, responsePromise)
  return responsePromise
}

export async function getMapData(request: MapDataRequest): Promise<MapDataResponse> {
  const metricDomains = await getMetricDomains()
  const countRows = await runQuery<CountRow>(
    buildCountQuery(parquetPath, request.bounds, request.filters),
  )
  const totalRowsInExtent = normalizeNumber(countRows[0]?.total_count ?? 0)
  const useRawMode =
    request.zoom >= RAW_POINT_ZOOM_THRESHOLD && totalRowsInExtent > 0 && totalRowsInExtent <= MAX_RAW_POINTS

  if (totalRowsInExtent === 0) {
    return {
      mode: useRawMode ? 'raw' : 'aggregated',
      features: [],
      meta: {
        totalRowsInExtent,
        returnedRows: 0,
        aggregation: {
          cellPixelSize: useRawMode ? null : getCellPixelSize(request.zoom, request.viewport),
          rawThreshold: MAX_RAW_POINTS,
          maxFeatures: MAX_AGGREGATED_FEATURES,
          count: totalRowsInExtent,
        },
        metricDomains,
      },
    }
  }

  if (useRawMode) {
    const rows = await runQuery<RawPointRow>(
      buildRawPointsQuery(parquetPath, request.bounds, request.metrics, request.filters),
    )
    const features = toRawPointFeatures(rows, request.metrics)

    return {
      mode: 'raw',
      features,
      meta: {
        totalRowsInExtent,
        returnedRows: features.length,
        aggregation: {
          cellPixelSize: null,
          rawThreshold: MAX_RAW_POINTS,
          maxFeatures: MAX_AGGREGATED_FEATURES,
          count: totalRowsInExtent,
        },
        metricDomains,
      },
    }
  }

  const rows = await runQuery<AggregatedCellRow>(
    buildAggregatedCellsQuery(
      parquetPath,
      request.bounds,
      request.zoom,
      request.viewport,
      request.metrics,
      request.filters,
    ),
  )
  const features = toAggregatedFeatures(rows, request.metrics)

  return {
    mode: 'aggregated',
    features,
    meta: {
      totalRowsInExtent,
      returnedRows: features.length,
        aggregation: {
        cellPixelSize: getCellPixelSize(request.zoom, request.viewport),
          rawThreshold: MAX_RAW_POINTS,
          maxFeatures: MAX_AGGREGATED_FEATURES,
          count: totalRowsInExtent,
        },
        metricDomains,
    },
  }
}
