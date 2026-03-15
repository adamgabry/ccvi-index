import { sampleMapData } from '../data/sampleMapData'
import type { CCVIMapRow } from '../types/ccvi'

export type MapDataQuery = {
  country?: string
}

export function getPhase1MapRows(query?: MapDataQuery): CCVIMapRow[] {
  if (!query?.country || query.country === 'all') {
    return sampleMapData
  }

  return sampleMapData.filter((row) => row.iso3 === query.country)
}
