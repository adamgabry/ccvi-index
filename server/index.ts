import express, { type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import { type MapBounds, type MapDataRequest } from './types/mapApi'
import { assertMetrics } from './query/sql'
import { getBootstrapMapData, getMapData, getMapMetadata } from './query/mapQueryService'

const port = Number(process.env.PORT ?? 4000)
const app = express()

const numericParam = z.coerce.number().finite()

const requestSchema = z.object({
  minLon: numericParam,
  minLat: numericParam,
  maxLon: numericParam,
  maxLat: numericParam,
  zoom: numericParam.min(0).max(20),
  viewportWidth: numericParam.positive(),
  viewportHeight: numericParam.positive(),
  metrics: z.string().min(1),
  country: z.string().optional(),
  year: z.preprocess((value) => (value === undefined ? undefined : Number(value)), z.number().int().optional()),
  quarter: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z.number().int().min(1).max(4).optional(),
  ),
  riskComponent: z.string().optional(),
})

function parseBounds(query: z.infer<typeof requestSchema>): MapBounds {
  if (query.minLon >= query.maxLon || query.minLat >= query.maxLat) {
    throw new Error('Invalid bounds: minimums must be smaller than maximums.')
  }

  return {
    minLon: query.minLon,
    minLat: query.minLat,
    maxLon: query.maxLon,
    maxLat: query.maxLat,
  }
}

function parseRequest(query: z.infer<typeof requestSchema>): MapDataRequest {
  return {
    bounds: parseBounds(query),
    zoom: query.zoom,
    viewport: {
      width: query.viewportWidth,
      height: query.viewportHeight,
    },
    metrics: assertMetrics(
      query.metrics
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
    filters: {
      country: query.country,
      year: query.year,
      quarter: query.quarter,
      riskComponent: query.riskComponent,
    },
  }
}

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({ ok: true })
})

app.get('/api/map/metadata', async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const metadata = await getMapMetadata()
    response.json(metadata)
  } catch (error) {
    next(error)
  }
})

app.get('/api/map/bootstrap', async (request: Request, response: Response, next: NextFunction) => {
  try {
    const metricValue = z.string().min(1).parse(request.query.metric)
    const metrics = assertMetrics([metricValue])
    const country = typeof request.query.country === 'string' ? request.query.country : undefined
    const year = typeof request.query.year === 'string' ? Number(request.query.year) : undefined
    const quarter = typeof request.query.quarter === 'string' ? Number(request.query.quarter) : undefined
    const data = await getBootstrapMapData(metrics[0], { country, year, quarter })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.get('/api/map/data', async (request: Request, response: Response, next: NextFunction) => {
  try {
    const parsedQuery = requestSchema.parse(request.query)
    const mapRequest = parseRequest(parsedQuery)
    const mapData = await getMapData(mapRequest)
    response.json(mapData)
  } catch (error) {
    next(error)
  }
})

app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  void next
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  const statusCode = error instanceof z.ZodError ? 400 : 500

  response.status(statusCode).json({
    error: message,
  })
})

app.listen(port, () => {
  console.log(`Map API listening on http://127.0.0.1:${port}`)
})
